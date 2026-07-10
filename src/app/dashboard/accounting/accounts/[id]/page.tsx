"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Account = {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  description: string | null;
  isActive: boolean;
};

type Line = {
  id: string;
  debit: number;
  credit: number;
  memo: string | null;
  journalEntry: { id: string; date: string; description: string; reference: string | null };
};

const DEBIT_NORMAL: Account["type"][] = ["ASSET", "EXPENSE"];

function formatMoney(n: number) {
  const sign = n < 0 ? "-" : "";
  return `${sign}NPR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AccountLedgerPage() {
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/accounting/accounts/${params.id}`);
      const data = await res.json();
      setAccount(data.account ?? null);
      setLines(data.lines ?? []);
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!account) return <p className="text-sm text-slate-500">Account not found.</p>;

  const debitNormal = DEBIT_NORMAL.includes(account.type);
  const rows = lines.reduce<Array<Line & { running: number }>>((acc, l) => {
    const prevRunning = acc.length > 0 ? acc[acc.length - 1].running : 0;
    const running = prevRunning + (debitNormal ? l.debit - l.credit : l.credit - l.debit);
    acc.push({ ...l, running });
    return acc;
  }, []);

  return (
    <div>
      <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">{account.code} — {account.name}</h1>
      {account.description && <p className="mt-1 text-sm text-slate-500">{account.description}</p>}
      <p className="mt-2 text-lg font-semibold tabular-nums">
        Balance: {formatMoney(rows.length > 0 ? rows[rows.length - 1].running : 0)}
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No transactions posted to this account yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Debit</th>
                <th className="px-4 py-3 text-right">Credit</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{new Date(l.journalEntry.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    {l.journalEntry.description}
                    {l.memo && <span className="ml-1 text-slate-400">({l.memo})</span>}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.debit > 0 ? formatMoney(l.debit) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{l.credit > 0 ? formatMoney(l.credit) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatMoney(l.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
