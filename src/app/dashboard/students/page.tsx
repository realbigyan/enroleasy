"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

type Student = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  applications: { id: string }[];
  testAttempts: { id: string; overallBand: number | null; status: string }[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/students");
    const data = await res.json();
    setStudents(data.students ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ fullName: "", email: "", phone: "" });
    setShowForm(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{students.length} enrolled students</p>
        </div>
        <div className="flex gap-2">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- real file download, not a page route */}
          <a
            href="/api/students/export"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Export CSV
          </a>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New student
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={createStudent} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required placeholder="Full name" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button type="submit" className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add student
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
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">Latest test score</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/students/${s.id}`} className="font-medium text-indigo-600 hover:underline">
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.email ?? s.phone ?? "—"}</td>
                  <td className="px-4 py-3">{s.applications.length}</td>
                  <td className="px-4 py-3">{s.testAttempts[0]?.overallBand ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
