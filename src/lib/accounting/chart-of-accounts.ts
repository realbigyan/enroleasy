import { prisma } from "@/lib/prisma";
import type { AccountType } from "@prisma/client";

// Default Nepal-oriented chart of accounts for a service business
// (consultancy). Includes the compliance-specific accounts a Nepal SME
// needs — VAT input/output, TDS payable, SSF payable — alongside the usual
// asset/liability/equity/income/expense groups. Seeded per organization on
// first use; every account is fully editable/deletable afterwards (isSystem
// only marks it as a seeded default, it doesn't lock it).
type DefaultAccount = { code: string; name: string; type: AccountType; parentCode?: string };

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets
  { code: "1000", name: "Current Assets", type: "ASSET" },
  { code: "1010", name: "Cash in Hand", type: "ASSET", parentCode: "1000" },
  { code: "1020", name: "Bank Accounts", type: "ASSET", parentCode: "1000" },
  { code: "1030", name: "Accounts Receivable", type: "ASSET", parentCode: "1000" },
  { code: "1040", name: "VAT Receivable (Input VAT)", type: "ASSET", parentCode: "1000" },
  { code: "1050", name: "Advances & Deposits", type: "ASSET", parentCode: "1000" },
  { code: "1100", name: "Fixed Assets", type: "ASSET" },
  { code: "1110", name: "Office Equipment", type: "ASSET", parentCode: "1100" },
  { code: "1120", name: "Furniture & Fixtures", type: "ASSET", parentCode: "1100" },
  { code: "1130", name: "Computers & IT Equipment", type: "ASSET", parentCode: "1100" },
  { code: "1140", name: "Accumulated Depreciation", type: "ASSET", parentCode: "1100" },

  // Liabilities
  { code: "2000", name: "Current Liabilities", type: "LIABILITY" },
  { code: "2010", name: "Accounts Payable", type: "LIABILITY", parentCode: "2000" },
  { code: "2020", name: "VAT Payable (Output VAT)", type: "LIABILITY", parentCode: "2000" },
  { code: "2030", name: "TDS Payable", type: "LIABILITY", parentCode: "2000" },
  { code: "2040", name: "Salary Payable", type: "LIABILITY", parentCode: "2000" },
  { code: "2050", name: "SSF Payable", type: "LIABILITY", parentCode: "2000" },
  { code: "2100", name: "Long-Term Liabilities", type: "LIABILITY" },
  { code: "2110", name: "Loans Payable", type: "LIABILITY", parentCode: "2100" },

  // Equity
  { code: "3000", name: "Equity", type: "EQUITY" },
  { code: "3010", name: "Owner's Capital", type: "EQUITY", parentCode: "3000" },
  { code: "3020", name: "Retained Earnings", type: "EQUITY", parentCode: "3000" },
  { code: "3030", name: "Drawings", type: "EQUITY", parentCode: "3000" },

  // Income
  { code: "4000", name: "Income", type: "INCOME" },
  { code: "4010", name: "Tuition / Test-Prep Fees", type: "INCOME", parentCode: "4000" },
  { code: "4020", name: "Consultancy / Application Service Fees", type: "INCOME", parentCode: "4000" },
  { code: "4030", name: "Commission Income", type: "INCOME", parentCode: "4000" },
  { code: "4040", name: "Other Income", type: "INCOME", parentCode: "4000" },

  // Expenses
  { code: "5000", name: "Operating Expenses", type: "EXPENSE" },
  { code: "5010", name: "Salary & Wages", type: "EXPENSE", parentCode: "5000" },
  { code: "5020", name: "Rent Expense", type: "EXPENSE", parentCode: "5000" },
  { code: "5030", name: "Utilities", type: "EXPENSE", parentCode: "5000" },
  { code: "5040", name: "Marketing & Advertising", type: "EXPENSE", parentCode: "5000" },
  { code: "5050", name: "Office Supplies", type: "EXPENSE", parentCode: "5000" },
  { code: "5060", name: "Professional / Consultancy Fees", type: "EXPENSE", parentCode: "5000" },
  { code: "5070", name: "Bank Charges", type: "EXPENSE", parentCode: "5000" },
  { code: "5080", name: "Depreciation Expense", type: "EXPENSE", parentCode: "5000" },
  { code: "5090", name: "Travel & Transportation", type: "EXPENSE", parentCode: "5000" },
  { code: "5100", name: "Miscellaneous Expense", type: "EXPENSE", parentCode: "5000" },
];

/**
 * Seeds the default chart of accounts for an organization. Idempotent —
 * safe to call every time the accounting section loads: existing accounts
 * (matched by [organizationId, code]) are left untouched, only missing ones
 * are created. Parents are created before children so parentId can resolve.
 */
export async function seedChartOfAccounts(organizationId: string): Promise<void> {
  const existing = await prisma.account.findMany({
    where: { organizationId },
    select: { code: true, id: true },
  });
  const existingCodes = new Set(existing.map((a: { code: string; id: string }) => a.code));
  const codeToId = new Map(existing.map((a: { code: string; id: string }) => [a.code, a.id]));

  // Parents (no parentCode) first, then children — DEFAULT_CHART_OF_ACCOUNTS
  // is already ordered that way, but sort defensively in case it's edited.
  const ordered = [...DEFAULT_CHART_OF_ACCOUNTS].sort((a, b) => (a.parentCode ? 1 : 0) - (b.parentCode ? 1 : 0));

  for (const def of ordered) {
    if (existingCodes.has(def.code)) continue;
    const parentId = def.parentCode ? codeToId.get(def.parentCode) ?? null : null;
    const created = await prisma.account.create({
      data: {
        organizationId,
        code: def.code,
        name: def.name,
        type: def.type,
        parentId,
        isSystem: true,
      },
    });
    codeToId.set(def.code, created.id);
    existingCodes.add(def.code);
  }
}
