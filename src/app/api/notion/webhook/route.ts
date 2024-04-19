export const runtime = "nodejs";

import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ---- config (property names in Notion) ----
const DATE_PROP_NAMES = ["Timer Started", "Time Started"]; // support either
const TEID_PROP_NAMES = ["Toggl Entry ID", "Toggl Entry Id"]; // support either

// utils
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
function firstDefined<T>(
  obj: Record<string, any>,
  names: string[]
): { name: string; value: T | undefined } {
  for (const n of names) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, n)) {
      // @ts-ignore
      return { name: n, value: obj[n] as T };
    }
  }
  return { name: names[0], value: undefined };
}

// ---- main handler ----
export async function POST(req: Request) {
  debugger;
  const secret = process.env.NOTION_WEBHOOK_SECRET || "";

  const raw = await req.text(); // IMPORTANT: raw body for signature + challenge
  let body: any;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // 1) Handle Notion "challenge" handshake (no signature required)
  if (body?.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 2) Verify signature (Notion: x-notion-signature = sha256=<hmacHex(secret, rawBody)>)
  try {
    const incomingSig = getHeaderSig(req);
    const expectedSig = hmacHex(secret, raw);
    console.log("🔎 raw.length =", raw.length);
    console.log(
      "🔎 header starts sha256=?",
      (req.headers.get("x-notion-signature") || "").startsWith("sha256=")
    );
    console.log(
      "🔎 sig lengths incoming/expected =",
      incomingSig.length,
      expectedSig.length
    );

    if (!incomingSig || !safeEqualHex(incomingSig, expectedSig)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } catch (e) {
    console.error("Signature verify error:", e);
    return new NextResponse("Signature check failed", { status: 401 });
  }

  // 3) Resolve the human author
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
  // unknown user
  if (!account?.userId || !account?.access_token) {
    return NextResponse.json({ skipped: "unknown-user" }, { status: 202 });
  }

  const userId = account.userId;
  const notionToken = account.access_token;
  // page property update event
  if (
    body?.type !== "page.properties_updated" ||
    body?.entity?.type !== "page"
  ) {
    return NextResponse.json({ ok: true, ignored: body?.type ?? "unknown" });
  }

  const pageId = body.entity.id;
  // fetch the page to get properties
  const pageRes = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": body?.api_version || "2022-06-28",
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

  // Extract date and TEID (support either property name variant)
  const { value: dateProp }: { name: string; value: any } = firstDefined(
    props,
    DATE_PROP_NAMES
  );
  const { value: teidProp }: { name: string; value: any } = firstDefined(
    props,
    TEID_PROP_NAMES
  );

  const timeStarted: string | null = dateProp?.date?.start ?? null;
  const togglEntryId: string = teidProp?.rich_text
    ? rtToString(teidProp.rich_text)
    : "";

  // 6) Decide intent
  let kind: "START_TOGGL" | "STOP_TOGGL" | null = null;
  if (timeStarted && !togglEntryId) kind = "START_TOGGL";
  else if (!timeStarted && togglEntryId) kind = "STOP_TOGGL";

  if (!kind) {
    // No-op (e.g., both empty or both set) → nothing to do
    return NextResponse.json({ ok: true, noop: true });
  }

  // 7) Enqueue OutboxJob for reliable async processing
  const idemp = `${userId}:${pageId}:${kind}:${body?.timestamp ?? Date.now()}`;

  const payload =
    kind === "START_TOGGL"
      ? {
          pageId,
          userId,
          timeStarted, // ISO string
          apiVersion: body?.api_version,
          origin: "NOTION",
        }
      : {
          pageId,
          userId,
          togglEntryId,
          apiVersion: body?.api_version,
          origin: "NOTION",
        };

  // Insert if not already present
  await prisma.outboxJob.upsert({
    where: { idempotencyKey: idemp },
    update: {},
    create: {
      userId,
      kind,
      payload,
      idempotencyKey: idemp,
      status: "PENDING",
      nextRunAt: new Date(),
    },
  });

  return NextResponse.json({ queued: kind, pageId });
}
