"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Clock, FileQuestion } from "lucide-react";

type MockTest = {
  id: string;
  title: string;
  testType: string;
  durationMins: number;
  _count: { questions: number };
};

export default function ModuleMockTests() {
  const params = useParams<{ type: string }>();
  const router = useRouter();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/test-prep/mock-tests?type=${params.type}`);
      const data = await res.json();
      setTests(data.mockTests ?? []);
      setLoading(false);
    })();
  }, [params.type]);

  async function start(mockTestId: string) {
    setStarting(mockTestId);
    const res = await fetch("/api/test-prep/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mockTestId }),
    });
    const data = await res.json();
    setStarting(null);
    if (res.ok) router.push(`/dashboard/test-prep/attempt/${data.attempt.id}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">{params.type} mock tests</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a mock test to start a practice attempt.</p>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : tests.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          No mock tests published for {params.type} yet. Run the seed script to load sample tests.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tests.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{t.title}</h2>
              <div className="mt-2 flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t.durationMins} min</span>
                <span className="flex items-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> {t._count.questions} questions</span>
              </div>
              <button
                onClick={() => start(t.id)}
                disabled={starting === t.id}
                className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {starting === t.id ? "Starting…" : "Start attempt"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
