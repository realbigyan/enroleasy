-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('REFERRAL', 'B2B_APPLICATION', 'EXAM_BODY');

-- CreateEnum
CREATE TYPE "EmergencyContactKind" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "ExamBookingStatus" AS ENUM ('BOOKED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'TRANSCRIPT', 'VISA', 'OFFER_LETTER', 'CERTIFICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "BilledToType" AS ENUM ('STUDENT', 'PARTNER');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('MANUAL', 'MEMBERSHIP', 'COMMISSION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID', 'VOID');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStage" ADD VALUE 'TRIAL_BOOKED';
ALTER TYPE "LeadStage" ADD VALUE 'TRIAL_DONE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'TRAINER';
ALTER TYPE "Role" ADD VALUE 'EXAMINER';
ALTER TYPE "Role" ADD VALUE 'CONTENT_MANAGER';
ALTER TYPE "Role" ADD VALUE 'DOCUMENTATION_OFFICER';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "referredByPartnerId" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetScore" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "countryOfBirth" TEXT,
ADD COLUMN     "currentCountry" TEXT,
ADD COLUMN     "isChurned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "referredByPartnerId" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "partners" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL DEFAULT 'REFERRAL',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "commissionPct" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "education_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "yearCompleted" INTEGER,
    "gpaOrPercentage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "education_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "kind" "EmergencyContactKind" NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "testType" "TestType" NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "center" TEXT,
    "status" "ExamBookingStatus" NOT NULL DEFAULT 'BOOKED',
    "resultDate" TIMESTAMP(3),
    "resultScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "studentId" TEXT,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT,
    "studentId" TEXT,
    "authorId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoicers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "invoicePrefix" TEXT NOT NULL,
    "receiptPrefix" TEXT,
    "logoUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoicers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoicerId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "billedToType" "BilledToType" NOT NULL,
    "studentId" TEXT,
    "partnerId" TEXT,
    "feeType" "FeeType" NOT NULL DEFAULT 'MANUAL',
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partners_organizationId_idx" ON "partners"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "emergency_contacts_studentId_kind_key" ON "emergency_contacts"("studentId", "kind");

-- CreateIndex
CREATE INDEX "exam_bookings_studentId_idx" ON "exam_bookings"("studentId");

-- CreateIndex
CREATE INDEX "documents_organizationId_studentId_idx" ON "documents"("organizationId", "studentId");

-- CreateIndex
CREATE INDEX "activity_logs_organizationId_leadId_idx" ON "activity_logs"("organizationId", "leadId");

-- CreateIndex
CREATE INDEX "activity_logs_organizationId_studentId_idx" ON "activity_logs"("organizationId", "studentId");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_entityType_entityId_idx" ON "audit_logs"("organizationId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "invoicers_organizationId_idx" ON "invoicers"("organizationId");

-- CreateIndex
CREATE INDEX "invoices_organizationId_status_idx" ON "invoices"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organizationId_invoiceNumber_key" ON "invoices"("organizationId", "invoiceNumber");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "education_records" ADD CONSTRAINT "education_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_bookings" ADD CONSTRAINT "exam_bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoicers" ADD CONSTRAINT "invoicers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoicerId_fkey" FOREIGN KEY ("invoicerId") REFERENCES "invoicers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
