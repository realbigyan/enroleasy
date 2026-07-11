"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, CheckSquare, X } from "lucide-react";

type Student = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  applications: { id: string }[];
  archivedAt?: string | null;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

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

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === students.length ? new Set() : new Set(students.map((s) => s.id))));
  }

  async function runBulk(body: Record<string, unknown>) {
    if (selected.size === 0) return;
    setBulkBusy(true);
    await fetch("/api/students/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), ...body }),
    });
    setBulkBusy(false);
    setSelected(new Set());
    load();
  }

  async function bulkArchive() {
    if (!confirm(`Archive ${selected.size} student(s)?`)) return;
    await runBulk({ action: "archive" });
  }

  async function bulkUnarchive() {
    await runBulk({ action: "unarchive" });
  }

  async function bulkAddTag() {
    if (!bulkTag.trim()) return;
    await runBulk({ action: "addTag", tag: bulkTag.trim() });
    setBulkTag("");
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
            onClick={toggleSelectMode}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium ${
              selectMode ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white hover:bg-slate-50"
            }`}
          >
            <CheckSquare className="h-4 w-4" /> {selectMode ? "Cancel select" : "Select"}
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New student
          </button>
        </div>
      </div>

      {selectMode && selected.size > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <span className="text-sm font-medium text-indigo-800">{selected.size} selected</span>
          <button
            onClick={bulkArchive}
            disabled={bulkBusy}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Archive
          </button>
          <button
            onClick={bulkUnarchive}
            disabled={bulkBusy}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Restore
          </button>
          <input
            placeholder="Add tag…"
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
          />
          <button
            onClick={bulkAddTag}
            disabled={bulkBusy || !bulkTag.trim()}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
          >
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      )}

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
                {selectMode && (
                  <th className="w-8 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selected.size === students.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5"
                    />
                  </th>
                )}
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Applications</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {selectMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelected(s.id)}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/students/${s.id}`} className="font-medium text-indigo-600 hover:underline">
                      {s.fullName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.email ?? s.phone ?? "—"}</td>
                  <td className="px-4 py-3">{s.applications.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
