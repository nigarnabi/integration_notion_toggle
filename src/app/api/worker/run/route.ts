export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptFromString } from "@/lib/crypto";
import crypto from "crypto";

// --------------- Small helpers ---------------
const now = () => new Date();

function basicAuthHeader(togglApiKey: string) {
  const b64 = Buffer.from(`${togglApiKey}:api_token`).toString("base64");
  return `Basic ${b64}`;
}

async function getUserSecrets(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { toggleApiKeyEnc: true },
  });
  if (!user?.toggleApiKeyEnc) {
    throw new Error("User has no Toggl API token saved");
  }
  const togglToken = await decryptFromString(user.toggleApiKeyEnc);

  const account = await prisma.account.findFirst({
    where: { userId, provider: "notion" },
    select: { access_token: true },
  });
  if (!account?.access_token)
    throw new Error("No Notion access token for user");

  return { togglToken, notionToken: account.access_token };
}

async function getTogglWorkspaceId(togglToken: string): Promise<number> {
  const res = await fetch("https://api.track.toggl.com/api/v9/me", {
    headers: { Authorization: basicAuthHeader(togglToken) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Toggl /me failed: ${res.status}`);
  const me = await res.json();
  const ws =
    me?.default_workspace_id ??
    (Array.isArray(me?.workspaces) && me.workspaces.length
      ? me.workspaces[0]?.id
      : null);
  if (!ws) throw new Error("No Toggl workspace available");
  return Number(ws);
}

function readTitleFromPage(page: any): string {
  for (const key of Object.keys(page?.properties || {})) {
    const prop = page.properties[key];
    if (prop?.type === "title" && Array.isArray(prop.title)) {
      return (
        prop.title
          .map((t: any) => t?.plain_text || "")
          .join("")
          .trim() || "Untitled"
      );
    }
  }
  return "Untitled";
}

// --- Notion raw API helpers ---
async function getNotionPage(
  notionToken: string,
  pageId: string,
  apiVersion = "2022-06-28"
) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Notion pages/${pageId} failed: ${res.status}`);
  return res.json();
}

async function createNotionPageInDb(opts: {
  notionToken: string;
  databaseId: string;
  title: string;
  titleProp?: string;
  apiVersion?: string;
}) {
  debugger;
  const {
    notionToken,
    databaseId,
    title,
    titleProp = "Task name",
    apiVersion = "2022-06-28",
  } = opts;

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        [titleProp]: { title: [{ type: "text", text: { content: title } }] },
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Notion create page failed: ${res.status} ${txt}`);
  }
  return res.json();
}

async function setNotionTogglEntryId(
  notionToken: string,
  pageId: string,
  togglEntryId: string,
  propertyName = "Toggl Entry ID",
  apiVersion = "2022-06-28"
) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        [propertyName]: {
          rich_text: [
            { type: "text", text: { content: String(togglEntryId) } },
          ],
        },
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(
      `Failed to write Toggl Entry ID to Notion: ${res.status} ${txt}`
    );
  }
}

async function readNotionTogglEntryId(
  notionToken: string,
  pageId: string,
  propertyName = "Toggl Entry ID",
  apiVersion = "2022-06-28"
): Promise<string | null> {
  const page = await getNotionPage(notionToken, pageId, apiVersion);
  const prop = page?.properties?.[propertyName];
  if (prop?.type === "rich_text" && Array.isArray(prop.rich_text)) {
    const txt = prop.rich_text
      .map((t: any) => t?.plain_text || "")
      .join("")
      .trim();
    return txt || null;
  }
  return null;
}

async function clearNotionTogglEntryId(
  notionToken: string,
  pageId: string,
  propertyName = "Toggl Entry ID",
  apiVersion = "2022-06-28"
) {
  await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { [propertyName]: { rich_text: [] } },
    }),
  });
}

// Toggl helpers
async function startTogglTimeEntry(opts: {
  togglToken: string;
  workspaceId: number;
  description: string;
  startISO: string;
  projectId?: number | null;
  taskId?: number | null;
}) {
  const body: any = {
    start: opts.startISO,
    duration: -1,
    created_with: "NotionTogglSync",
    description: opts.description || "Notion Task",
    wid: opts.workspaceId,
  };
  if (opts.projectId) body.project_id = opts.projectId;
  if (opts.taskId) body.task_id = opts.taskId;

  const res = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${opts.workspaceId}/time_entries`,
    {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(opts.togglToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Toggl start time entry failed: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json;
}

async function stopTogglTimeEntry(opts: {
  togglToken: string;
  workspaceId: number;
  entryId: string | number;
}) {
  const res = await fetch(
    `https://api.track.toggl.com/api/v9/workspaces/${opts.workspaceId}/time_entries/${opts.entryId}/stop`,
    {
      method: "PATCH",
      headers: { Authorization: basicAuthHeader(opts.togglToken) },
    }
  );
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`Toggl stop failed: ${res.status} ${txt}`);
  }
}

// Notion timer helpers
async function setNotionTimerStarted(
  notionToken: string,
  pageId: string,
  startISO: string,
  propertyName = "Timer Started",
  apiVersion = "2022-06-28"
) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { [propertyName]: { date: { start: startISO } } },
    }),
  });
  if (!res.ok)
    throw new Error(
      `Failed to set Timer Started: ${res.status} ${await res.text()}`
    );
}

