export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Small helper: now minus small skew
const now = () => new Date();

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
    // 3) Route by kind (we will flesh out START_TOGGL next)
    switch (locked.kind) {
      case "START_TOGGL": {
        // TODO: implement in the next step
        // Keep as a placeholder for now so skeleton runs
        // Throw to simulate "not implemented" → it will be retried later
        throw new Error("START_TOGGL handler not implemented yet");
      }

      case "STOP_TOGGL": {
        // TODO: implement after start flow works
        throw new Error("STOP_TOGGL handler not implemented yet");
      }

      default: {
        // Unknown job → mark done so it doesn't loop forever
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
    // 4) On error → set FAILED and schedule retry with backoff
    const attempts = locked.attempt ?? 1;
    const backoffSeconds = Math.min(60 * 10, Math.pow(2, attempts) * 5); // 5s,10s,20s,... cap 10m
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
