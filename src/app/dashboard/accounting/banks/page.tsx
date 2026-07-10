"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, Landmark, Wallet } from "lucide-react";

type BankAccount = {
  id: string;
  name: string;
  kind: "BANK" | "CASH";
  accountNumber: string | null;
  bankName: string | null;
  currency: string;
  isActive: boolean;
  balance: number;
};

function formatMoney(n: number, currency: string) {
  const sign = n < 0 ? "-" : "";
  return `${sign}${currency} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BanksPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", kind: "BANK" as "BANK" | "CASH", accountNumber: "", bankName: "", currency: "NPR", openingBalance: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/accounting/bank-accounts");
    const data = await res.json();
    setAccounts(data.bankAccounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounting/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        kind: form.kind,
        accountNumber: form.accountNumber || undefined,
        bankName: form.bankName || undefined,
        currency: form.currency,
        openingBalance: Number(form.openingBalance) || 0,
      }),
    });
    if (res.ok) {
      setForm({ name: "", kind: "BANK", accountNumber: "", bankName: "", currency: "NPR", openingBalance: "" });
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add bank account");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Bank & Cash Accounts</h1>
          <p className="mt-1 text-sm text-slate-500">Each account is backed by its own ledger account, so balances always tie to the books.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Account
        </button>
      </div>

      {showForm && (
        <form onSubmit={createAccount} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Account name (e.g. NIC Asia - Operating)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "BANK" | "CASH" })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
          </select>
          <input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          {form.kind === "BANK" && (
            <>
              <input placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <input placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </>
          )}
          <input type="number" step="0.01" placeholder="Opening balance" value={form.openingBalance}
            onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add account
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No bank or cash accounts yet.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {accounts.map((a) => (
            <Link key={a.id} href={`/dashboard/accounting/banks/${a.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-indigo-300">
              <div className="flex items-center gap-3">
                {a.kind === "CASH" ? <Wallet className="h-5 w-5 text-slate-400" /> : <Landmark className="h-5 w-5 text-slate-400" />}
                <div>
                  <p className="font-medium text-slate-800">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.bankName ? `${a.bankName} · ` : ""}{a.accountNumber ?? (a.kind === "CASH" ? "Cash" : "")}</p>
                </div>
              </div>
              <p className="tabular-nums font-semibold">{formatMoney(a.balance, a.currency)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