async function clearNotionTimerStarted(
  notionToken: string,
  pageId: string,
  propertyName = "Timer Started",
  apiVersion = "2022-06-28"
) {
  const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { [propertyName]: { date: null } },
    }),
  });
  if (!res.ok)
    throw new Error(
      `Failed to clear Timer Started: ${res.status} ${await res.text()}`
    );
}

// ---------- Two-way sync glue (mapping + fingerprint) ----------
function normalizeTitle(s: string | null | undefined): string {
  if (!s) return "";
  const collapsed = s
    .toLowerCase()
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  // strip leading/trailing punctuation/symbols
  return collapsed.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
}

function buildTaskFingerprint(opts: {
  description?: string | null;
  projectId?: number | string | null;
  tagIds?: Array<number | string> | null;
  workspaceId?: number | string | null;
}): string {
  const desc = normalizeTitle(opts.description ?? "");
  const proj = opts.projectId ?? "0";
  const ws = opts.workspaceId ?? "0";
  const tags = (opts.tagIds ?? []).map(String).sort().join(",");
  const raw = `${desc}|${proj}|${tags}|${ws}`;
  return crypto.createHash("sha1").update(raw, "utf8").digest("hex");
}

function togglIsRunning(duration: number | null | undefined): boolean {
  return typeof duration === "number" && duration < 0;
}

