"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };
type Line = { id: string; accountId: string; debit: number; credit: number; memo: string | null; account: Account };
type Entry = {
  id: string;
  date: string;
  fiscalYear: string;
  reference: string | null;
  description: string;
  sourceType: string;
  lines: Line[];
};

type LineDraft = { accountId: string; debit: string; credit: string; memo: string };

const BLANK_LINE: LineDraft = { accountId: "", debit: "", credit: "" as string, memo: "" };

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ ...BLANK_LINE }, { ...BLANK_LINE }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [accRes, entRes] = await Promise.all([fetch("/api/accounting/accounts"), fetch("/api/accounting/journal-entries")]);
    const accData = await accRes.json();
    const entData = await entRes.json();
    setAccounts(accData.accounts ?? []);
    setEntries(entData.entries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  function updateLine(idx: number, patch: Partial<LineDraft>) {
    setLines((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeLine(idx: number) {
    setLines((rows) => rows.filter((_, i) => i !== idx));
  }

  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const balanced = lines.length >= 2 && Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  async function submitEntry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!balanced) {
      setError("Entry must have at least 2 lines and debits must equal credits.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/accounting/journal-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        reference: reference || undefined,
        description,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo || undefined })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setDate(new Date().toISOString().slice(0, 10));
      setReference("");
      setDescription("");
      setLines([{ ...BLANK_LINE }, { ...BLANK_LINE }]);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not save entry");
    }
  }

  async function deleteEntry(id: string) {
    if (!confirm("Delete this journal entry?")) return;
    const res = await fetch(`/api/accounting/journal-entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not delete entry");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Journal / Ledger</h1>
          <p className="mt-1 text-sm text-slate-500">Manual double-entry transactions. Debits must equal credits on every entry.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Journal Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitEntry} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input placeholder="Reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <input required placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-1" />
          </div>

          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="flex gap-2">
                <select required value={line.accountId} onChange={(e) => updateLine(i, { accountId: e.target.value })}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm">
                  <option value="">Select account…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
                <input type="number" step="0.01" min="0" placeholder="Debit" value={line.debit}
                  onChange={(e) => updateLine(i, { debit: e.target.value, credit: e.target.value ? "" : line.credit })}
                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input type="number" step="0.01" min="0" placeholder="Credit" value={line.credit}
                  onChange={(e) => updateLine(i, { credit: e.target.value, debit: e.target.value ? "" : line.debit })}
                  className="w-32 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <input placeholder="Memo" value={line.memo} onChange={(e) => updateLine(i, { memo: e.target.value })}
                  className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length <= 2}
                  className="rounded-md border border-slate-300 px-2 text-slate-400 hover:text-slate-700 disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLines((rows) => [...rows, { ...BLANK_LINE }])}
            className="text-sm font-medium text-indigo-600 hover:underline">
            + Add line
          </button>

          <div className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-2 text-sm">
            <span>Total Debit: <strong className="tabular-nums">{formatMoney(totalDebit)}</strong></span>
            <span>Total Credit: <strong className="tabular-nums">{formatMoney(totalCredit)}</strong></span>
            <span className={balanced ? "font-medium text-teal-600" : "font-medium text-amber-600"}>
              {balanced ? "Balanced ✓" : "Not balanced"}
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={!balanced || saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save entry"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No journal entries yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map((entry) => {
            const total = entry.lines.reduce((sum, l) => sum + l.debit, 0);
            return (
              <div key={entry.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">{new Date(entry.date).toLocaleDateString()}</span>
                    <span className="font-medium">{entry.description}</span>
                    {entry.reference && <span className="text-slate-400">Ref: {entry.reference}</span>}
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{entry.fiscalYear}</span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{entry.sourceType}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-slate-600">{formatMoney(total)}</span>
                    {entry.sourceType === "MANUAL" && (
                      <button onClick={() => deleteEntry(entry.id)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {entry.lines.map((line) => (
                      <tr key={line.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-1.5 text-slate-600">{line.account.code} — {line.account.name}</td>
                        <td className="w-32 px-4 py-1.5 text-right tabular-nums text-slate-700">{line.debit > 0 ? formatMoney(line.debit) : ""}</td>
                        <td className="w-32 px-4 py-1.5 text-right tabular-nums text-slate-700">{line.credit > 0 ? formatMoney(line.credit) : ""}</td>
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
