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
    const leads = await prisma.lead.findMany({
      where: { organizationId: session.organizationId },
      include: { assignedCounselor: true },
      orderBy: { createdAt: "desc" },
    });

    const header = toCsvRow(["Name", "Email", "Phone", "Stage", "Source", "Country", "Counselor", "Created"]);
    const rows = leads.map((l: (typeof leads)[number]) =>
      toCsvRow([
        l.fullName,
        l.email,
        l.phone,
        l.stage,
        l.source,
        l.interestedCountry,
        l.assignedCounselor?.name,
        l.createdAt.toISOString(),
      ])
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
