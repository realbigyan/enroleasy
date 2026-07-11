import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student || student.organizationId !== session.organizationId) throw new ApiError(404, "Student not found");

    const updated = await prisma.student.update({
      where: { id },
      data: { archivedAt: student.archivedAt ? null : new Date() },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: student.archivedAt ? "unarchive" : "archive",
      entityType: "Student",
      entityId: id,
      before: student,
      after: updated,
    });
    return NextResponse.json({ student: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
