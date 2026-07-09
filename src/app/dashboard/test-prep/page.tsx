import Link from "next/link";
import { Headphones, PenTool, Mic } from "lucide-react";

const modules = [
  {
    type: "IELTS",
    title: "IELTS",
    description: "Academic & General Training practice — Listening, Reading, Writing, Speaking.",
    icon: Headphones,
  },
  {
    type: "PTE",
    title: "PTE Academic",
    description: "Computer-scored practice across all four skills, scaled 10–90.",
    icon: PenTool,
  },
  {
    type: "DUOLINGO",
    title: "Duolingo English Test",
    description: "Adaptive-style practice items, scaled 10–160.",
    icon: Mic,
  },
];

export default function TestPrepHome() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Test Prep</h1>
      <p className="mt-1 text-sm text-slate-500">
        Practice tests for your students — IELTS, PTE, and the Duolingo English Test.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.type}
            href={`/dashboard/test-prep/${m.type}`}
            className="rounded-xl border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-sm"
          >
            <m.icon className="h-8 w-8 text-indigo-600" />
            <h2 className="mt-4 font-semibold">{m.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{m.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
