import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

export async function GET() {
  try {
    const session = await requireSession();
    const students = await prisma.student.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
    });

    const header = toCsvRow(["Name", "Email", "Phone", "Passport No", "Current Country", "Archived", "Created"]);
    const rows = students.map((s: (typeof students)[number]) =>
      toCsvRow([s.fullName, s.email, s.phone, s.passportNo, s.currentCountry, s.archivedAt ? "yes" : "no", s.createdAt.toISOString()])
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="students.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
