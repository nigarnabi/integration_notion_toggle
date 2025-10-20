export const runtime = "nodejs";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DATE_PROP_NAME = "Timer Started";
const TEID_PROP_NAME = "Toggl Entry ID";

// --- utils ---
function hmacHex(secret: string, raw: string) {
  return createHmac("sha256", secret).update(raw).digest("hex");
}
function getHeaderSig(req: Request) {
  const sigHeader = req.headers.get("x-notion-signature") || "";
  return sigHeader.startsWith("sha256=") ? sigHeader.slice(7) : sigHeader;
}
function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
function rtToString(rich: any): string {
  if (!rich || !Array.isArray(rich)) return "";
  return rich
    .map((r) => r?.plain_text || "")
    .join("")
    .trim();
}

export async function POST(req: Request) {
  const secret = process.env.NOTION_WEBHOOK_SECRET || "";

  // raw body is required for signature + challenge
  const raw = await req.text();
  let body: any;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // 1) Notion challenge
  if (body?.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 2) Verify signature
  try {
    const incomingSig = getHeaderSig(req);
    const expectedSig = hmacHex(secret, raw);
    if (!incomingSig || !safeEqualHex(incomingSig, expectedSig)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } catch {
    return new NextResponse("Signature check failed", { status: 401 });
  }

  // 3) Resolve the human author → your user
  const person =
    (body?.authors || []).find((a: any) => a?.type === "person") ||
    (body?.accessible_by || []).find((a: any) => a?.type === "person");

  if (!person?.id) {
    return NextResponse.json({ skipped: "no-person" });
  }

  const account = await prisma.account.findFirst({
    where: { provider: "notion", providerAccountId: person.id },
    select: { userId: true, access_token: true },
  });
  if (!account?.userId || !account?.access_token) {
    return NextResponse.json({ skipped: "unknown-user" }, { status: 202 });
  }
  const userId = account.userId;
  const notionToken = account.access_token;

  // 4) Only handle page.properties_updated
  if (
    body?.type !== "page.properties_updated" ||
    body?.entity?.type !== "page"
  ) {
    return NextResponse.json({ ok: true, ignored: body?.type ?? "unknown" });
  }

  const pageId = body.entity.id;
  const apiVersion = body?.api_version || "2022-06-28";

  // 5) Fetch page (single snapshot)
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": apiVersion,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!pageRes.ok) {
    console.error(
      "Notion page fetch failed:",
      pageRes.status,
      await pageRes.text()
    );
    return NextResponse.json({ error: "notion-fetch-failed" }, { status: 502 });
  }

  const page = await pageRes.json();
  const props = page?.properties || {};

  const dateProp: any = props[DATE_PROP_NAME];
  const teidProp: any = props[TEID_PROP_NAME];

  const timeStarted: string | null = dateProp?.date?.start ?? null;
  const togglEntryId: string = teidProp?.rich_text
    ? rtToString(teidProp.rich_text)
    : "";

  // 6) DB-anchored transition check to avoid self-writes
  const runningLink = await prisma.timeEntryLink.findFirst({
    where: { userId, notionTaskPageId: pageId, status: "RUNNING" },
    orderBy: { startTs: "desc" },
    select: { id: true, togglTimeEntryId: true },
  });

  // Transition rules:
  // - START if Timer Started is set AND there's no RUNNING link.
  // - STOP  if Timer Started is empty AND there is a RUNNING link.
  // - Otherwise noop (covers TEID-only writes and retries).
  let kind: "START_TOGGL" | "STOP_TOGGL" | null = null;
  if (timeStarted && !runningLink) {
    kind = "START_TOGGL";
  } else if (!timeStarted && runningLink) {
    kind = "STOP_TOGGL";
  } else {
    return NextResponse.json({ ok: true, noop: true });
  }

  // 7) Strong idempotency: prefer event id; fallback deterministic key
  const eventId: string =
    body?.id ||
    body?.event_id ||
    `${pageId}:${kind}:${String(timeStarted ?? "empty")}`;
  const idempKey = `notion:${eventId}`;

  // 8) Extra guard: skip if same page+kind job already pending/running
  const existingJob = await prisma.outboxJob.findFirst({
    where: {
      userId,
      kind,
      status: { in: ["PENDING", "RUNNING"] },
      payload: { path: ["pageId"], equals: pageId },
    },
    select: { id: true },
  });
  if (existingJob) {
    return NextResponse.json({ ok: true, deduped: true, kind });
  }

  // 9) Build payload
  const payload =
    kind === "START_TOGGL"
      ? {
          pageId,
          userId,
          timeStarted, // ISO string
          apiVersion,
          origin: "NOTION" as const,
        }
      : {
          pageId,
          userId,
          togglEntryId: runningLink?.togglTimeEntryId || togglEntryId || "",
          apiVersion,
          origin: "NOTION" as const,
        };

  // 10) Enqueue with idempotency
  await prisma.outboxJob.upsert({
    where: { idempotencyKey: idempKey },
    update: {},
    create: {
      userId,
      kind,
      payload,
      idempotencyKey: idempKey,
      status: "PENDING",
      nextRunAt: new Date(),
    },
  });

  return NextResponse.json({ queued: kind, pageId });
}
