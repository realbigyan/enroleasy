-- CreateEnum
CREATE TYPE "TaxRegistrationType" AS ENUM ('VAT_REGISTERED', 'PAN_ONLY');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "JournalSourceType" AS ENUM ('MANUAL', 'INVOICE', 'EXPENSE', 'PAYROLL', 'DEPRECIATION', 'BANK', 'OPENING_BALANCE');

-- CreateEnum
CREATE TYPE "BankAccountKind" AS ENUM ('BANK', 'CASH');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DIMINISHING_BALANCE');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "panVatNumber" TEXT,
ADD COLUMN     "taxRegistrationType" "TaxRegistrationType";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "parentId" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT NOT NULL,
    "sourceType" "JournalSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "memo" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "panNumber" TEXT,
    "address" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorId" TEXT,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasVatInvoice" BOOLEAN NOT NULL DEFAULT false,
    "tdsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tdsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankAccountId" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "BankAccountKind" NOT NULL DEFAULT 'BANK',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reconciled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL,
    "salvageValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" TEXT NOT NULL,
    "fixedAssetId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "panNumber" TEXT,
    "designation" TEXT,
    "basicSalary" DOUBLE PRECISION NOT NULL,
    "allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "grossPay" DOUBLE PRECISION NOT NULL,
    "ssfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ssfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxableIncome" DOUBLE PRECISION NOT NULL,
    "tdsAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPay" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_organizationId_type_idx" ON "accounts"("organizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_organizationId_code_key" ON "accounts"("organizationId", "code");

-- CreateIndex
CREATE INDEX "journal_entries_organizationId_fiscalYear_idx" ON "journal_entries"("organizationId", "fiscalYear");

-- CreateIndex
CREATE INDEX "journal_entries_organizationId_date_idx" ON "journal_entries"("organizationId", "date");

-- CreateIndex
CREATE INDEX "journal_lines_accountId_idx" ON "journal_lines"("accountId");

-- CreateIndex
CREATE INDEX "vendors_organizationId_idx" ON "vendors"("organizationId");

-- CreateIndex
CREATE INDEX "expenses_organizationId_fiscalYear_idx" ON "expenses"("organizationId", "fiscalYear");

-- CreateIndex
CREATE INDEX "bank_accounts_organizationId_idx" ON "bank_accounts"("organizationId");

-- CreateIndex
CREATE INDEX "bank_transactions_bankAccountId_idx" ON "bank_transactions"("bankAccountId");

-- CreateIndex
CREATE INDEX "fixed_assets_organizationId_idx" ON "fixed_assets"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_fixedAssetId_fiscalYear_key" ON "depreciation_entries"("fixedAssetId", "fiscalYear");

-- CreateIndex
CREATE INDEX "employees_organizationId_idx" ON "employees"("organizationId");

-- CreateIndex
CREATE INDEX "payslips_organizationId_fiscalYear_idx" ON "payslips"("organizationId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employeeId_fiscalYear_month_key" ON "payslips"("employeeId", "fiscalYear", "month");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fixedAssetId_fkey" FOREIGN KEY ("fixedAssetId") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
