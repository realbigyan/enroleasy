import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const upsertSchema = z.object({
  kind: z.enum(["PRIMARY", "SECONDARY"]),
  name: z.string().min(1),
  relation: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.organizationId !== session.organizationId) throw new ApiError(404, "Student not found");

    const body = upsertSchema.parse(await req.json());
    const contact = await prisma.emergencyContact.upsert({
      where: { studentId_kind: { studentId, kind: body.kind } },
      create: { ...body, studentId },
      update: body,
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "upsert",
      entityType: "EmergencyContact",
      entityId: contact.id,
      after: contact,
    });
    return NextResponse.json({ contact });
  } catch (err) {
    return handleApiError(err);
  }
}
