"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Play } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };
type DepreciationEntry = { id: string; fiscalYear: string; amount: number };
type FixedAsset = {
  id: string;
  name: string;
  purchaseDate: string;
  cost: number;
  usefulLifeYears: number;
  salvageValue: number;
  method: "STRAIGHT_LINE" | "DIMINISHING_BALANCE";
  account: Account;
  depreciationEntries: DepreciationEntry[];
  accumulatedDepreciation: number;
  bookValue: number;
};

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [name, setName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");
  const [salvageValue, setSalvageValue] = useState("0");
  const [method, setMethod] = useState<"STRAIGHT_LINE" | "DIMINISHING_BALANCE">("STRAIGHT_LINE");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [assetRes, accRes] = await Promise.all([
      fetch("/api/accounting/fixed-assets"),
      fetch("/api/accounting/accounts"),
    ]);
    setAssets((await assetRes.json()).fixedAssets ?? []);
    setAccounts((await accRes.json()).accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const assetAccounts = accounts.filter((a) => a.type === "ASSET");
  const paymentAccounts = accounts.filter((a) => a.type === "ASSET" || a.type === "LIABILITY");

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/accounting/fixed-assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        paymentAccountId,
        name,
        purchaseDate,
        cost: Number(cost),
        usefulLifeYears: Number(usefulLifeYears),
        salvageValue: Number(salvageValue) || 0,
        method,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setAccountId("");
      setPaymentAccountId("");
      setName("");
      setPurchaseDate(new Date().toISOString().slice(0, 10));
      setCost("");
      setUsefulLifeYears("5");
      setSalvageValue("0");
      setMethod("STRAIGHT_LINE");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add fixed asset");
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this fixed asset? Its purchase and depreciation entries will also be removed.")) return;
    const res = await fetch(`/api/accounting/fixed-assets/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  async function runDepreciation() {
    setRunning(true);
    setRunResult(null);
    const res = await fetch("/api/accounting/fixed-assets/run-depreciation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setRunning(false);
    if (res.ok) {
      const data = await res.json();
      const posted = data.results.filter((r: { skipped?: string }) => !r.skipped).length;
      setRunResult(`Posted depreciation for ${posted} asset(s) in FY ${data.fiscalYear}.`);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setRunResult(data.error ?? "Could not run depreciation");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Fixed Assets</h1>
          <p className="mt-1 text-sm text-slate-500">Book depreciation (straight-line or diminishing balance) — not the same as IRD&apos;s tax depreciation pools.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runDepreciation} disabled={running}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            <Play className="h-4 w-4" /> {running ? "Running…" : "Run Depreciation"}
          </button>
          <button onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="h-4 w-4" /> Add Asset
          </button>
        </div>
      </div>

      {runResult && <p className="mt-3 text-sm text-slate-600">{runResult}</p>}

      {showForm && (
        <form onSubmit={createAsset} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
          <select required value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Asset category…</option>
            {assetAccounts.map((a) => (
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
          <input required type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="number" step="0.01" min="0" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="number" min="1" placeholder="Useful life (years)" value={usefulLifeYears}
            onChange={(e) => setUsefulLifeYears(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="0.01" min="0" placeholder="Salvage value" value={salvageValue}
            onChange={(e) => setSalvageValue(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={method} onChange={(e) => setMethod(e.target.value as "STRAIGHT_LINE" | "DIMINISHING_BALANCE")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2">
            <option value="STRAIGHT_LINE">Straight-line</option>
            <option value="DIMINISHING_BALANCE">Diminishing balance</option>
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <button type="submit" disabled={saving}
            className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Add asset"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : assets.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No fixed assets recorded yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Accum. Depreciation</th>
                <th className="px-4 py-3 text-right">Book Value</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{a.name}</td>
                  <td className="px-4 py-2 text-slate-500">{a.account.name}</td>
                  <td className="px-4 py-2 text-slate-500">{a.method === "STRAIGHT_LINE" ? "Straight-line" : "Diminishing balance"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(a.cost)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(a.accumulatedDepreciation)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatMoney(a.bookValue)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteAsset(a.id)} className="text-slate-400 hover:text-red-600">
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
