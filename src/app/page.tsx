import Link from "next/link";
import {
  GraduationCap, Users, ClipboardList, BarChart3, ShieldCheck,
  Calculator, Handshake, Landmark, ScrollText, Calendar,
  Lock, Building2, CheckCircle2, ArrowRight, FolderOpen, SearchCheck,
} from "lucide-react";

// ─────────────────────────────────────────────
// Content data
// ─────────────────────────────────────────────

const stats = [
  { value: "2", label: "Core modules — CRM & Accounting, in one login" },
  { value: "9", label: "Staff roles for precise, need-to-know access control" },
  { value: "1", label: "Ledger — every invoice, expense, and payslip posts automatically" },
  { value: "100%", label: "Nepal tax compliant — fiscal year, VAT, TDS & SSF payroll" },
];

const pillars = [
  {
    icon: Users,
    name: "CRM & Admissions",
    description: "Everything from first enquiry to visa approval, in one pipeline.",
    points: [
      "10-stage lead pipeline with conversion analytics",
      "Student profiles with a full document vault + one-click zip export",
      "Multi-destination application tracking with detailed visa/paperwork stages",
      "Institution catalog with automated course-eligibility matching",
      "Partner & referral network with commission billing",
    ],
  },
  {
    icon: Calculator,
    name: "Finance & Accounting",
    description: "A full, Nepal-compliant double-entry accounting system — not a bolt-on.",
    points: [
      "Complete general ledger on the Nepali fiscal year (Shrawan–Ashadh)",
      "Automatic VAT & TDS calculation under the Income Tax Act 2058",
      "Payroll with Social Security Fund contributions & salary tax slabs",
      "Fixed assets, depreciation, and bank & cash reconciliation",
      "Trial balance, P&L, balance sheet, and VAT/TDS summary reports",
    ],
  },
];

const features = [
  { icon: Users, title: "Lead & pipeline CRM", body: "Track every enquiry from first contact to enrolled student with a stage-based pipeline built for study-abroad counseling." },
  { icon: ClipboardList, title: "Application & visa tracking", body: "Manage applications, offers, and detailed visa/documentation stages per student, per destination — no spreadsheets." },
  { icon: FolderOpen, title: "Document management", body: "A categorized document vault per student, with rename, download, and bulk zip export for full application packages." },
  { icon: SearchCheck, title: "Institution & course matching", body: "Maintain your own institution catalog and instantly see which courses a student qualifies for based on their profile." },
  { icon: Handshake, title: "Partner & referral network", body: "Track referral partners and agents, and bill commissions directly from the same platform." },
  { icon: Landmark, title: "Billing & invoicing", body: "Issue branded invoices and receipts to students or partners — automatically reflected in your accounting ledger." },
  { icon: Calculator, title: "Full accounting & payroll", body: "Chart of accounts, journal ledger, TDS/VAT, payroll, fixed assets, and financial reports — built for Nepal from the ground up." },
  { icon: Calendar, title: "Exam booking tracker", body: "Log when a student is booked for a real IELTS, PTE, or Duolingo exam, and record their result once it's in." },
  { icon: ShieldCheck, title: "Team & role-based access", body: "Nine distinct staff roles — from Owner to Documentation Officer — so every team member sees exactly what their job requires." },
  { icon: ScrollText, title: "Audit log", body: "A full history of role and permission changes across your organization, for accountability at any team size." },
  { icon: Building2, title: "Multi-branch, multi-tenant", body: "Every consultancy gets its own fully isolated workspace — invite staff, assign roles, keep data separated by organization." },
  { icon: BarChart3, title: "Dashboard analytics", body: "Lead funnel, conversion rates, task load, and revenue collected — a real-time view of your whole operation." },
];

