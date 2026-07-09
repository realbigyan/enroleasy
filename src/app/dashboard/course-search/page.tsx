"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

type LanguageStatus = "IELTS" | "PTE" | "DUOLINGO" | "MOI" | "NONE";

type StudentOption = {
  id: string;
  fullName: string;
  academicGpaPercent: number | null;
  gapYears: number | null;
  englishTestType: LanguageStatus | null;
  englishScore: number | null;
};

type Result = {
  institution: { id: string; name: string; country: string };
  course: {
    id: string;
    name: string;
    level: string | null;
    durationMonths: number | null;
    feeAmount: number | null;
    feeCurrency: string;
    careerOutcomes: string | null;
  };
};

const LANGUAGE_OPTIONS: LanguageStatus[] = ["IELTS", "PTE", "DUOLINGO", "MOI", "NONE"];

export default function CourseSearchPage() {
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [gpaPercent, setGpaPercent] = useState("");
  const [gapYears, setGapYears] = useState("");
  const [languageTestType, setLanguageTestType] = useState<LanguageStatus>("NONE");
  const [languageScore, setLanguageScore] = useState("");
  const [country, setCountry] = useState("");
  const [saveToStudent, setSaveToStudent] = useState(true);
  const [results, setResults] = useState<Result[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/students");
      const data = await res.json();
      setStudents(data.students ?? []);
    })();
  }, []);

  function pickStudent(id: string) {
    setStudentId(id);
    const s = students.find((st) => st.id === id);
    if (s) {
      setGpaPercent(s.academicGpaPercent != null ? String(s.academicGpaPercent) : "");
      setGapYears(s.gapYears != null ? String(s.gapYears) : "");
      setLanguageTestType(s.englishTestType ?? "NONE");
      setLanguageScore(s.englishScore != null ? String(s.englishScore) : "");
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setResults(null);
    const res = await fetch("/api/courses/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: studentId || undefined,
        gpaPercent: gpaPercent ? Number(gpaPercent) : undefined,
        gapYears: gapYears ? Number(gapYears) : undefined,
        languageTestType,
        languageScore: languageScore ? Number(languageScore) : undefined,
        country: country || undefined,
        saveToStudent: !!studentId && saveToStudent,
      }),
    });
    const data = await res.json();
    setResults(data.results ?? []);
    setSearching(false);
  }

  const needsScore = languageTestType !== "NONE" && languageTestType !== "MOI";

  return (
    <div>
      <h1 className="text-2xl font-semibold">Course Search</h1>
      <p className="mt-1 text-sm text-slate-500">Find courses a student is eligible for based on GPA, gap years, and language test.</p>

      <form onSubmit={search} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <select value={studentId} onChange={(e) => pickStudent(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-3">
          <option value="">— Ad-hoc search (no student selected) —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>

        <input placeholder="GPA / Percentage" type="number" step="0.01" value={gpaPercent}
          onChange={(e) => setGpaPercent(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Gap (years)" type="number" value={gapYears}
          onChange={(e) => setGapYears(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
        <input placeholder="Country filter (optional)" value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm" />

        <select value={languageTestType} onChange={(e) => setLanguageTestType(e.target.value as LanguageStatus)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          {LANGUAGE_OPTIONS.map((t) => (
            <option key={t} value={t}>{t === "NONE" ? "No test taken" : t}</option>
          ))}
        </select>
        {needsScore && (
          <input placeholder="Score" type="number" step="0.1" value={languageScore}
            onChange={(e) => setLanguageScore(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2" />
        )}

        {studentId && (
          <label className="flex items-center gap-2 text-xs text-slate-500 sm:col-span-3">
            <input type="checkbox" checked={saveToStudent} onChange={(e) => setSaveToStudent(e.target.checked)} />
            Save these details back to the student&apos;s profile
          </label>
        )}

        <button type="submit" disabled={searching}
          className="flex items-center justify-center gap-2 sm:col-span-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          <Search className="h-4 w-4" /> {searching ? "Searching…" : "Search eligible courses"}
        </button>
      </form>

      {results !== null && (
        <div className="mt-6">
          <p className="text-sm text-slate-500">{results.length} eligible course{results.length === 1 ? "" : "s"} found</p>
          {results.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No courses match these criteria yet — try widening the search or add more institutions.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Institution</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Fee</th>
                    <th className="px-4 py-3">Career outcomes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.course.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{r.course.name}{r.course.level ? ` (${r.course.level})` : ""}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/institutions/${r.institution.id}`} className="text-indigo-600 hover:underline">
                          {r.institution.name}
                        </Link>
                        <span className="ml-1 text-xs text-slate-400">{r.institution.country}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.course.durationMonths ? `${r.course.durationMonths} mo` : "—"}</td>
                      <td className="px-4 py-3 text-slate-600">{r.course.feeAmount ? `${r.course.feeCurrency} ${r.course.feeAmount.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{r.course.careerOutcomes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
