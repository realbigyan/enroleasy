import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attempt = await prisma.testAttempt.findUnique({
    where: { id },
    include: { mockTest: true, answers: { include: { question: true } } },
  });

  if (!attempt) notFound();

  const skillRows = [
    { label: "Listening", value: attempt.listeningScore },
    { label: "Reading", value: attempt.readingScore },
    { label: "Writing", value: attempt.writingScore },
    { label: "Speaking", value: attempt.speakingScore },
  ].filter((r) => r.value !== null);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Results — {attempt.mockTest.title}</h1>
      <p className="mt-1 text-sm text-slate-500">{attempt.mockTest.testType} · {attempt.status}</p>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">Overall score</p>
        <p className="mt-1 text-4xl font-bold text-indigo-600">{attempt.overallBand ?? "—"}</p>
      </div>

      {skillRows.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {skillRows.map((r) => (
            <div key={r.label} className="rounded-lg border border-slate-200 bg-white p-4 text-center">
              <p className="text-xs text-slate-500">{r.label}</p>
              <p className="mt-1 text-xl font-semibold">{r.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Answer review</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {attempt.answers.map((a: (typeof attempt.answers)[number]) => (
            <li key={a.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
              <p className="font-medium">{a.question.prompt}</p>
              <p className="text-slate-500">Your answer: {a.responseText || "—"}</p>
              {a.aiFeedback && <p className="mt-1 text-xs text-indigo-600">{a.aiFeedback}</p>}
              {a.isCorrect !== null && (
                <p className={`text-xs ${a.isCorrect ? "text-green-600" : "text-red-600"}`}>
                  {a.isCorrect ? "Correct" : "Incorrect"}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <Link href="/dashboard/test-prep" className="mt-6 inline-block text-sm font-medium text-indigo-600">
        ← Back to Test Prep
      </Link>
    </div>
  );
}
