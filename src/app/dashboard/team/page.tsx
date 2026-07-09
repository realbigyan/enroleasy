"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

const ROLES = ["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "TRAINER", "EXAMINER", "CONTENT_MANAGER", "DOCUMENTATION_OFFICER"] as const;

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: (typeof ROLES)[number];
  isActive: boolean;
};

export default function TeamPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "COUNSELOR" as (typeof ROLES)[number], password: "" });
  const [lastTempPassword, setLastTempPassword] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/team");
    const data = await res.json();
    setStaff(data.staff ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", email: "", role: "COUNSELOR", password: "" });
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add staff member");
    }
  }

  async function changeRole(id: string, role: string) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, role: role as StaffMember["role"] } : s)));
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
  }

  async function toggleActive(id: string, isActive: boolean) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
    await fetch(`/api/team/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
  }

  async function resetPassword(id: string) {
    if (!confirm("Reset this person's password?")) return;
    const res = await fetch(`/api/team/${id}/reset-password`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setLastTempPassword(data.tempPassword);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Team Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage staff accounts and roles.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Staff
        </button>
      </div>

      {lastTempPassword && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          New temporary password: <span className="font-mono font-semibold">{lastTempPassword}</span> — share this with them securely, it won&apos;t be shown again.
        </div>
      )}

      {showForm && (
        <form onSubmit={addStaff} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
          <input required placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as (typeof ROLES)[number] })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {ROLES.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
          <input required type="password" minLength={8} placeholder="Temporary password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add staff member
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={s.role}
                      disabled={s.role === "OWNER"}
                      onChange={(e) => changeRole(s.id, e.target.value)}
                      className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                      {s.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => resetPassword(s.id)} className="font-medium text-indigo-600 hover:underline">Reset PW</button>
                      {s.role !== "OWNER" && (
                        <button onClick={() => toggleActive(s.id, s.isActive)} className="font-medium text-slate-500 hover:underline">
                          {s.isActive ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </div>
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
