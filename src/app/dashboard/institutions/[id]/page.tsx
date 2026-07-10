"use client";

import { useEffect, useState, use } from "react";
import { Plus, X } from "lucide-react";
import { INSTITUTION_TYPES, INSTITUTION_TYPE_LABELS, type InstitutionTypeValue } from "@/lib/institution-types";

type LanguageTestType = "IELTS" | "PTE" | "DUOLINGO" | "MOI" | "NOT_REQUIRED";

type Course = {
  id: string;
  name: string;
  level: string | null;
  durationMonths: number | null;
  feeAmount: number | null;
  feeCurrency: string;
  careerOutcomes: string | null;
  description: string | null;
  minGpaPercent: number | null;
  maxGapYears: number | null;
  languageTestType: LanguageTestType;
  languageMinScore: number | null;
};

type Ranking = { id: string; scope: string; rank: number; source: string };

type Institution = {
  id: string;
  name: string;
  country: string;
  type: InstitutionTypeValue | null;
  locations: string[];
  website: string | null;
  introduction: string | null;
  organizationId: string | null;
  courses: Course[];
  rankings: Ranking[];
};

type RankingRow = { scope: string; rank: string; source: string };

const LANGUAGE_OPTIONS: LanguageTestType[] = ["IELTS", "PTE", "DUOLINGO", "MOI", "NOT_REQUIRED"];

const emptyCourseForm = {
  name: "",
  level: "",
  durationMonths: "",
  feeAmount: "",
  feeCurrency: "USD",
  careerOutcomes: "",
  description: "",
  minGpaPercent: "",
  maxGapYears: "",
  languageTestType: "NOT_REQUIRED" as LanguageTestType,
  languageMinScore: "",
};

function toRankingRows(rankings: Ranking[]): RankingRow[] {
  return rankings.length > 0
    ? rankings.map((r) => ({ scope: r.scope, rank: String(r.rank), source: r.source }))
    : [{ scope: "Global", rank: "", source: "" }, { scope: "Country", rank: "", source: "" }];
}