const whyPoints = [
  {
    title: "One login instead of several tools",
    body: "Admissions CRM, invoicing, and full bookkeeping usually mean stitching together separate products. EnrolEasy runs all of it from a single, connected system.",
  },
  {
    title: "Nepal compliance built in, not bolted on",
    body: "Fiscal-year accounting (Shrawan–Ashadh), VAT and TDS calculation under the Income Tax Act 2058, and Social Security Fund payroll rules are native to the platform — not a spreadsheet on the side.",
  },
  {
    title: "Every number traces back to its source",
    body: "Invoices, expenses, and payroll all auto-post to one general ledger, so your financial reports are always current — no manual reconciliation between your CRM and your books.",
  },
  {
    title: "Built for teams, not just individuals",
    body: "Nine distinct staff roles mean a counselor, a documentation officer, and your accountant can all work in the same system without stepping on each other's data.",
  },
];

const security = [
  { icon: Building2, title: "Full data isolation", body: "Every organization's leads, students, applications, and financial records are strictly separated at the data layer." },
  { icon: Lock, title: "Role-based access control", body: "Nine granular staff roles determine exactly which screens and actions each team member can reach." },
  { icon: ScrollText, title: "Audit logging", body: "Every role and permission change is recorded, with who made it and when." },
  { icon: CheckCircle2, title: "Secure account recovery", body: "Built-in password reset and email-change flows, with confirmation steps at every point." },
];

const planFeatures = [
  "Full CRM: leads, students, applications & visa tracking",
  "Full Nepal-compliant accounting & payroll module",
  "Role-based staff accounts across your whole team",
  "Multi-branch, multi-tenant workspace",
  "Dashboard analytics & audit log",
  "Priority email support",
];

const pricing = [
  {
    term: "Monthly",
    price: "NRs 7,500",
    billedAs: "Billed every month",
    savings: null,
    highlight: false,
  },
  {
    term: "6 Months",
    price: "NRs 38,250",
    billedAs: "NRs 6,375/month, billed every 6 months",
    savings: "Save 15%",
    highlight: false,
  },
  {
    term: "1 Year",
    price: "NRs 67,500",
    billedAs: "NRs 5,625/month, billed annually",
    savings: "Save 25%",
    highlight: true,
  },
];

