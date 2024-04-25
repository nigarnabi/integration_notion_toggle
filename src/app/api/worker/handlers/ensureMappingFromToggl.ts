import { prisma } from "@/lib/prisma";
import {
  buildTaskFingerprint,
  normalizeTitle,
  togglIsRunning,
  parseDateOrNull,
} from "@/lib/mapping";
import { getUserNotionToken } from "@/lib/notion-auth";
import { Client as NotionClient } from "@notionhq/client";

type EnsureMappingPayload = {
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

const DEFAULT_TITLE = "Untitled from Toggl";
const NOTION_TITLE_PROP = "Name";
const NOTION_TIMER_PROP = "Timer Started";

async function resolveTargetDatabaseId(userId: string): Promise<string> {
  const dbId = process.env.NOTION_TASKS_DB_ID;
  if (!dbId)
    throw new Error(
      "NOTION_TASKS_DB_ID is not set and no per-user DB configured."
    );
  return dbId;
}

export async function handleEnsureMappingFromToggl(
  jobId: string,
  payload: EnsureMappingPayload
) {
  const { userId, togglEntry } = payload;

  // 1) Derive fingerprint
  const fingerprint = buildTaskFingerprint({
    description: togglEntry.description,
    projectId: togglEntry.project_id,
    tagIds: togglEntry.tag_ids ?? [],
    workspaceId: togglEntry.workspace_id,
  });

  // 2) Try to find existing TaskMapping by fingerprint
  let mapping = await prisma.taskMapping.findFirst({
    where: { userId, matchFingerprint: fingerprint },
    select: { id: true, notionTaskPageId: true, notionDatabaseId: true },
  });

  // 3) If not found, create Notion page and TaskMapping
  if (!mapping) {
    const notionToken = await getUserNotionToken(userId);
    if (!notionToken)
      throw new Error("No Notion token for user to create page.");
    const notion = new NotionClient({ auth: notionToken });
    const dbId = await resolveTargetDatabaseId(userId);
    const pageTitle = normalizeTitle(togglEntry.description) || DEFAULT_TITLE;

    const created = await notion.pages.create({
      parent: { database_id: dbId },
      properties: {
        [NOTION_TITLE_PROP]: {
          title: [{ type: "text", text: { content: pageTitle } }],
        },
        // Leave NOTION_TIMER_PROP untouched here; the subsequent NOTION_MARK_* will flip it.
      },
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
        taskNameSnapshot: pageTitle,
        matchFingerprint: fingerprint,
        lastSyncedAt: new Date(),
      },
      select: { id: true, notionTaskPageId: true, notionDatabaseId: true },
    });
  }

  // 4) Upsert the TimeEntryLink for this specific Toggl entry
  const running = togglIsRunning(togglEntry.duration);
  const startTs = parseDateOrNull(togglEntry.start) ?? new Date();
  const stopTs = parseDateOrNull(togglEntry.stop);

  const link = await prisma.timeEntryLink.upsert({
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
      togglTaskId: togglEntry.task_id ? String(togglEntry.task_id) : undefined,
      togglUpdatedAt: parseDateOrNull(togglEntry.at) ?? new Date(),
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
      togglTaskId: togglEntry.task_id ? String(togglEntry.task_id) : undefined,
      togglUpdatedAt: parseDateOrNull(togglEntry.at) ?? new Date(),
      descriptionSnapshot: togglEntry.description ?? undefined,
    },
    select: { notionTaskPageId: true },
  });

  // 5) Enqueue mirror job to flip Notion timer state
  const atIso = parseDateOrNull(togglEntry.at)?.toISOString() ?? "na";
  const idBase = `${userId}:${togglEntry.id}:${atIso}`;

  if (running) {
    const idempotencyKey = `ensured->notion:start:${idBase}`;
    await prisma.outboxJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        userId,
        kind: "NOTION_MARK_STARTED",
        idempotencyKey,
        status: "PENDING",
        payload: {
          userId,
          pageId: link.notionTaskPageId,
          togglEntryId: String(togglEntry.id),
          startTs: togglEntry.start ?? new Date().toISOString(),
          origin: "TOGGL",
        },
        nextRunAt: new Date(),
      },
    });
  } else {
    const idempotencyKey = `ensured->notion:stop:${idBase}`;
    await prisma.outboxJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        userId,
        kind: "NOTION_MARK_STOPPED",
        idempotencyKey,
        status: "PENDING",
        payload: {
          userId,
          pageId: link.notionTaskPageId,
          togglEntryId: String(togglEntry.id),
          stopTs: togglEntry.stop ?? new Date().toISOString(),
          origin: "TOGGL",
        },
        nextRunAt: new Date(),
      },
    });
  }
}
