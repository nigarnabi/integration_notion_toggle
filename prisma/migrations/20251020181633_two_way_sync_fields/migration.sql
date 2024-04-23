/*
  Warnings:

  - A unique constraint covering the columns `[userId,togglTimeEntryId]` on the table `TimeEntryLink` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "SyncState" ADD COLUMN     "lastTogglAtSeen" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskMapping" ADD COLUMN     "togglWorkspaceId" INTEGER;

-- AlterTable
ALTER TABLE "TimeEntryLink" ADD COLUMN     "descriptionSnapshot" TEXT,
ADD COLUMN     "togglProjectId" TEXT,
ADD COLUMN     "togglTaskId" TEXT,
ADD COLUMN     "togglUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "togglWorkspaceId" INTEGER;

-- CreateIndex
CREATE INDEX "TaskMapping_userId_togglWorkspaceId_idx" ON "TaskMapping"("userId", "togglWorkspaceId");

-- CreateIndex
CREATE INDEX "TimeEntryLink_userId_notionTaskPageId_status_idx" ON "TimeEntryLink"("userId", "notionTaskPageId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TimeEntryLink_userId_togglTimeEntryId_key" ON "TimeEntryLink"("userId", "togglTimeEntryId");
