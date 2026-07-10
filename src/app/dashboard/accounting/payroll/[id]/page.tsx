"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Account = { id: string; code: string; name: string; type: string };
type Employee = {
  id: string;
  name: string;
  designation: string | null;
  panNumber: string | null;
  basicSalary: number;
  allowances: number;
  ssfEnrolled: boolean;
  isActive: boolean;
};
type Payslip = {
  id: string;
  month: number;
  fiscalYear: string;
  grossPay: number;
  ssfEmployee: number;
  ssfEmployer: number;
  taxableIncome: number;
  tdsAmount: number;
  netPay: number;
  paidAt: string | null;
};

const NEPALI_MONTHS_FISCAL_ORDER = [
  { value: 4, label: "Shrawan" },
  { value: 5, label: "Bhadra" },
  { value: 6, label: "Ashwin" },
  { value: 7, label: "Kartik" },
  { value: 8, label: "Mangsir" },
  { value: 9, label: "Poush" },
  { value: 10, label: "Magh" },
  { value: 11, label: "Falgun" },
  { value: 12, label: "Chaitra" },
  { value: 1, label: "Baishakh" },
  { value: 2, label: "Jestha" },
  { value: 3, label: "Ashadh" },
];
const MONTH_LABEL: Record<number, string> = Object.fromEntries(NEPALI_MONTHS_FISCAL_ORDER.map((m) => [m.value, m.label]));

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [fiscalYear, setFiscalYear] = useState("");
  const [month, setMonth] = useState(4);
  const [paymentAccountId, setPaymentAccountId] = useState("");

  async function load() {
    setLoading(true);
    const [detailRes, accRes] = await Promise.all([
      fetch(`/api/accounting/employees/${params.id}`),
      fetch("/api/accounting/accounts"),
    ]);
    const detail = await detailRes.json();
    setEmployee(detail.employee ?? null);
    setPayslips(detail.payslips ?? []);
    setAccounts((await accRes.json()).accounts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount/param change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable, only params.id should retrigger
  }, [params.id]);

  const cashAndBankAccounts = accounts.filter((a) => a.code.startsWith("1010") || a.code.startsWith("1020"));

  async function generatePayslip(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/accounting/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: params.id,
        paymentAccountId,
        month,
        fiscalYear: fiscalYear || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setPaymentAccountId("");
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not generate payslip");
    }
  }

  async function togglePaid(p: Payslip) {
    await fetch(`/api/accounting/payslips/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !p.paidAt }),
    });
    load();
  }

  async function deletePayslip(id: string) {
    if (!confirm("Delete this payslip? Its journal entry will also be removed.")) return;
    const res = await fetch(`/api/accounting/payslips/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!employee) return <p className="text-sm text-slate-500">Employee not found.</p>;

  return (
    <div>
      <Link href="/dashboard/accounting/payroll" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-3.5 w-3.5" /> Payroll
      </Link>
      <div className="mt-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{employee.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {employee.designation ?? "—"} · Basic {formatMoney(employee.basicSalary)} + Allowances {formatMoney(employee.allowances)}
            {employee.ssfEnrolled ? " · SSF enrolled" : ""}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Generate Payslip
        </button>
      </div>

      {showForm && (
        <form onSubmit={generatePayslip} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input placeholder="Fiscal year (e.g. 2082/83, blank = current)" value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {NEPALI_MONTHS_FISCAL_ORDER.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select required value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Pay from…</option>
            {cashAndBankAccounts.map((a) => (
              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <button type="submit" disabled={saving}
            className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Generating…" : "Generate payslip"}
          </button>
        </form>
      )}

      {payslips.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No payslips generated yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">SSF (Emp.)</th>
                <th className="px-4 py-3 text-right">TDS</th>
                <th className="px-4 py-3 text-right">Net Pay</th>
                <th className="px-4 py-3 text-center">Paid</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 font-medium">{MONTH_LABEL[p.month] ?? p.month} {p.fiscalYear}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.grossPay)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.ssfEmployee)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(p.tdsAmount)}</td>
                  <td className="px-4 py-2 text-right tabular-nums font-medium">{formatMoney(p.netPay)}</td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" checked={!!p.paidAt} onChange={() => togglePaid(p)}
                      className="h-4 w-4 rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deletePayslip(p.id)} className="text-slate-400 hover:text-red-600">
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
