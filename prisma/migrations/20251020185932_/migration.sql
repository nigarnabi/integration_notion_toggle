/*
  Warnings:

  - You are about to drop the column `lastTogglAtSeen` on the `SyncState` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SyncState" DROP COLUMN "lastTogglAtSeen";
