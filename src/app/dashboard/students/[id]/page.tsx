import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentManager } from "@/components/DocumentManager";
import { ActivityTimeline } from "@/components/student/ActivityTimeline";
import {
  TravelDetails,
  AcademicProfilePanel,
  EducationPanel,
  EmergencyContactsPanel,
  ExamBookingsPanel,
  ArchiveButton,
} from "@/components/student/StudentDetailPanels";

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      applications: { include: { destination: true } },
      testAttempts: { include: { mockTest: true }, orderBy: { startedAt: "desc" } },
      notes: { orderBy: { createdAt: "desc" } },
      educationRecords: true,
      emergencyContacts: true,
      examBookings: { orderBy: { examDate: "desc" } },
      invoices: { include: { invoicer: true } },
      referredBy: true,
    },
  });

  if (!student || student.organizationId !== session?.organizationId) notFound();

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {student.fullName}
            {student.archivedAt && <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs align-middle">Archived</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{student.email ?? "No email on file"} · {student.phone ?? "No phone"}</p>
          {student.referredBy && (
            <p className="mt-1 text-xs text-slate-400">Referred by {student.referredBy.name}</p>
          )}
          {student.tags.length > 0 && (
            <div className="mt-2 flex gap-1">
              {student.tags.map((t: string) => (
                <span key={t} className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{t}</span>
              ))}
            </div>
          )}
        </div>
        <ArchiveButton studentId={student.id} archived={!!student.archivedAt} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TravelDetails student={{ ...student, passportExpiry: student.passportExpiry?.toISOString() ?? null, archivedAt: student.archivedAt?.toISOString() ?? null }} />

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Applications</h2>
          {student.applications.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No applications yet.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {student.applications.map((a: (typeof student.applications)[number]) => (
                <li key={a.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium">{a.destination.university} — {a.destination.course}</p>
                  <p className="text-slate-500">{a.destination.country} · {a.destination.intake}</p>
                  <p className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">{a.status.replace(/_/g, " ")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <AcademicProfilePanel student={student} />

        <EducationPanel studentId={student.id} records={student.educationRecords} />
        <EmergencyContactsPanel studentId={student.id} contacts={student.emergencyContacts} />

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Test-prep history</h2>
          {student.testAttempts.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No practice attempts yet.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {student.testAttempts.map((a: (typeof student.testAttempts)[number]) => (
                <li key={a.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <p className="font-medium">{a.mockTest.title} ({a.mockTest.testType})</p>
                  <p className="text-slate-500">{a.status} · Score: {a.overallBand ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <ExamBookingsPanel studentId={student.id} bookings={student.examBookings.map((b: (typeof student.examBookings)[number]) => ({ ...b, examDate: b.examDate.toISOString() }))} />

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Fees Ledger</h2>
          {student.invoices.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No invoices yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {student.invoices.map((inv: (typeof student.invoices)[number]) => (
                <li key={inv.id} className="flex items-center justify-between border-t border-slate-100 pt-2 first:border-0 first:pt-0">
                  <span>{inv.invoiceNumber} · {inv.invoicer.name}</span>
                  <span className={inv.status === "PAID" ? "text-green-600" : "text-amber-600"}>
                    {inv.currency} {inv.amount.toFixed(2)} · {inv.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <DocumentManager studentId={student.id} />
        <ActivityTimeline studentId={student.id} />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Notes</h2>
        {student.notes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No notes yet.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {student.notes.map((n: (typeof student.notes)[number]) => (
              <li key={n.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                {n.body}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
