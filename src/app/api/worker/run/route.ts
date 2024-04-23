export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptFromString } from "@/lib/crypto";

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
  // Prefer default_workspace_id, else first workspace id
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

async function setNotionTogglEntryId(
  notionToken: string,
  pageId: string,
  togglEntryId: string,
  propertyName = "Toggl Entry ID",
  apiVersion = "2022-06-28"
) {
  // Write TEID as rich_text
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
  // Treat 404 as idempotent success (already stopped/deleted)
  if (!res.ok && res.status !== 404) {
    const txt = await res.text();
    throw new Error(`Toggl stop failed: ${res.status} ${txt}`);
  }
}

//notion timer helpers

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
      case "START_TOGGL": {
        // ---- Parse payload ----
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

        // ---- Load secrets ----
        const { togglToken, notionToken } = await getUserSecrets(userId);

        // ---- Fetch Notion page (to get title) ----
        const page = await getNotionPage(notionToken, pageId, apiVersion);
        const title = readTitleFromPage(page);

        // ---- Get Toggl workspace ----
        const workspaceId = await getTogglWorkspaceId(togglToken);

        // (Minimal version = no project/task mapping yet)
        // ---- Start a time entry ----
        const startISO = timeStarted || new Date().toISOString();
        const entry = await startTogglTimeEntry({
          togglToken,
          workspaceId,
          description: title,
          startISO,
        });
        const togglEntryId = entry?.id;
        if (!togglEntryId) throw new Error("No Toggl entry id returned");

        // ---- Save in Notion ----
        await setNotionTogglEntryId(
          notionToken,
          pageId,
          String(togglEntryId),
          "Toggl Entry ID",
          apiVersion
        );

        // ---- Create DB link (RUNNING) ----
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

        // ---- Mark job DONE ----
        await prisma.outboxJob.update({
          where: { id: locked.id },
          data: { status: "DONE", lastError: null },
        });

        return NextResponse.json({ ok: true, processed: 1, kind: locked.kind });
      }

      case "STOP_TOGGL": {
        // ---- Parse payload ----
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

        // If we still don't have an id, treat as idempotent success.
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

        // ---- Stop in Toggl (idempotent on 404) ----
        await stopTogglTimeEntry({ togglToken, workspaceId, entryId });

        const endedAt = new Date();

        // ---- Update DB link ----
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

        // ---- Clear Notion property (optional but recommended) ----
        await clearNotionTogglEntryId(
          notionToken,
          pageId,
          "Toggl Entry ID",
          apiVersion
        );

        // ---- Mark job DONE ----
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

        // Ensure link exists and is RUNNING (no compound unique; use findFirst)
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

        // Update Notion (TEID then date)
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
        // (Optionally keep or clear TEID — your webhook ignores TEID-only updates)

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
