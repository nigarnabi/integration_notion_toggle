-- AlterTable
ALTER TABLE "User" ADD COLUMN     "togglLastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "toggleApiKeyEnc" TEXT;
