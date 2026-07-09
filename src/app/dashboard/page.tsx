import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, ClipboardList, CheckSquare, Award, AlertTriangle, DollarSign } from "lucide-react";

const LEAD_FUNNEL_STAGES = [
  "NEW", "CONTACTED", "TRIAL_BOOKED", "TRIAL_DONE", "QUALIFIED",
  "COUNSELING", "APPLICATION_STARTED", "OFFER_RECEIVED", "VISA_STAGE", "ENROLLED",
] as const;

export default async function DashboardOverview() {
  const session = await getSession();
  const organizationId = session!.organizationId;
  // eslint-disable-next-line react-hooks/purity -- server component computing a relative cutoff for a DB query, not a render-purity concern
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    leadCount,
    studentCount,
    openApplications,
    openTasks,
    staleLeadCount,
    tasksDue,
    revenueAgg,
    allLeadsForFunnel,
    recentAttempts,
  ] = await Promise.all([
    prisma.lead.count({ where: { organizationId, stage: { notIn: ["ENROLLED", "LOST"] } } }),
    prisma.student.count({ where: { organizationId, archivedAt: null } }),
    prisma.application.count({
      where: { organizationId, status: { notIn: ["REJECTED", "WITHDRAWN", "VISA_APPROVED"] } },
    }),
    prisma.task.count({ where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.lead.count({
      where: {
        organizationId,
        stage: { notIn: ["ENROLLED", "LOST"] },
        OR: [
          { lastActivityAt: { lt: fourteenDaysAgo } },
          { lastActivityAt: null, createdAt: { lt: fourteenDaysAgo } },
        ],
      },
    }),
    prisma.task.count({
      where: { organizationId, status: { in: ["OPEN", "IN_PROGRESS"] }, dueAt: { lte: new Date() } },
    }),
    prisma.invoice.aggregate({ where: { organizationId, status: "PAID" }, _sum: { amount: true } }),
    prisma.lead.findMany({ where: { organizationId }, select: { stage: true } }),
    prisma.testAttempt.findMany({
      where: { mockTest: { organizationId } },
      include: { mockTest: true, student: true },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Active leads", value: leadCount, icon: Users },
    { label: "Students", value: studentCount, icon: Award },
    { label: "Open applications", value: openApplications, icon: ClipboardList },
    { label: "Open tasks", value: openTasks, icon: CheckSquare },
    { label: "Stale leads (14+ days)", value: staleLeadCount, icon: AlertTriangle },
    { label: "Tasks due", value: tasksDue, icon: CheckSquare },
    { label: "Revenue collected", value: `$${(revenueAgg._sum.amount ?? 0).toFixed(2)}`, icon: DollarSign },
  ];

  // Snapshot funnel: how many leads currently sit at or past each stage.
  const stageIndex = new Map(LEAD_FUNNEL_STAGES.map((s, i) => [s, i]));
  const atOrPastCounts = LEAD_FUNNEL_STAGES.map((stage, i) =>
    allLeadsForFunnel.filter((l: (typeof allLeadsForFunnel)[number]) => (stageIndex.get(l.stage) ?? -1) >= i).length
  );
  const maxCount = Math.max(1, ...atOrPastCounts);

  const conversions = LEAD_FUNNEL_STAGES.slice(0, -1).map((stage, i) => {
    const from = atOrPastCounts[i];
    const to = atOrPastCounts[i + 1];
    const pct = from > 0 ? Math.round((to / from) * 100) : null;
    return { from: stage, to: LEAD_FUNNEL_STAGES[i + 1], pct };
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-slate-500">A snapshot of your consultancy&apos;s pipeline.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <s.icon className="h-5 w-5 text-indigo-600" />
            <p className="mt-3 text-2xl font-semibold">{s.value}</p>
            <p className="text-sm text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Lead Funnel</h2>
          <p className="text-xs text-slate-500">Leads currently at or past each stage</p>
          <div className="mt-4 space-y-2">
            {LEAD_FUNNEL_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center gap-3 text-xs">
                <span className="w-32 shrink-0 text-slate-500">{stage.replace(/_/g, " ")}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full rounded bg-indigo-500"
                    style={{ width: `${(atOrPastCounts[i] / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right font-medium">{atOrPastCounts[i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Conversion Rates</h2>
          <p className="text-xs text-slate-500">Stage-to-stage, current pipeline snapshot</p>
          <ul className="mt-4 space-y-2 text-sm">
            {conversions.map((c) => (
              <li key={c.from} className="flex items-center justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                <span className="text-slate-600">{c.from.replace(/_/g, " ")} → {c.to.replace(/_/g, " ")}</span>
                <span className="font-medium">{c.pct === null ? "—" : `${c.pct}%`}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Recent test-prep attempts</h2>
        {recentAttempts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No practice attempts yet.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="pb-2">Student</th>
                <th className="pb-2">Test</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {recentAttempts.map((a: (typeof recentAttempts)[number]) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="py-2">{a.student?.fullName ?? "—"}</td>
                  <td className="py-2">{a.mockTest.title}</td>
                  <td className="py-2">{a.status}</td>
                  <td className="py-2">{a.overallBand ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
