"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Receipt, Landmark, Boxes, Users } from "lucide-react";

type Account = {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  balance: number;
};

const TYPE_ORDER: Account["type"][] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const TYPE_LABELS: Record<Account["type"], string> = {
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}NPR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", type: "EXPENSE" as Account["type"], parentId: "", description: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/accounting/accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounting/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        type: form.type,
        parentId: form.parentId || undefined,
        description: form.description || undefined,
      }),
    });
    if (res.ok) {
      setForm({ code: "", name: "", type: "EXPENSE", parentId: "", description: "" });
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add account");
    }
  }

  const byId = new Map(accounts.map((a) => [a.id, a]));
  function depth(a: Account): number {
    let d = 0;
    let cur: Account | undefined = a;
    while (cur?.parentId) {
      cur = byId.get(cur.parentId);
      d++;
      if (d > 5) break;
    }
    return d;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Accounting</h1>
          <p className="mt-1 text-sm text-slate-500">Chart of accounts and running balances, Nepal fiscal year (Shrawan–Ashadh).</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/accounting/banks"
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Landmark className="h-4 w-4" /> Bank & Cash
          </Link>
          <Link
            href="/dashboard/accounting/expenses"
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Receipt className="h-4 w-4" /> Expenses & Vendors
          </Link>
          <Link
            href="/dashboard/accounting/fixed-assets"
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Boxes className="h-4 w-4" /> Fixed Assets
          </Link>
          <Link
            href="/dashboard/accounting/payroll"
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <Users className="h-4 w-4" /> Payroll
          </Link>
          <Link
            href="/dashboard/accounting/ledger"
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" /> Journal / Ledger
          </Link>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add Account
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createAccount} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Code (e.g. 5110)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Account name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as Account["type"] })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {TYPE_ORDER.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">No parent (top-level)</option>
            {accounts.filter((a) => a.type === form.type).map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
          <input placeholder="Description (optional)" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add account
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 space-y-6">
          {TYPE_ORDER.map((type) => {
            const rows = accounts.filter((a) => a.type === type).sort((a, b) => a.code.localeCompare(b.code));
            if (rows.length === 0) return null;
            return (
              <div key={type} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                  {TYPE_LABELS[type]}
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {rows.map((a) => (
                      <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="w-24 px-4 py-2 text-slate-500">{a.code}</td>
                        <td className="px-4 py-2" style={{ paddingLeft: `${1 + depth(a) * 1.25}rem` }}>
                          <Link href={`/dashboard/accounting/accounts/${a.id}`} className="font-medium text-indigo-600 hover:underline">
                            {a.name}
                          </Link>
                          {!a.isActive && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Inactive</span>}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatMoney(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
