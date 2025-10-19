/*
  Warnings:

  - You are about to drop the column `notionTimerPageId` on the `TimeEntryLink` table. All the data in the column will be lost.
  - Added the required column `notionTaskPageId` to the `TimeEntryLink` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."TimeEntryLink_userId_notionTimerPageId_key";

-- AlterTable
ALTER TABLE "TimeEntryLink" DROP COLUMN "notionTimerPageId",
ADD COLUMN     "notionTaskPageId" TEXT NOT NULL;
