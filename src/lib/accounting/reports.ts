import { prisma } from "@/lib/prisma";
import type { AccountType } from "@prisma/client";

// Shared balance-computation helpers for the financial reports (trial
// balance, P&L, balance sheet, VAT/TDS summaries). Debit-normal account
// types (ASSET, EXPENSE) show balance = debit - credit; credit-normal types
// (LIABILITY, EQUITY, INCOME) show balance = credit - debit. Same
// convention as the chart-of-accounts balance shown in the main ledger.
export const DEBIT_NORMAL_TYPES = new Set(["ASSET", "EXPENSE"]);

export function normalizedBalance(type: AccountType, debit: number, credit: number): number {
  return DEBIT_NORMAL_TYPES.has(type) ? debit - credit : credit - debit;
}

export type AccountBalanceRow = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  debit: number;
  credit: number;
  balance: number;
};

/**
 * Cumulative account balances from inception through `asOfDate` (inclusive)
 * — the basis for the trial balance and balance sheet, which are permanent
 * snapshots rather than period figures.
 */
export async function getAccountBalancesAsOf(organizationId: string, asOfDate: Date): Promise<AccountBalanceRow[]> {
  const accounts = await prisma.account.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
  });
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { account: { organizationId }, journalEntry: { date: { lte: asOfDate } } },
    _sum: { debit: true, credit: true },
  });
  type SumRow = { debit: number | null; credit: number | null };
  const sumByAccount = new Map<string, SumRow>(sums.map((s: { accountId: string; _sum: SumRow }) => [s.accountId, s._sum]));
  return accounts.map((a: { id: string; code: string; name: string; type: AccountType }) => {
    const sum = sumByAccount.get(a.id);
    const debit = sum?.debit ?? 0;
    const credit = sum?.credit ?? 0;
    return { id: a.id, code: a.code, name: a.name, type: a.type, debit, credit, balance: normalizedBalance(a.type, debit, credit) };
  });
}

/**
 * Account balances for activity posted within a single fiscal year only
 * (using JournalEntry.fiscalYear directly) — the basis for the P&L and the
 * VAT/TDS summaries, which report on one year's movement, not a cumulative
 * balance.
 */
export async function getAccountBalancesForFiscalYear(organizationId: string, fiscalYear: string): Promise<AccountBalanceRow[]> {
  const accounts = await prisma.account.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
  });
  const sums = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { account: { organizationId }, journalEntry: { fiscalYear } },
    _sum: { debit: true, credit: true },
  });
  type SumRow = { debit: number | null; credit: number | null };
  const sumByAccount = new Map<string, SumRow>(sums.map((s: { accountId: string; _sum: SumRow }) => [s.accountId, s._sum]));
  return accounts.map((a: { id: string; code: string; name: string; type: AccountType }) => {
    const sum = sumByAccount.get(a.id);
    const debit = sum?.debit ?? 0;
    const credit = sum?.credit ?? 0;
    return { id: a.id, code: a.code, name: a.name, type: a.type, debit, credit, balance: normalizedBalance(a.type, debit, credit) };
  });
}
