import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentManager } from "@/components/DocumentManager";
import { ActivityTimeline } from "@/components/student/ActivityTimeline";
import {
  StudentOverviewPanel,
  EducationPanel,
  EmergencyContactsPanel,
  ExamBookingsPanel,
  ArchiveButton,
} from "@/components/student/StudentDetailPanels";
import { PrintButton } from "@/components/student/PrintButton";
import { ApplicationsPanel } from "@/components/student/ApplicationsPanel";
import { CustomFieldsPanel } from "@/components/CustomFieldsPanel";

export default async function StudentProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      applications: { include: { destination: true, assignedDocOfficer: { select: { id: true, name: true } } } },
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
      <div className="flex items-start justify-between print:mb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {student.fullName}
            {student.archivedAt && <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs align-middle">Archived</span>}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{student.email ?? "No email on file"} · {student.phone ?? "No phone"}</p>
          {student.referredBy && (
            <p className="mt-1 text-xs text-slate-400">Referred by {student.referredBy.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <PrintButton />
          <ArchiveButton studentId={student.id} archived={!!student.archivedAt} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <StudentOverviewPanel
          student={{
            ...student,
            dob: student.dob?.toISOString() ?? null,
            passportExpiry: student.passportExpiry?.toISOString() ?? null,
          }}
        />

        <ApplicationsPanel
          studentId={student.id}
          applications={student.applications}
          canCreate={["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"].includes(session?.role ?? "")}
        />

        <EducationPanel studentId={student.id} records={student.educationRecords} />
        <EmergencyContactsPanel studentId={student.id} contacts={student.emergencyContacts} />

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
        <div className="print:hidden">
          <ActivityTimeline studentId={student.id} />
        </div>
      </div>

      <div className="mt-6">
        <CustomFieldsPanel entityType="STUDENT" entityId={student.id} />
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
