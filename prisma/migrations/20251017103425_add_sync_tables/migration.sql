-- CreateEnum
CREATE TYPE "TimerOrigin" AS ENUM ('NOTION', 'TOGGL');

-- CreateEnum
CREATE TYPE "TimerStatus" AS ENUM ('RUNNING', 'STOPPED', 'ORPHANED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "TaskMapping" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notionTaskPageId" TEXT NOT NULL,
    "notionDatabaseId" TEXT,
    "togglProjectId" TEXT,
    "togglTaskId" TEXT,
    "taskNameSnapshot" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "TaskMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntryLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notionTimerPageId" TEXT NOT NULL,
    "togglTimeEntryId" TEXT,
    "mappingId" TEXT,
    "origin" "TimerOrigin" NOT NULL,
    "status" "TimerStatus" NOT NULL DEFAULT 'RUNNING',
    "startTs" TIMESTAMP(3) NOT NULL,
    "stopTs" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "TimeEntryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "payloadHash" TEXT,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncState" (
    "userId" TEXT NOT NULL,
    "lastTogglPollAt" TIMESTAMP(3),
    "lastNotionSyncAt" TIMESTAMP(3),

    CONSTRAINT "SyncState_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "TaskMapping_userId_togglTaskId_idx" ON "TaskMapping"("userId", "togglTaskId");

-- CreateIndex
CREATE INDEX "TaskMapping_userId_togglProjectId_idx" ON "TaskMapping"("userId", "togglProjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMapping_userId_notionTaskPageId_key" ON "TaskMapping"("userId", "notionTaskPageId");

-- CreateIndex
CREATE INDEX "TimeEntryLink_userId_togglTimeEntryId_idx" ON "TimeEntryLink"("userId", "togglTimeEntryId");

-- CreateIndex
CREATE INDEX "TimeEntryLink_mappingId_idx" ON "TimeEntryLink"("mappingId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryLink_userId_notionTimerPageId_key" ON "TimeEntryLink"("userId", "notionTimerPageId");

-- CreateIndex
CREATE INDEX "WebhookEvent_type_receivedAt_idx" ON "WebhookEvent"("type", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_userId_receivedAt_idx" ON "WebhookEvent"("userId", "receivedAt");

-- CreateIndex
CREATE INDEX "OutboxJob_status_nextRunAt_idx" ON "OutboxJob"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "OutboxJob_userId_idx" ON "OutboxJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxJob_idempotencyKey_key" ON "OutboxJob"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "TaskMapping" ADD CONSTRAINT "TaskMapping_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryLink" ADD CONSTRAINT "TimeEntryLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntryLink" ADD CONSTRAINT "TimeEntryLink_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "TaskMapping"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboxJob" ADD CONSTRAINT "OutboxJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncState" ADD CONSTRAINT "SyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
