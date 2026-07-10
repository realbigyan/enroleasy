"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ArrowLeft, Users } from "lucide-react";

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

function formatMoney(n: number) {
  return `NPR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [allowances, setAllowances] = useState("0");
  const [ssfEnrolled, setSsfEnrolled] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/accounting/employees");
    const data = await res.json();
    setEmployees(data.employees ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/accounting/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        designation: designation || undefined,
        panNumber: panNumber || undefined,
        basicSalary: Number(basicSalary),
        allowances: Number(allowances) || 0,
        ssfEnrolled,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setName("");
      setDesignation("");
      setPanNumber("");
      setBasicSalary("");
      setAllowances("0");
      setSsfEnrolled(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Could not add employee");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/accounting" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-3.5 w-3.5" /> Chart of Accounts
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">Payroll</h1>
          <p className="mt-1 text-sm text-slate-500">Staff salaries with automatic monthly TDS and Social Security Fund calculation.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="h-4 w-4" /> Add Employee
        </button>
      </div>

      {showForm && (
        <form onSubmit={createEmployee} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="PAN number (optional)" value={panNumber} onChange={(e) => setPanNumber(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="number" step="0.01" min="0" placeholder="Basic salary (monthly)" value={basicSalary}
            onChange={(e) => setBasicSalary(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="number" step="0.01" min="0" placeholder="Allowances (monthly)" value={allowances}
            onChange={(e) => setAllowances(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-3">
            <input type="checkbox" checked={ssfEnrolled} onChange={(e) => setSsfEnrolled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300" />
            Enrolled in Social Security Fund (11% employee / 20% employer contribution)
          </label>
          {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
          <button type="submit" disabled={saving}
            className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Add employee"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : employees.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No employees added yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-right">Basic Salary</th>
                <th className="px-4 py-3 text-right">Allowances</th>
                <th className="px-4 py-3 text-center">SSF</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/accounting/payroll/${e.id}`} className="flex items-center gap-2 font-medium text-indigo-600 hover:underline">
                      <Users className="h-3.5 w-3.5 text-slate-400" /> {e.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500">{e.designation ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.basicSalary)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.allowances)}</td>
                  <td className="px-4 py-2 text-center">{e.ssfEnrolled ? "Yes" : "—"}</td>
                  <td className="px-4 py-2 text-center">
                    {e.isActive ? (
                      <span className="rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700">Active</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Inactive</span>
                    )}
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
