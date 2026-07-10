/*
  Warnings:

  - Added the required column `paymentAccountId` to the `payslips` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "ssfEnrolled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "payslips" ADD COLUMN     "paymentAccountId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
