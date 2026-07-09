"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";

type Institution = {
  id: string;
  name: string;
  country: string;
  website: string | null;
  organizationId: string | null;
  _count: { courses: number };
};

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", website: "", introduction: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/institutions");
    const data = await res.json();
    setInstitutions(data.institutions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function createInstitution(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        country: form.country,
        website: form.website || undefined,
        introduction: form.introduction || undefined,
      }),
    });
    if (res.ok) {
      setForm({ name: "", country: "", website: "", introduction: "" });
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add institution");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Institutions</h1>
          <p className="mt-1 text-sm text-slate-500">Your institution catalog, plus any shared entries from the platform.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Institution
        </button>
      </div>

      {showForm && (
        <form onSubmit={createInstitution} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <input required placeholder="Institution name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select required value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input placeholder="Website (https://...)" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <textarea placeholder="University introduction / description" value={form.introduction}
            onChange={(e) => setForm({ ...form, introduction: e.target.value })}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <button type="submit" className="sm:col-span-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add institution
          </button>
        </form>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : institutions.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">No institutions yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Courses</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody>
              {institutions.map((inst) => (
                <tr key={inst.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/institutions/${inst.id}`} className="font-medium text-indigo-600 hover:underline">
                      {inst.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{inst.country}</td>
                  <td className="px-4 py-3">{inst._count.courses}</td>
                  <td className="px-4 py-3">
                    {inst.organizationId === null ? (
                      <span className="rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">Shared</span>
                    ) : (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Private</span>
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
