/*
  Warnings:

  - Added the required column `paymentAccountId` to the `fixed_assets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "JournalSourceType" ADD VALUE 'FIXED_ASSET';

-- AlterTable
ALTER TABLE "fixed_assets" ADD COLUMN     "paymentAccountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
