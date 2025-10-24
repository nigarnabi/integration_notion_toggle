/*
  Warnings:

  - Made the column `togglTimeEntryId` on table `TimeEntryLink` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TimeEntryLink" ALTER COLUMN "togglTimeEntryId" SET NOT NULL;
