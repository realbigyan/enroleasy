-- CreateEnum
CREATE TYPE "TaxIdType" AS ENUM ('PAN', 'VAT');

-- AlterTable
ALTER TABLE "invoicers" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "bankAccountName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "bankSwift" TEXT,
ADD COLUMN     "footerEmail" TEXT,
ADD COLUMN     "footerPhone" TEXT,
ADD COLUMN     "footerWebsite" TEXT,
ADD COLUMN     "qrCodeUrl" TEXT,
ADD COLUMN     "taxIdNumber" TEXT,
ADD COLUMN     "taxIdType" "TaxIdType";
