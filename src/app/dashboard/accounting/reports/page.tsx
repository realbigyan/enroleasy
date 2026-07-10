"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AccountBalanceRow = { id: string; code: string; name: string; type: string; debit: number; credit: number; balance: number };

type TrialBalance = { fiscalYear: string; asOfDate: string; rows: AccountBalanceRow[]; totalDebit: number; totalCredit: number };
type ProfitLoss = {
  fiscalYear: string;
  income: AccountBalanceRow[];
  expense: AccountBalanceRow[];
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
};
type BalanceSheet = {
  fiscalYear: string;
  asOfDate: string;
  assets: AccountBalanceRow[];
  liabilities: AccountBalanceRow[];
  equity: AccountBalanceRow[];
  retainedEarningsCumulative: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
};
type VatSummary = {
  fiscalYear: string;
  inputVat: number;
  outputVat: number;
  netVatPayable: number;
  inputVatDetail: { id: string; date: string; description: string; vendor: string | null; amount: number; vatAmount: number }[];
};
type TdsSummary = { fiscalYear: string; total: number; byCategory: { sourceType: string; label: string; total: number; count: number }[] };

const TABS = [
  { key: "trial-balance", label: "Trial Balance" },
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "vat-summary", label: "VAT Summary" },
  { key: "tds-summary", label: "TDS Summary" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}NPR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString();
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>("trial-balance");
  const [fiscalYear, setFiscalYear] = useState("");
  const [knownYears, setKnownYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [vatSummary, setVatSummary] = useState<VatSummary | null>(null);
  const [tdsSummary, setTdsSummary] = useState<TdsSummary | null>(null);

  async function loadYears() {
    const res = await fetch("/api/accounting/fiscal-years");
    const data = await res.json();
    setKnownYears(data.fiscalYears ?? []);
    setFiscalYear((prev) => prev || data.currentFiscalYear || "");
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    loadYears();
  }, []);

  async function loadReport() {
    if (!fiscalYear) return;
    setLoading(true);
    const qs = `?fiscalYear=${encodeURIComponent(fiscalYear)}`;
    if (tab === "trial-balance") setTrialBalance(await (await fetch(`/api/accounting/reports/trial-balance${qs}`)).json());
    if (tab === "profit-loss") setProfitLoss(await (await fetch(`/api/accounting/reports/profit-loss${qs}`)).json());
    if (tab === "balance-sheet") setBalanceSheet(await (await fetch(`/api/accounting/reports/balance-sheet${qs}`)).json());
    if (tab === "vat-summary") setVatSummary(await (await fetch(`/api/accounting/reports/vat-summary${qs}`)).json());
    if (tab === "tds-summary") setTdsSummary(await (await fetch(`/api/accounting/reports/tds-summary${qs}`)).json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when tab/fiscal year changes
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadReport is stable, only tab/fiscalYear should retrigger
  }, [tab, fiscalYear]);

  return (
    <div>
      <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
      </Link>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Nepal fiscal year (Shrawan–Ashadh), computed from the general ledger.</p>
        </div>
        <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {knownYears.map((y) => (
            <option key={y} value={y}>FY {y}</option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6">
          {tab === "trial-balance" && trialBalance && (
            <div>
              <p className="mb-3 text-xs text-slate-500">As of {formatDate(trialBalance.asOfDate)}. Total debit and total credit should always match — that&apos;s the trial balance self-check.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Account</th>
                      <th className="px-4 py-3 text-right">Debit</th>
                      <th className="px-4 py-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.rows.filter((r) => r.debit !== 0 || r.credit !== 0).map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-500">{r.code}</td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.debit > 0 ? formatMoney(r.debit) : ""}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{r.credit > 0 ? formatMoney(r.credit) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-semibold">
                      <td className="px-4 py-2" colSpan={2}>Total</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(trialBalance.totalDebit)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(trialBalance.totalCredit)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {tab === "profit-loss" && profitLoss && (
            <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <tr><th className="px-4 py-3" colSpan={2}>Income</th></tr>
                </thead>
                <tbody>
                  {profitLoss.income.length === 0 && (
                    <tr><td className="px-4 py-2 text-slate-400" colSpan={2}>No income posted this fiscal year yet.</td></tr>
                  )}
                  {profitLoss.income.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200 font-medium">
                    <td className="px-4 py-2">Total Income</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(profitLoss.totalIncome)}</td>
                  </tr>
                </tbody>
                <thead className="border-b border-t border-slate-200 bg-slate-50 text-left text-slate-500">
                  <tr><th className="px-4 py-3" colSpan={2}>Expenses</th></tr>
                </thead>
                <tbody>
                  {profitLoss.expense.map((r) => (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">{r.name}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
                    </tr>
                  ))}
                  <tr className="font-medium">
                    <td className="px-4 py-2">Total Expenses</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatMoney(profitLoss.totalExpense)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 text-base font-semibold">
                    <td className="px-4 py-3">Net Profit / (Loss)</td>
                    <td className={`px-4 py-3 text-right tabular-nums ${profitLoss.netProfit < 0 ? "text-red-600" : "text-teal-700"}`}>
                      {formatMoney(profitLoss.netProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {tab === "balance-sheet" && balanceSheet && (
            <div>
              <p className="mb-3 text-xs text-slate-500">
                As of {formatDate(balanceSheet.asOfDate)}. {balanceSheet.balanced ? "Assets = Liabilities + Equity ✓" : "Warning: does not balance — check journal entries."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold">Assets</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.assets.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td className="px-4 py-2">Total Assets</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(balanceSheet.totalAssets)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold">Liabilities & Equity</div>
                  <table className="w-full text-sm">
                    <tbody>
                      {balanceSheet.liabilities.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-slate-100 bg-slate-50 font-medium">
                        <td className="px-4 py-2">Total Liabilities</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(balanceSheet.totalLiabilities)}</td>
                      </tr>
                      {balanceSheet.equity.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2">{r.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatMoney(r.balance)}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2">Retained Earnings (Cumulative)</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(balanceSheet.retainedEarningsCumulative)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-semibold">
                        <td className="px-4 py-2">Total Equity</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(balanceSheet.totalEquity)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "vat-summary" && vatSummary && (
            <div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Input VAT (claimable)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(vatSummary.inputVat)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Output VAT (charged)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(vatSummary.outputVat)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">Net VAT Payable</p>
                  <p className={`mt-1 text-lg font-semibold tabular-nums ${vatSummary.netVatPayable < 0 ? "text-teal-700" : ""}`}>
                    {formatMoney(vatSummary.netVatPayable)}
                  </p>
                </div>
              </div>
              {vatSummary.outputVat === 0 && (
                <p className="mt-3 text-xs text-slate-500">Output VAT will populate once sales invoices are wired into the ledger.</p>
              )}
              <p className="mt-6 mb-2 text-sm font-semibold text-slate-700">Input VAT detail</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">VAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vatSummary.inputVatDetail.length === 0 && (
                      <tr><td className="px-4 py-2 text-slate-400" colSpan={5}>No VAT-invoiced expenses this fiscal year.</td></tr>
                    )}
                    {vatSummary.inputVatDetail.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2 text-slate-500">{formatDate(e.date)}</td>
                        <td className="px-4 py-2">{e.description}</td>
                        <td className="px-4 py-2 text-slate-500">{e.vendor ?? "—"}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.amount)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.vatAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "tds-summary" && tdsSummary && (
            <div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Total TDS withheld this fiscal year</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(tdsSummary.total)}</p>
              </div>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Entries</th>
                      <th className="px-4 py-3 text-right">Total TDS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tdsSummary.byCategory.length === 0 && (
                      <tr><td className="px-4 py-2 text-slate-400" colSpan={3}>No TDS withheld this fiscal year.</td></tr>
                    )}
                    {tdsSummary.byCategory.map((c) => (
                      <tr key={c.sourceType} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-2">{c.label}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{c.count}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(c.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
