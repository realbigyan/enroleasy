import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  institution: z.string().min(1),
  qualification: z.string().min(1),
  fieldOfStudy: z.string().optional().nullable(),
  yearCompleted: z.number().optional().nullable(),
  gpaOrPercentage: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.organizationId !== session.organizationId) throw new ApiError(404, "Student not found");

    const body = createSchema.parse(await req.json());
    const record = await prisma.educationRecord.create({ data: { ...body, studentId } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "EducationRecord",
      entityId: record.id,
      after: record,
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
