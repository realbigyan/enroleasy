"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { INSTITUTION_TYPES, INSTITUTION_TYPE_LABELS, type InstitutionTypeValue } from "@/lib/institution-types";

type Institution = {
  id: string;
  name: string;
  country: string;
  type: InstitutionTypeValue | null;
  website: string | null;
  organizationId: string | null;
  _count: { courses: number };
};

type RankingRow = { scope: string; rank: string; source: string };

const DEFAULT_RANKINGS: RankingRow[] = [
  { scope: "Global", rank: "", source: "" },
  { scope: "Country", rank: "", source: "" },
];

export default function InstitutionsPage() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [form, setForm] = useState({
    name: "",
    country: "",
    website: "",
    introduction: "",
    isGlobal: false,
    type: "" as InstitutionTypeValue | "",
    locations: [] as string[],
  });
  const [locationInput, setLocationInput] = useState("");
  const [rankings, setRankings] = useState<RankingRow[]>(DEFAULT_RANKINGS);

  async function load() {
    setLoading(true);
    const [instRes, meRes] = await Promise.all([fetch("/api/institutions"), fetch("/api/auth/me")]);
    const data = await instRes.json();
    const me = await meRes.json().catch(() => ({}));
    setInstitutions(data.institutions ?? []);
    setIsSuperAdmin(!!me.isSuperAdmin);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  useEffect(() => {
    // Superadmins are almost always adding to the shared catalog, not a
    // private one-off — default the checkbox to checked for them.
    if (isSuperAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deriving a default from a value fetched on mount
      setForm((f) => (f.isGlobal ? f : { ...f, isGlobal: true }));
    }
  }, [isSuperAdmin]);

  function addLocation() {
    const v = locationInput.trim();
    if (!v) return;
    setForm((f) => ({ ...f, locations: [...f.locations, v] }));
    setLocationInput("");
  }

  function removeLocation(idx: number) {
    setForm((f) => ({ ...f, locations: f.locations.filter((_, i) => i !== idx) }));
  }

  function updateRanking(idx: number, patch: Partial<RankingRow>) {
    setRankings((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeRanking(idx: number) {
    setRankings((rows) => rows.filter((_, i) => i !== idx));
  }

  async function createInstitution(e: React.FormEvent) {
    e.preventDefault();
    const validRankings = rankings
      .filter((r) => r.scope.trim() && r.rank && r.source.trim())
      .map((r) => ({ scope: r.scope.trim(), rank: Number(r.rank), source: r.source.trim() }));
    const res = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        country: form.country,
        locations: form.locations,
        type: form.type || undefined,
        website: form.website || undefined,
        introduction: form.introduction || undefined,
        isGlobal: form.isGlobal,
        rankings: validRankings,
      }),
    });
    if (res.ok) {
      setForm({ name: "", country: "", website: "", introduction: "", isGlobal: isSuperAdmin, type: "", locations: [] });
      setLocationInput("");
      setRankings(DEFAULT_RANKINGS);
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
          <select value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as InstitutionTypeValue | "" })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Institution type (optional)</option>
            {INSTITUTION_TYPES.map((t) => (
              <option key={t} value={t}>{INSTITUTION_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input placeholder="Website (https://...)" value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Locations (campuses/cities)</label>
            <div className="mt-1 flex gap-2">
              <input placeholder="e.g. Auckland" value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={addLocation}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
                Add
              </button>
            </div>
            {form.locations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {form.locations.map((loc, i) => (
                  <span key={i} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {loc}
                    <button type="button" onClick={() => removeLocation(i)} className="text-slate-400 hover:text-slate-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <textarea placeholder="University introduction / description" value={form.introduction}
            onChange={(e) => setForm({ ...form, introduction: e.target.value })}
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Rankings</label>
            <div className="mt-1 space-y-2">
              {rankings.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="Scope (e.g. Global, Country)" value={r.scope}
                    onChange={(e) => updateRanking(i, { scope: e.target.value })}
                    className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input placeholder="Rank #" type="number" min={1} value={r.rank}
                    onChange={(e) => updateRanking(i, { rank: e.target.value })}
                    className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input placeholder="Source (e.g. QS World Rankings 2026)" value={r.source}
                    onChange={(e) => updateRanking(i, { source: e.target.value })}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeRanking(i)}
                    className="rounded-md border border-slate-300 px-2 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setRankings((rows) => [...rows, { scope: "", rank: "", source: "" }])}
              className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
              + Add ranking
            </button>
          </div>

          {isSuperAdmin && (
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
              <input type="checkbox" checked={form.isGlobal}
                onChange={(e) => setForm({ ...form, isGlobal: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300" />
              Add to shared global catalog (visible to every consultancy on the platform)
            </label>
          )}
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
                <th className="px-4 py-3">Type</th>
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
                  <td className="px-4 py-3 text-slate-600">{inst.type ? INSTITUTION_TYPE_LABELS[inst.type] : "—"}</td>
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
