import Link from "next/link";
import { GraduationCap, Users, ClipboardList, Headphones, BarChart3, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Lead & pipeline CRM",
    body: "Track every enquiry from first contact to enrolled student with a stage-based pipeline built for study-abroad counseling.",
  },
  {
    icon: ClipboardList,
    title: "Application tracking",
    body: "Manage university applications, offers, and visa stages per student, per destination, without spreadsheets.",
  },
  {
    icon: Headphones,
    title: "IELTS / PTE / Duolingo practice",
    body: "Give every student a built-in practice platform with mock tests, instant objective scoring, and progress history.",
  },
  {
    icon: BarChart3,
    title: "Counselor performance",
    body: "See conversion rates, task completion, and pipeline velocity across your whole team.",
  },
  {
    icon: ShieldCheck,
    title: "Built for multiple branches",
    body: "Every consultancy gets its own isolated workspace — invite counselors, assign roles, keep student data separated by org.",
  },
  {
    icon: GraduationCap,
    title: "Student self-service",
    body: "Students log in to their own portal to take practice tests and see their application status — fewer calls to your front desk.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex-1">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            EnrolEasy
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-indigo-600">
          For study-abroad &amp; test-prep consultancies
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Run your consultancy and your students&apos; test prep from one platform
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
          EnrolEasy combines a CRM built for education counselors with an IELTS, PTE, and Duolingo
          English Test practice platform — so leads, applications, and exam readiness all live in
          one place.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Start free 14-day trial
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-50"
          >
            Log in
          </Link>
        </div>
        <p className="mt-3 text-sm text-slate-500">No credit card required. Cancel anytime.</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <f.icon className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold">Simple, per-seat pricing</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { name: "Starter", price: "$49", seats: "up to 5 seats" },
              { name: "Growth", price: "$129", seats: "up to 20 seats" },
              { name: "Scale", price: "Custom", seats: "unlimited seats" },
            ].map((p) => (
              <div key={p.name} className="rounded-xl border border-slate-200 p-6">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-2 text-3xl font-bold">{p.price}</p>
                <p className="mt-1 text-sm text-slate-500">{p.seats} / month</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} EnrolEasy. Built for education consultancies.
      </footer>
    </div>
  );
}
