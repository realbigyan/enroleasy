/*
  Warnings:

  - A unique constraint covering the columns `[accountId]` on the table `bank_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accountId` to the `bank_accounts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `counterAccountId` to the `bank_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "accountId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "counterAccountId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_accountId_key" ON "bank_accounts"("accountId");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_counterAccountId_fkey" FOREIGN KEY ("counterAccountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
