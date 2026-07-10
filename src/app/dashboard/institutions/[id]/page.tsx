"use client";

import { useEffect, useState, use } from "react";
import { Plus } from "lucide-react";

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

type Institution = {
  id: string;
  name: string;
  country: string;
  website: string | null;
  introduction: string | null;
  organizationId: string | null;
  courses: Course[];
};

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

export default function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCourseForm);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [makingGlobal, setMakingGlobal] = useState(false);

  async function load() {
    setLoading(true);
    const [instRes, meRes] = await Promise.all([fetch(`/api/institutions/${id}`), fetch("/api/auth/me")]);
    const data = await instRes.json();
    const me = await meRes.json().catch(() => ({}));
    setInstitution(data.institution ?? null);
    setIsSuperAdmin(!!me.isSuperAdmin);
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

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{institution.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{institution.country}</p>
          {institution.website && (
            <a href={institution.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-indigo-600 hover:underline">
              {institution.website}
            </a>
          )}
          {institution.introduction && <p className="mt-2 max-w-2xl text-sm text-slate-600">{institution.introduction}</p>}
        </div>
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
      </div>

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