const faqs = [
  {
    q: "Is EnrolEasy built specifically for Nepal?",
    a: "The accounting module is purpose-built for Nepal — the Nepali fiscal year, VAT and TDS rules under the Income Tax Act 2058, and Social Security Fund payroll are all native. The CRM works for any study-abroad consultancy, anywhere.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes — every plan starts with a free 14-day trial, no credit card required.",
  },
  {
    q: "Does every billing option include the accounting module?",
    a: "Yes. There's one plan with the full platform — CRM and accounting — for every organization. Monthly, 6-month, and annual billing only change how often you're charged and how much you save; every feature is always included.",
  },
  {
    q: "Can my whole team use it, or is this just for one person?",
    a: "EnrolEasy is built for teams. Invite staff and assign the right role — Owner, Admin, Counselor, Documentation Officer, Admin Assist, and more — so everyone sees exactly what their job needs.",
  },
  {
    q: "Do I need a separate accounting system?",
    a: "No — that's the point. Invoices, expenses, and payroll all post automatically to one general ledger, so your CRM and your books stay in sync without manual double entry.",
  },
  {
    q: "Is my organization's data separated from other consultancies on the platform?",
    a: "Yes. Every organization has a fully isolated workspace — your leads, students, applications, and financial records are never visible to any other organization.",
  },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="flex-1">
      {/* Announcement bar */}
      <div className="bg-indigo-600 py-2 text-center text-sm text-white">
        <span className="font-medium">New:</span> Full Nepal-compliant Accounting &amp; Payroll module is now built into every plan.
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            EnrolEasy
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#platform" className="hover:text-slate-900">Platform</a>
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#security" className="hover:text-slate-900">Security</a>
            <a href="#pricing" className="hover:text-slate-900">Pricing</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
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

      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-indigo-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-indigo-600">
            For study-abroad consultancies
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            One platform to run admissions and finance — end to end.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            EnrolEasy unifies a CRM built for education counselors with a full Nepal-compliant
            accounting system — so leads, applications, and your books all live in one connected
            platform.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Start free 14-day trial <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-slate-300 bg-white px-6 py-3 font-medium hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            No credit card required · Multi-branch ready · Nepal tax compliant
          </p>

          <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-3xl font-bold text-indigo-600">{s.value}</p>
                <p className="mt-1 text-sm text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform pillars */}
      <section id="platform" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Two modules. One platform.</h2>
          <p className="mt-4 text-slate-600">
            Most consultancies run admissions and bookkeeping in unrelated tools.
            EnrolEasy connects both, so data entered once shows up everywhere it matters.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-4xl gap-8 sm:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.name} className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                <p.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{p.name}</h3>
              <p className="mt-2 text-sm text-slate-600">{p.description}</p>
              <ul className="mt-5 space-y-3">
                {p.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed feature grid */}
      <section id="features" className="border-t border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Everything your consultancy needs</h2>
            <p className="mt-4 text-slate-600">
              From the first enquiry to the final financial report — every step is covered.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 p-6">
                <f.icon className="h-8 w-8 text-indigo-600" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why EnrolEasy */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Why consultancies choose EnrolEasy</h2>
        </div>
        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {whyPoints.map((w) => (
            <div key={w.title} className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{w.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security & compliance */}
      <section id="security" className="border-t border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Security &amp; compliance</h2>
            <p className="mt-4 text-slate-600">
              Built for organizations that handle sensitive student data and real money.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {security.map((s) => (
              <div key={s.title} className="rounded-xl border border-slate-200 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                  <s.icon className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">One plan. Everything included.</h2>
            <p className="mt-4 text-slate-600">
              Every EnrolEasy subscription includes the full platform — CRM and accounting.
              Choose how often you&apos;d like to be billed, and save more the longer you commit.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8">
            <ul className="grid gap-3 sm:grid-cols-2">
              {planFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto mt-8 grid max-w-4xl gap-6 sm:grid-cols-3">
            {pricing.map((p) => (
              <div
                key={p.term}
                className={`flex flex-col rounded-2xl border p-8 ${
                  p.highlight ? "border-indigo-600 bg-indigo-50/50 shadow-sm" : "border-slate-200 bg-white"
                }`}
              >
                {p.highlight && (
                  <span className="mb-3 w-fit rounded-full bg-indigo-600 px-3 py-1 text-xs font-medium text-white">
                    Best value
                  </span>
                )}
                <h3 className="font-semibold">{p.term}</h3>
                <p className="mt-2 text-3xl font-bold">{p.price}</p>
                <p className="mt-1 text-sm text-slate-500">{p.billedAs}</p>
                {p.savings && (
                  <span className="mt-3 w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                    {p.savings}
                  </span>
                )}
                <Link
                  href="/register"
                  className={`mt-8 rounded-md px-4 py-2 text-center text-sm font-medium ${
                    p.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "border border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  Start free trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-14 space-y-8">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold">{f.q}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-slate-200 bg-indigo-600 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to run your consultancy from one platform?</h2>
          <p className="mx-auto mt-4 max-w-xl text-indigo-100">
            Start your free 14-day trial today — no credit card required.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/register"
              className="rounded-md bg-white px-6 py-3 font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Start free 14-day trial
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-indigo-400 px-6 py-3 font-medium text-white hover:bg-indigo-500"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                EnrolEasy
              </div>
              <p className="mt-3 text-sm text-slate-500">
                The all-in-one platform for study-abroad consultancies.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Platform</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#platform" className="hover:text-slate-900">CRM &amp; Admissions</a></li>
                <li><a href="#platform" className="hover:text-slate-900">Accounting &amp; Payroll</a></li>
                <li><a href="#security" className="hover:text-slate-900">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Company</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li><a href="#pricing" className="hover:text-slate-900">Pricing</a></li>
                <li><a href="#faq" className="hover:text-slate-900">FAQ</a></li>
                <li><Link href="/login" className="hover:text-slate-900">Log in</Link></li>
                <li><Link href="/register" className="hover:text-slate-900">Start free trial</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Built for</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li>Study-abroad consultancies</li>
                <li>Multi-branch education agencies</li>
                <li>Teams who want CRM + accounting in one tool</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} EnrolEasy. Built for education consultancies.
          </div>
        </div>
      </footer>
    </div>
  );
}
