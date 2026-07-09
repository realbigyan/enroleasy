-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'PERSONAL_ID';
ALTER TYPE "DocumentType" ADD VALUE 'PERSONAL_ACADEMIC';
ALTER TYPE "DocumentType" ADD VALUE 'PERSONAL_ENGLISH';
ALTER TYPE "DocumentType" ADD VALUE 'PERSONAL_CV';
ALTER TYPE "DocumentType" ADD VALUE 'PERSONAL_WORK_EXPERIENCE';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_ID';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_ACADEMIC';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_ENGLISH';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_CV';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_WORK_EXPERIENCE';
ALTER TYPE "DocumentType" ADD VALUE 'SPOUSE_MARRIAGE_CERTIFICATE';
ALTER TYPE "DocumentType" ADD VALUE 'SPONSOR_ID';
ALTER TYPE "DocumentType" ADD VALUE 'SPONSOR_RELATIONSHIP';
ALTER TYPE "DocumentType" ADD VALUE 'SPONSOR_PROOF_OF_INCOME';
ALTER TYPE "DocumentType" ADD VALUE 'BANK_LOAN';
ALTER TYPE "DocumentType" ADD VALUE 'BANK_BALANCE_CERTIFICATE';
