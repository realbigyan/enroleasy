"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };
type Vendor = { id: string; name: string; panNumber: string | null; isActive: boolean };
type Expense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  vatAmount: number;
  hasVatInvoice: boolean;
  tdsRate: number;
  tdsAmount: number;
  vendor: Vendor | null;
  account: Account;
  paymentAccount: Account;
};

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TDS_PRESETS = [
  { label: "Service with VAT invoice — 1.5%", rate: 1.5 },
  { label: "Service on PAN bill — 15%", rate: 15 },
  { label: "Rent — 10%", rate: 10 },
  { label: "Consultancy — 15%", rate: 15 },
  { label: "Commission/royalty — 15%", rate: 15 },
  { label: "None — 0%", rate: 0 },
];

export default function ExpensesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({ name: "", panNumber: "", address: "", email: "", phone: "" });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [hasVatInvoice, setHasVatInvoice] = useState(false);
  const [tdsRate, setTdsRate] = useState("1.5");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [accRes, venRes, expRes] = await Promise.all([
      fetch("/api/accounting/accounts"),
      fetch("/api/accounting/vendors"),
      fetch("/api/accounting/expenses"),
    ]);
    setAccounts((await accRes.json()).accounts ?? []);
    setVendors((await venRes.json()).vendors ?? []);
    setExpenses((await expRes.json()).expenses ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const expenseAccounts = accounts.filter((a) => a.type === "EXPENSE");
  const paymentAccounts = accounts.filter((a) => a.type === "ASSET" || a.type === "LIABILITY");

  async function createVendor(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/accounting/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: vendorForm.name,
        panNumber: vendorForm.panNumber || undefined,
        address: vendorForm.address || undefined,
        email: vendorForm.email || undefined,
        phone: vendorForm.phone || undefined,
      }),
    });
    if (res.ok) {
      setVendorForm({ name: "", panNumber: "", address: "", email: "", phone: "" });
      setShowVendorForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add vendor");
    }
  }

  const amountNum = Number(amount) || 0;
  const vatNum = Number(vatAmount) || 0;
  const tdsNum = Number(tdsRate) || 0;
  const tdsAmount = Math.round(amountNum * (tdsNum / 100) * 100) / 100;
  const netPayment = amountNum + vatNum - tdsAmount;

  async function createExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (netPayment < 0) {
      setError("TDS + VAT cannot exceed the expense amount.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/accounting/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendorId: vendorId || undefined,
        accountId,
        paymentAccountId,
        date,
        description,
        amount: amountNum,
        vatAmount: vatNum,
        hasVatInvoice,
        tdsRate: tdsNum,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowExpenseForm(false);
      setVendorId("");
      setAccountId("");
      setPaymentAccountId("");
      setDate(new Date().toISOString().slice(0, 10));
      setDescription("");
      setAmount("");
      setVatAmount("");
      setHasVatInvoice(false);
      setTdsRate("1.5");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save expense");
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense? Its journal entry will also be removed.")) return;
    const res = await fetch(`/api/accounting/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not delete expense");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Expenses & Vendors</h1>
          <p className="mt-1 text-sm text-slate-500">Recording an expense auto-posts the journal entry and computes TDS to withhold.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowVendorForm((v) => !v)}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Plus className="h-4 w-4" /> Vendor
          </button>
          <button onClick={() => setShowExpenseForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Record Expense
          </button>
        </div>
      </div>

      {showVendorForm && (
        <form onSubmit={createVendor} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Vendor name" value={vendorForm.name}
            onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="PAN number" value={vendorForm.panNumber}
            onChange={(e) => setVendorForm({ ...vendorForm, panNumber: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Address" value={vendorForm.address}
            onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Email" value={vendorForm.email}
            onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={vendorForm.phone}
            onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add vendor
          </button>
        </form>
      )}

      {showExpenseForm && (
        <form onSubmit={createExpense} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">No vendor (optional)</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

            <select required value={accountId} onChange={(e) => setAccountId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Expense category…</option>
              {expenseAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
            <select required value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="">Paid from…</option>
              {paymentAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
            <input required type="number" step="0.01" min="0" placeholder="Amount (before VAT)" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

            <input type="number" step="0.01" min="0" placeholder="VAT amount (13% if applicable)" value={vatAmount}
              onChange={(e) => setVatAmount(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={hasVatInvoice}
                onChange={(e) => {
                  setHasVatInvoice(e.target.checked);
                  setTdsRate(e.target.checked ? "1.5" : "15");
                }}
                className="h-4 w-4 rounded border-slate-300" />
              Has VAT invoice
            </label>
            <select value={tdsRate} onChange={(e) => setTdsRate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm">
              {TDS_PRESETS.map((p) => (
                <option key={p.label} value={p.rate}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-md bg-slate-50 px-4 py-2 text-sm">
            <span>TDS withheld: <strong className="tabular-nums">{formatMoney(tdsAmount)}</strong></span>
            <span>Net payment: <strong className="tabular-nums">{formatMoney(netPayment)}</strong></span>
            <span>Total (amount+VAT): <strong className="tabular-nums">{formatMoney(amountNum + vatNum)}</strong></span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save expense"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : expenses.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No expenses recorded yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{new Date(exp.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{exp.vendor?.name ?? "—"}</td>
                  <td className="px-4 py-2">{exp.description}</td>
                  <td className="px-4 py-2 text-slate-500">{exp.account.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(exp.amount + exp.vatAmount)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{exp.tdsAmount > 0 ? formatMoney(exp.tdsAmount) : "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteExpense(exp.id)} className="text-slate-400 hover:text-red-600">
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
