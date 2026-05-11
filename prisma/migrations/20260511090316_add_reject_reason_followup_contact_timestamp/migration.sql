-- AlterTable
ALTER TABLE "Application" ADD COLUMN "followUpDate" DATETIME;
ALTER TABLE "Application" ADD COLUMN "rejectReason" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "lastContactedAt" DATETIME;
