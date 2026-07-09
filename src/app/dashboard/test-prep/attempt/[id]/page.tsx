"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

type Question = {
  id: string;
  skill: string;
  type: string;
  prompt: string;
  passageText: string | null;
  options: string[] | null;
  maxScore: number;
};

type Attempt = {
  id: string;
  status: string;
  mockTest: { title: string; testType: string; durationMins: number; questions: Question[] };
  answers: { questionId: string; responseText: string | null }[];
};

export default function AttemptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/test-prep/attempts/${id}`);
    const data = await res.json();
    setAttempt(data.attempt);
    const existing: Record<string, string> = {};
    for (const a of data.attempt?.answers ?? []) {
      if (a.responseText) existing[a.questionId] = a.responseText;
    }
    setResponses(existing);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, [load]);

  async function saveAnswer(questionId: string, responseText: string) {
    setResponses((prev) => ({ ...prev, [questionId]: responseText }));
    await fetch(`/api/test-prep/attempts/${id}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, responseText }),
    });
  }

  async function finish() {
    setSubmitting(true);
    const res = await fetch(`/api/test-prep/attempts/${id}/submit`, { method: "POST" });
    setSubmitting(false);
    if (res.ok) router.push(`/dashboard/test-prep/results/${id}`);
  }

  if (!attempt) return <p className="text-sm text-slate-500">Loading…</p>;

  const questions = attempt.mockTest.questions;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{attempt.mockTest.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {attempt.mockTest.testType} · {attempt.mockTest.durationMins} minutes · {questions.length} questions
        </p>
      </div>

      <div className="space-y-6">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              {q.skill} · Question {i + 1}
            </p>
            {q.passageText && (
              <p className="mt-2 rounded bg-slate-50 p-3 text-sm text-slate-600">{q.passageText}</p>
            )}
            <p className="mt-3 font-medium">{q.prompt}</p>

            {q.type === "MULTIPLE_CHOICE" || q.type === "MATCHING" ? (
              <div className="mt-3 space-y-2">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={q.id}
                      checked={responses[q.id] === opt}
                      onChange={() => saveAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : q.type === "TRUE_FALSE_NOTGIVEN" ? (
              <div className="mt-3 flex gap-4 text-sm">
                {["True", "False", "Not Given"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={q.id}
                      checked={responses[q.id] === opt}
                      onChange={() => saveAnswer(q.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : q.type === "SPEAKING_PROMPT" ? (
              <div className="mt-3">
                <p className="text-xs text-slate-400 mb-2">
                  Audio recording isn&apos;t wired up in this scaffold — type a transcript of your response instead.
                </p>
                <textarea
                  value={responses[q.id] ?? ""}
                  onChange={(e) => saveAnswer(q.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ) : (
              <textarea
                value={responses[q.id] ?? ""}
                onChange={(e) => saveAnswer(q.id, e.target.value)}
                rows={q.type === "ESSAY" ? 8 : 2}
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="Your answer"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={finish}
        disabled={submitting}
        className="mt-6 w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {submitting ? "Scoring…" : "Submit attempt"}
      </button>
    </div>
  );
}
