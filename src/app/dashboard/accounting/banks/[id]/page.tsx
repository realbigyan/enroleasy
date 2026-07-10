"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };
type BankAccountDetail = { id: string; name: string; currency: string; openingBalance: number; account: Account };
type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  reconciled: boolean;
  counterAccount: Account;
};

function formatMoney(n: number, currency: string) {
  const sign = n < 0 ? "-" : "";
  return `${sign}${currency} ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function BankAccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [bankAccount, setBankAccount] = useState<BankAccountDetail | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [counterAccountId, setCounterAccountId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [detailRes, accRes] = await Promise.all([
      fetch(`/api/accounting/bank-accounts/${params.id}`),
      fetch("/api/accounting/accounts"),
    ]);
    const detail = await detailRes.json();
    setBankAccount(detail.bankAccount ?? null);
    setTransactions(detail.transactions ?? []);
    setAccounts((await accRes.json()).accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount/param change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable, only params.id should retrigger
  }, [params.id]);

  async function createTransaction(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const magnitude = Number(amount);
    if (!magnitude || magnitude <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/accounting/bank-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bankAccountId: params.id,
        counterAccountId,
        date,
        description,
        amount: direction === "IN" ? magnitude : -magnitude,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setAmount("");
      setCounterAccountId("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save transaction");
    }
  }

  async function toggleReconciled(tx: Transaction) {
    await fetch(`/api/accounting/bank-transactions/${tx.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reconciled: !tx.reconciled }),
    });
    load();
  }

  async function deleteTransaction(id: string) {
    if (!confirm("Delete this transaction? Its journal entry will also be removed.")) return;
    const res = await fetch(`/api/accounting/bank-transactions/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!bankAccount) return <p className="text-sm text-slate-500">Bank account not found.</p>;

  const rows = transactions.reduce<Array<Transaction & { running: number }>>((acc, t) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].running : bankAccount.openingBalance;
    acc.push({ ...t, running: prev + t.amount });
    return acc;
  }, []);
  const balance = rows.length > 0 ? rows[rows.length - 1].running : bankAccount.openingBalance;

  return (
    <div>
      <Link href="/dashboard/accounting/banks" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Bank & Cash Accounts
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{bankAccount.name}</h1>
          <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(balance, bankAccount.currency)}</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Transaction
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTransaction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={direction} onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="IN">Deposit (in)</option>
            <option value="OUT">Withdrawal (out)</option>
          </select>
          <input required type="number" step="0.01" min="0" placeholder="Amount" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <select required value={counterAccountId} onChange={(e) => setCounterAccountId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Other side of entry…</option>
            {accounts.filter((a) => a.id !== bankAccount.account.id).map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <button type="submit" disabled={saving}
            className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save transaction"}
          </button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No transactions yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Other side</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Reconciled</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{t.description}</td>
                  <td className="px-4 py-2 text-slate-500">{t.counterAccount.name}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${t.amount < 0 ? "text-red-600" : "text-teal-700"}`}>
                    {formatMoney(t.amount, bankAccount.currency)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatMoney(t.running, bankAccount.currency)}</td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={t.reconciled} onChange={() => toggleReconciled(t)}
                      className="h-4 w-4 rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteTransaction(t.id)} className="text-slate-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
