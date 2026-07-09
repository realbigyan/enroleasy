-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('WAITING_KEY_DOCUMENTS', 'APPLICATION', 'OFFER_RECEIVED', 'OFFER_DENIED', 'DOCUMENTATION', 'WAITING_GS_APPROVAL', 'GS_APPROVED', 'GS_REJECTED', 'WAITING_VISA_LODGEMENT', 'VISA_LODGED', 'VISA_GRANTED', 'VISA_REFUSED', 'LOST', 'OTHER');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN_ASSIST';

-- AlterTable
ALTER TABLE "activity_logs" ADD COLUMN     "applicationId" TEXT;

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "currentStage" "ApplicationStage",
ADD COLUMN     "currentStageOther" TEXT,
ADD COLUMN     "currentStageUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_organizationId_recipientId_read_idx" ON "notifications"("organizationId", "recipientId", "read");

-- CreateIndex
CREATE INDEX "activity_logs_organizationId_applicationId_idx" ON "activity_logs"("organizationId", "applicationId");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