function parseDateOrNull(x: string | null | undefined): Date | null {
  if (!x) return null;
  const d = new Date(x);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveTargetDatabaseId(_userId: string): Promise<string> {
  const dbId = process.env.NOTION_TASKS_DB_ID;
  if (!dbId)
    throw new Error(
      "NOTION_TASKS_DB_ID is not set and no per-user DB configured."
    );
  return dbId;
}

// --------------- ROUTE (single job runner) ---------------
export async function POST() {
  // 1) Pick ONE pending job that is due
  const job = await prisma.outboxJob.findFirst({
    where: {
      status: "PENDING",
      nextRunAt: { lte: now() },
    },
    orderBy: { nextRunAt: "asc" },
  });

  if (!job) {
    return NextResponse.json({ ok: true, processed: 0, note: "no due jobs" });
  }

  // 2) Mark as RUNNING (best-effort lock)
  const locked = await prisma.outboxJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", attempt: { increment: 1 } },
  });

  try {
    switch (locked.kind) {
      // ---------- NEW: Ensure mapping & link from an observed Toggl entry ----------
      case "ENSURE_MAPPING_FROM_TOGGL": {
        const payload = locked.payload as {
          userId: string;
          togglEntry: {
            id: string;
            description: string | null;
            start: string | null;
            stop: string | null;
            duration: number | null;
            at: string | null;
            project_id: number | null;
            task_id: number | null;
            workspace_id: number | null;
            tag_ids: number[] | null;
          };
        };

        const { userId, togglEntry } = payload;
        if (!userId || !togglEntry?.id)
          throw new Error("Missing userId/togglEntry.id in payload");

        const { notionToken } = await getUserSecrets(userId);
        const dbId = await resolveTargetDatabaseId(userId);

        // 1) Fingerprint
        const fingerprint = buildTaskFingerprint({
          description: togglEntry.description ?? "",
          projectId: togglEntry.project_id ?? 0,
          tagIds: togglEntry.tag_ids ?? [],
          workspaceId: togglEntry.workspace_id ?? 0,
        });

        // 2) Find existing mapping by fingerprint
        let mapping = await prisma.taskMapping.findFirst({
          where: { userId, matchFingerprint: fingerprint },
          select: { id: true, notionTaskPageId: true, notionDatabaseId: true },
        });

        // 3) If missing → create a Notion page + mapping
        if (!mapping) {
          const title =
            normalizeTitle(togglEntry.description) || "Untitled from Toggl";
          const created = await createNotionPageInDb({
            notionToken,
            databaseId: dbId,
            title,
            titleProp: "Task name",
          });

          mapping = await prisma.taskMapping.create({
            data: {
              userId,
              notionTaskPageId: created.id,
              notionDatabaseId: dbId,
              togglWorkspaceId: togglEntry.workspace_id ?? undefined,
              togglProjectId: togglEntry.project_id
                ? String(togglEntry.project_id)
                : undefined,
              togglTaskId: togglEntry.task_id
                ? String(togglEntry.task_id)
                : undefined,
              taskNameSnapshot: title,
              matchFingerprint: fingerprint,
              lastSyncedAt: new Date(),
            },
            select: {
              id: true,
              notionTaskPageId: true,
              notionDatabaseId: true,
            },
          });
        }

        // 4) Upsert TimeEntryLink
        const running = togglIsRunning(togglEntry.duration);
        const startTs = parseDateOrNull(togglEntry.start) ?? new Date();
        const stopTs = parseDateOrNull(togglEntry.stop);
        const togglUpdated = parseDateOrNull(togglEntry.at) ?? new Date();

        await prisma.timeEntryLink.upsert({
          where: {
            userId_togglTimeEntryId: {
              userId,
              togglTimeEntryId: String(togglEntry.id),
            },
          },
          update: {
            mappingId: mapping.id,
            notionTaskPageId: mapping.notionTaskPageId,
            origin: "TOGGL",
            status: running ? "RUNNING" : "STOPPED",
            startTs,
            stopTs: running ? null : stopTs ?? undefined,
            lastSeenAt: new Date(),
            togglWorkspaceId: togglEntry.workspace_id ?? undefined,
            togglProjectId: togglEntry.project_id
              ? String(togglEntry.project_id)
              : undefined,
            togglTaskId: togglEntry.task_id
              ? String(togglEntry.task_id)
              : undefined,
            togglUpdatedAt: togglUpdated,
            descriptionSnapshot: togglEntry.description ?? undefined,
          },
          create: {
            userId,
            mappingId: mapping.id,
            notionTaskPageId: mapping.notionTaskPageId,
            togglTimeEntryId: String(togglEntry.id),
            origin: "TOGGL",
            status: running ? "RUNNING" : "STOPPED",
            startTs,
            stopTs: running ? null : stopTs ?? undefined,
            lastSeenAt: new Date(),
            togglWorkspaceId: togglEntry.workspace_id ?? undefined,
            togglProjectId: togglEntry.project_id
              ? String(togglEntry.project_id)
              : undefined,
            togglTaskId: togglEntry.task_id
              ? String(togglEntry.task_id)
              : undefined,
            togglUpdatedAt: togglUpdated,
            descriptionSnapshot: togglEntry.description ?? undefined,
          },
        });

        // 5) Enqueue mirror job for Notion state flip (idempotent)
        const atIso = togglUpdated.toISOString();
        const idBase = `${userId}:${togglEntry.id}:${atIso}`;

        const kind = running ? "NOTION_MARK_STARTED" : "NOTION_MARK_STOPPED";
        const idempotencyKey = `ensured->notion:${
          running ? "start" : "stop"
        }:${idBase}`;
        await prisma.outboxJob.upsert({
          where: { idempotencyKey },
          update: {},
          create: {
            userId,
            kind,
            idempotencyKey,
            status: "PENDING",
            payload: {
              userId,
              pageId: mapping.notionTaskPageId,
              togglEntryId: String(togglEntry.id),
              ...(running
                ? { startTs: togglEntry.start ?? new Date().toISOString() }
                : { stopTs: togglEntry.stop ?? new Date().toISOString() }),
              origin: "TOGGL",
            },
            nextRunAt: new Date(),
          },
        });

        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });

        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      // ---------- Existing handlers ----------
      case "START_TOGGL": {
        const payload = locked.payload as {
          userId: string;
          pageId: string;
          timeStarted?: string;
          apiVersion?: string;
          origin?: "NOTION" | "TOGGL";
        };
        const { userId, pageId, timeStarted, apiVersion } = payload;
        if (!userId || !pageId)
          throw new Error("Missing userId/pageId in payload");

        const { togglToken, notionToken } = await getUserSecrets(userId);

        const page = await getNotionPage(notionToken, pageId, apiVersion);
        const title = readTitleFromPage(page);

        const workspaceId = await getTogglWorkspaceId(togglToken);

        const startISO = timeStarted || new Date().toISOString();
        const entry = await startTogglTimeEntry({
          togglToken,
          workspaceId,
          description: title,
          startISO,
        });
        const togglEntryId = entry?.id;
        if (!togglEntryId) throw new Error("No Toggl entry id returned");

        await setNotionTogglEntryId(
          notionToken,
          pageId,
          String(togglEntryId),
          "Toggl Entry ID",
          apiVersion
        );

        await prisma.timeEntryLink.create({
          data: {
            userId,
            notionTaskPageId: pageId,
            togglTimeEntryId: String(togglEntryId),
            origin: "NOTION",
            status: "RUNNING",
            startTs: new Date(startISO),
            lastSeenAt: new Date(),
          },
        });

        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });

        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      case "STOP_TOGGL": {
        const payload = locked.payload as {
          userId: string;
          pageId: string;
          apiVersion?: string;
          origin?: "NOTION" | "TOGGL";
        };
        const { userId, pageId, apiVersion } = payload;
        if (!userId || !pageId)
          throw new Error("Missing userId/pageId in payload");

        const { togglToken, notionToken } = await getUserSecrets(userId);
        const workspaceId = await getTogglWorkspaceId(togglToken);

        let entryId =
          (await readNotionTogglEntryId(
            notionToken,
            pageId,
            "Toggl Entry ID",
            apiVersion
          )) || null;

        if (!entryId) {
          const link = await prisma.timeEntryLink.findFirst({
            where: {
              userId,
              notionTaskPageId: pageId,
              status: "RUNNING",
            },
            orderBy: { startTs: "desc" },
          });
          entryId = link?.togglTimeEntryId ?? null;
        }

        if (!entryId) {
          await prisma.outboxJob.update({
            where: { id: locked.id },
            data: { status: "DONE", lastError: null },
          });
          return NextResponse.json({
            ok: true,
            processed: 1,
            kind: locked.kind,
            note: "no entry id to stop",
          });
        }

        await stopTogglTimeEntry({ togglToken, workspaceId, entryId });

        const endedAt = new Date();

        await prisma.timeEntryLink.updateMany({
          where: {
            userId,
            notionTaskPageId: pageId,
            togglTimeEntryId: String(entryId),
            status: "RUNNING",
          },
          data: {
            status: "STOPPED",
            stopTs: endedAt,
            lastSeenAt: endedAt,
          },
        });

        await clearNotionTogglEntryId(
          notionToken,
          pageId,
          "Toggl Entry ID",
          apiVersion
        );

        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });

        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      case "NOTION_MARK_STARTED": {
        const payload = locked.payload as {
          userId: string;
          pageId: string;
          togglEntryId: string;
          startTs?: string;
          apiVersion?: string;
          origin?: "TOGGL" | "NOTION";
        };
        const { userId, pageId, togglEntryId, startTs, apiVersion } = payload;
        if (!userId || !pageId || !togglEntryId)
          throw new Error("Missing fields");

        const { notionToken, togglToken } = await getUserSecrets(userId);
        const workspaceId = await getTogglWorkspaceId(togglToken);
        const startedAt = startTs ? new Date(startTs) : new Date();

        const existing = await prisma.timeEntryLink.findFirst({
          where: { userId, togglTimeEntryId: String(togglEntryId) },
          select: { id: true },
        });

        if (existing) {
          await prisma.timeEntryLink.update({
            where: { id: existing.id },
            data: {
              notionTaskPageId: pageId,
              status: "RUNNING",
              startTs: startedAt,
              lastSeenAt: new Date(),
              togglWorkspaceId: workspaceId,
              origin: "TOGGL",
            },
          });
        } else {
          await prisma.timeEntryLink.create({
            data: {
              userId,
              notionTaskPageId: pageId,
              togglTimeEntryId: String(togglEntryId),
              origin: "TOGGL",
              status: "RUNNING",
              startTs: startedAt,
              lastSeenAt: new Date(),
              togglWorkspaceId: workspaceId,
            },
          });
        }

        await setNotionTogglEntryId(
          notionToken,
          pageId,
          String(togglEntryId),
          "Toggl Entry ID",
          apiVersion
        );
        await setNotionTimerStarted(
          notionToken,
          pageId,
          startedAt.toISOString(),
          "Timer Started",
          apiVersion
        );

        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });
        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      case "NOTION_MARK_STOPPED": {
        const payload = locked.payload as {
          userId: string;
          pageId: string;
          togglEntryId: string;
          stopTs?: string;
          apiVersion?: string;
          origin?: "TOGGL" | "NOTION";
        };
        const { userId, pageId, togglEntryId, stopTs, apiVersion } = payload;
        if (!userId || !pageId || !togglEntryId)
          throw new Error("Missing fields");

        const { notionToken } = await getUserSecrets(userId);
        const endedAt = stopTs ? new Date(stopTs) : new Date();

        await prisma.timeEntryLink.updateMany({
          where: {
            userId,
            notionTaskPageId: pageId,
            togglTimeEntryId: String(togglEntryId),
          },
          data: { status: "STOPPED", stopTs: endedAt, lastSeenAt: new Date() },
        });

        await clearNotionTimerStarted(
          notionToken,
          pageId,
          "Timer Started",
          apiVersion
        );

        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });
        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      default: {
        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: {
            status: "DONE",
            lastError: `Ignored unknown kind: ${locked.kind}`,
          },
        });
        return NextResponse.json({
          ok: true,
          processed: 1,
          ignoredKind: locked.kind,
        });
      }
    }
  } catch (err: any) {
    // Backoff retry
    const attempts = locked.attempt ?? 1;
    const backoffSeconds = Math.min(600, Math.pow(2, attempts) * 5); // 5s,10s,20s,... max 10m
    const nextRunAt = new Date(Date.now() + backoffSeconds * 1000);

    await prisma.outboxJob.update({
      where: { id: locked.id },
      data: {
        status: "FAILED",
        lastError: String(err?.message ?? err),
        nextRunAt,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        processed: 0,
        error: err?.message ?? String(err),
        nextRetryInSec: backoffSeconds,
      },
      { status: 500 }
    );
  }
}
