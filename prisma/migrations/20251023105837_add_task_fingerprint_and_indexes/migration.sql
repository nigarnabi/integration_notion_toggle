-- AlterTable
ALTER TABLE "TaskMapping" ADD COLUMN     "matchFingerprint" TEXT;

-- CreateIndex
CREATE INDEX "TaskMapping_userId_matchFingerprint_idx" ON "TaskMapping"("userId", "matchFingerprint");

-- CreateIndex
CREATE INDEX "TimeEntryLink_userId_togglUpdatedAt_idx" ON "TimeEntryLink"("userId", "togglUpdatedAt");

-- CreateIndex
CREATE INDEX "TimeEntryLink_userId_togglWorkspaceId_status_idx" ON "TimeEntryLink"("userId", "togglWorkspaceId", "status");
