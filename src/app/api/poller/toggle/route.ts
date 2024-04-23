export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptFromString } from "@/lib/crypto";

const DAY_MS = 24 * 60 * 60 * 1000;
const now = () => new Date();

function basicAuthHeader(togglApiKey: string) {
  const b64 = Buffer.from(`${togglApiKey}:api_token`).toString("base64");
  return `Basic ${b64}`;
}

async function getUserTogglToken(userId: string): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { toggleApiKeyEnc: true },
  });
  if (!row?.toggleApiKeyEnc) return null;
  return decryptFromString(row.toggleApiKeyEnc);
}

async function getCurrentRunningEntry(togglToken: string) {
  const res = await fetch(
    "https://api.track.toggl.com/api/v9/me/time_entries/current",
    {
      headers: { Authorization: basicAuthHeader(togglToken) },
      cache: "no-store",
    }
  );
  if (res.status === 204) return null; // none running
  if (!res.ok) throw new Error(`/me/time_entries/current ${res.status}`);
  return res.json(); // entry object
}

async function getSinceEntries(togglToken: string, sinceUnix: number) {
  const url = `https://api.track.toggl.com/api/v9/me/time_entries?since=${sinceUnix}`;
  const res = await fetch(url, {
    headers: { Authorization: basicAuthHeader(togglToken) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`/me/time_entries ${res.status}`);
  return res.json(); // array of entries
}

function isRunning(entry: any): boolean {
  // In Toggl, running entries have negative 'duration' (and no 'stop')
  return typeof entry?.duration === "number" && entry.duration < 0;
}
function entryUpdatedAt(entry: any): Date | null {
  const at = entry?.at || entry?.updated_at;
  return at ? new Date(at) : null;
}
function toISO(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  return typeof d === "string" ? d : d.toISOString();
}
function toUnixSeconds(d: Date | string): number {
  const ms = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  return Math.floor(ms / 1000);
}

export async function POST() {
  const polledAt = now();

  // 1) Users who have a Toggl token
  const users = await prisma.user.findMany({
    where: { toggleApiKeyEnc: { not: null } },
    select: { id: true },
  });

  let enqueued = 0;
  let processedUsers = 0;

  for (const u of users) {
    try {
      const token = await getUserTogglToken(u.id);
      if (!token) continue;

      // Ensure SyncState row
      const state = await prisma.syncState.upsert({
        where: { userId: u.id },
        update: {},
        create: { userId: u.id },
      });

      // 2) SINCE cursor — use lastTogglAtSeen, else bootstrap with now-24h
      const sinceDate =
        (state as any).lastTogglAtSeen ?? new Date(Date.now() - DAY_MS); // prisma returns Date; fallback 24h
      const sinceISO = toISO(sinceDate);
      const sinceUnix = toUnixSeconds(sinceISO);

      // 3) Fetch all entries updated since the cursor (correct endpoint + UNIX since)
      const sinceEntries = await getSinceEntries(token, sinceUnix);

      // Track the max 'at' we observe to advance the cursor
      let maxAt: Date | null = (state as any).lastTogglAtSeen ?? null;

      // 4) Process each changed entry (only those we already linked)
      for (const e of Array.isArray(sinceEntries) ? sinceEntries : []) {
        if (!e?.id) continue;
        const at = entryUpdatedAt(e);
        if (at && (!maxAt || at > maxAt)) maxAt = at;

        const link = await prisma.timeEntryLink.findFirst({
          where: { userId: u.id, togglTimeEntryId: String(e.id) },
          select: { id: true, notionTaskPageId: true },
        });
        if (!link?.notionTaskPageId) continue; // MVP: only mirror known links

        const idBase = `${u.id}:${e.id}:${at ? at.toISOString() : "na"}`;

        if (isRunning(e)) {
          const idempKey = `toggl->notion:start:${idBase}`;
          await prisma.outboxJob.upsert({
            where: { idempotencyKey: idempKey },
            update: {},
            create: {
              userId: u.id,
              kind: "NOTION_MARK_STARTED",
              idempotencyKey: idempKey,
              status: "PENDING",
              payload: {
                userId: u.id,
                pageId: link.notionTaskPageId,
                togglEntryId: String(e.id),
                startTs: e.start ?? new Date().toISOString(),
                origin: "TOGGL",
              },
              nextRunAt: new Date(),
            },
          });
          enqueued++;
        } else {
          const idempKey = `toggl->notion:stop:${idBase}`;
          await prisma.outboxJob.upsert({
            where: { idempotencyKey: idempKey },
            update: {},
            create: {
              userId: u.id,
              kind: "NOTION_MARK_STOPPED",
              idempotencyKey: idempKey,
              status: "PENDING",
              payload: {
                userId: u.id,
                pageId: link.notionTaskPageId,
                togglEntryId: String(e.id),
                stopTs: e.stop ?? new Date().toISOString(),
                origin: "TOGGL",
              },
              nextRunAt: new Date(),
            },
          });
          enqueued++;
        }
      }

      // 5) Also check current running (in case it hasn't changed since 'sinceUnix')
      const current = await getCurrentRunningEntry(token);
      if (current?.id) {
        const link = await prisma.timeEntryLink.findFirst({
          where: { userId: u.id, togglTimeEntryId: String(current.id) },
          select: { id: true, notionTaskPageId: true },
        });
        if (link?.notionTaskPageId) {
          // Use a stable idempotency key that won’t spam if unchanged
          const idempKey = `toggl->notion:current:${u.id}:${current.id}`;
          await prisma.outboxJob.upsert({
            where: { idempotencyKey: idempKey },
            update: {},
            create: {
              userId: u.id,
              kind: "NOTION_MARK_STARTED",
              idempotencyKey: idempKey,
              status: "PENDING",
              payload: {
                userId: u.id,
                pageId: link.notionTaskPageId,
                togglEntryId: String(current.id),
                startTs: current.start ?? new Date().toISOString(),
                origin: "TOGGL",
              },
              nextRunAt: new Date(),
            },
          });
          enqueued++;
        }
      }

      // 6) Advance cursor to the max 'at' we observed (keep same if none)
      if (maxAt) {
        await prisma.syncState.update({
          where: { userId: u.id },
          data: { lastTogglAtSeen: maxAt, lastTogglPollAt: polledAt },
        });
      } else {
        // still update poll time for observability
        await prisma.syncState.update({
          where: { userId: u.id },
          data: { lastTogglPollAt: polledAt },
        });
      }

      processedUsers++;
    } catch (err) {
      console.error("[poller] user failed", u.id, err);
      // continue with other users
    }
  }

  return NextResponse.json({
    ok: true,
    usersScanned: users.length,
    usersProcessed: processedUsers,
    jobsEnqueued: enqueued,
    polledAt: polledAt.toISOString(),
  });
}