export default function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCourseForm);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [makingGlobal, setMakingGlobal] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [editType, setEditType] = useState<InstitutionTypeValue | "">("");
  const [editLocations, setEditLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [editRankings, setEditRankings] = useState<RankingRow[]>([]);

  async function load() {
    setLoading(true);
    const [instRes, meRes] = await Promise.all([fetch(`/api/institutions/${id}`), fetch("/api/auth/me")]);
    const data = await instRes.json();
    const me = await meRes.json().catch(() => ({}));
    const inst: Institution | null = data.institution ?? null;
    setInstitution(inst);
    setIsSuperAdmin(!!me.isSuperAdmin);
    if (inst) {
      setEditType(inst.type ?? "");
      setEditLocations(inst.locations ?? []);
      setEditRankings(toRankingRows(inst.rankings ?? []));
    }
    setLoading(false);
  }

  async function makeGlobal() {
    setMakingGlobal(true);
    try {
      const res = await fetch(`/api/institutions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ makeGlobal: true }),
      });
      if (res.ok) {
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not add to shared catalog");
      }
    } finally {
      setMakingGlobal(false);
    }
  }

  function addEditLocation() {
    const v = locationInput.trim();
    if (!v) return;
    setEditLocations((locs) => [...locs, v]);
    setLocationInput("");
  }

  function removeEditLocation(idx: number) {
    setEditLocations((locs) => locs.filter((_, i) => i !== idx));
  }

  function updateEditRanking(idx: number, patch: Partial<RankingRow>) {
    setEditRankings((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function removeEditRanking(idx: number) {
    setEditRankings((rows) => rows.filter((_, i) => i !== idx));
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const validRankings = editRankings
        .filter((r) => r.scope.trim() && r.rank && r.source.trim())
        .map((r) => ({ scope: r.scope.trim(), rank: Number(r.rank), source: r.source.trim() }));
      const res = await fetch(`/api/institutions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: editType || null,
          locations: editLocations,
          rankings: validRankings,
        }),
      });
      if (res.ok) {
        setEditingDetails(false);
        load();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Could not save changes");
      }
    } finally {
      setSavingDetails(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is stable per render, only id should re-trigger
  }, [id]);

  async function addCourse(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institutionId: id,
        name: form.name,
        level: form.level || undefined,
        durationMonths: form.durationMonths ? Number(form.durationMonths) : undefined,
        feeAmount: form.feeAmount ? Number(form.feeAmount) : undefined,
        feeCurrency: form.feeCurrency,
        careerOutcomes: form.careerOutcomes || undefined,
        description: form.description || undefined,
        minGpaPercent: form.minGpaPercent ? Number(form.minGpaPercent) : undefined,
        maxGapYears: form.maxGapYears ? Number(form.maxGapYears) : undefined,
        languageTestType: form.languageTestType,
        languageMinScore: form.languageMinScore ? Number(form.languageMinScore) : undefined,
      }),
    });
    if (res.ok) {
      setForm(emptyCourseForm);
      setShowForm(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Could not add course");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!institution) return <p className="text-sm text-slate-500">Institution not found.</p>;

  const needsScore = form.languageTestType !== "NOT_REQUIRED" && form.languageTestType !== "MOI";
  const canEditDetails = isSuperAdmin || institution.organizationId !== null;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{institution.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {institution.country}
            {institution.type && ` · ${INSTITUTION_TYPE_LABELS[institution.type]}`}
          </p>
          {institution.locations.length > 0 && (
            <p className="mt-1 text-xs text-slate-400">Locations: {institution.locations.join(", ")}</p>
          )}
          {institution.website && (
            <a href={institution.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-indigo-600 hover:underline">
              {institution.website}
            </a>
          )}
          {institution.introduction && <p className="mt-2 max-w-2xl text-sm text-slate-600">{institution.introduction}</p>}

          {institution.rankings.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {institution.rankings.map((r) => (
                <span key={r.id} className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700">
                  {r.scope} #{r.rank} <span className="text-indigo-400">({r.source})</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {institution.organizationId === null ? (
            <span className="rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">Shared catalog</span>
          ) : (
            isSuperAdmin && (
              <button
                onClick={makeGlobal}
                disabled={makingGlobal}
                className="rounded-md border border-teal-600 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
              >
                {makingGlobal ? "Adding…" : "Add to shared catalog"}
              </button>
            )
          )}
          {canEditDetails && !editingDetails && (
            <button
              onClick={() => setEditingDetails(true)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Edit type / locations / rankings
            </button>
          )}
        </div>
      </div>

      {editingDetails && (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          <select value={editType}
            onChange={(e) => setEditType(e.target.value as InstitutionTypeValue | "")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">Institution type (optional)</option>
            {INSTITUTION_TYPES.map((t) => (
              <option key={t} value={t}>{INSTITUTION_TYPE_LABELS[t]}</option>
            ))}
          </select>

          <div>
            <label className="block text-xs font-medium text-slate-500">Locations (campuses/cities)</label>
            <div className="mt-1 flex gap-2">
              <input placeholder="e.g. Auckland" value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEditLocation(); } }}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" onClick={addEditLocation}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
                Add
              </button>
            </div>
            {editLocations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {editLocations.map((loc, i) => (
                  <span key={i} className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {loc}
                    <button type="button" onClick={() => removeEditLocation(i)} className="text-slate-400 hover:text-slate-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500">Rankings</label>
            <div className="mt-1 space-y-2">
              {editRankings.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="Scope (e.g. Global, Country)" value={r.scope}
                    onChange={(e) => updateEditRanking(i, { scope: e.target.value })}
                    className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input placeholder="Rank #" type="number" min={1} value={r.rank}
                    onChange={(e) => updateEditRanking(i, { rank: e.target.value })}
                    className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <input placeholder="Source (e.g. QS World Rankings 2026)" value={r.source}
                    onChange={(e) => updateEditRanking(i, { source: e.target.value })}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                  <button type="button" onClick={() => removeEditRanking(i)}
                    className="rounded-md border border-slate-300 px-2 text-slate-400 hover:text-slate-700">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setEditRankings((rows) => [...rows, { scope: "", rank: "", source: "" }])}
              className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
              + Add ranking
            </button>
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <button onClick={saveDetails} disabled={savingDetails}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
            <button onClick={() => { setEditingDetails(false); setEditType(institution.type ?? ""); setEditLocations(institution.locations); setEditRankings(toRankingRows(institution.rankings)); }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Courses</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>

      {showForm && (
        <form onSubmit={addCourse} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
          <input required placeholder="Course name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="Level (e.g. Postgraduate)" value={form.level}
            onChange={(e) => setForm({ ...form, level: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <input placeholder="Duration (months)" type="number" value={form.durationMonths}
            onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Fee amount" type="number" step="0.01" value={form.feeAmount}
            onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Currency" value={form.feeCurrency}
            onChange={(e) => setForm({ ...form, feeCurrency: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

          <textarea placeholder="Career outcomes" value={form.careerOutcomes}
            onChange={(e) => setForm({ ...form, careerOutcomes: e.target.value })}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
          <textarea placeholder="Course description" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />

          <p className="sm:col-span-3 -mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Entry requirements</p>
          <input placeholder="Min GPA / Percentage" type="number" step="0.01" value={form.minGpaPercent}
            onChange={(e) => setForm({ ...form, minGpaPercent: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input placeholder="Max gap (years)" type="number" value={form.maxGapYears}
            onChange={(e) => setForm({ ...form, maxGapYears: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <select value={form.languageTestType}
            onChange={(e) => setForm({ ...form, languageTestType: e.target.value as LanguageTestType })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            {LANGUAGE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
          {needsScore && (
            <input required placeholder="Min score required" type="number" step="0.1" value={form.languageMinScore}
              onChange={(e) => setForm({ ...form, languageMinScore: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3" />
          )}

          <button type="submit" className="sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Add course
          </button>
        </form>
      )}

      {institution.courses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No courses added yet.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Entry requirements</th>
              </tr>
            </thead>
            <tbody>
              {institution.courses.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600">{c.level ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.durationMonths ? `${c.durationMonths} mo` : "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.feeAmount ? `${c.feeCurrency} ${c.feeAmount.toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {c.minGpaPercent ? `GPA ≥ ${c.minGpaPercent}` : "No GPA min"} ·{" "}
                    {c.maxGapYears != null ? `Gap ≤ ${c.maxGapYears}y` : "Any gap"} ·{" "}
                    {c.languageTestType === "NOT_REQUIRED"
                      ? "No language test"
                      : c.languageTestType === "MOI"
                        ? "MOI accepted"
                        : `${c.languageTestType} ≥ ${c.languageMinScore}`}
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
