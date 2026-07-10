/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,externalId]` on the table `leads` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[leadWebhookToken]` on the table `organizations` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MetaIntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'META_ADS';
ALTER TYPE "LeadSource" ADD VALUE 'CSV_IMPORT';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "leadWebhookToken" TEXT;

-- CreateTable
CREATE TABLE "meta_integrations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageAccessToken" TEXT NOT NULL,
    "subscribedFormIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MetaIntegrationStatus" NOT NULL DEFAULT 'CONNECTED',
    "connectedByUserId" TEXT,
    "lastLeadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meta_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "meta_integrations_organizationId_key" ON "meta_integrations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "leads_organizationId_externalId_key" ON "leads"("organizationId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_leadWebhookToken_key" ON "organizations"("leadWebhookToken");

-- AddForeignKey
ALTER TABLE "meta_integrations" ADD CONSTRAINT "meta_integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
