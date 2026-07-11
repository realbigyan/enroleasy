import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  testType: z.enum(["IELTS", "PTE", "DUOLINGO"]),
  examDate: z.string().datetime(),
  center: z.string().optional().nullable(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: studentId } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.organizationId !== session.organizationId) throw new ApiError(404, "Student not found");

    const body = createSchema.parse(await req.json());
    const booking = await prisma.examBooking.create({
      data: { ...body, examDate: new Date(body.examDate), studentId },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "ExamBooking",
      entityId: booking.id,
      after: booking,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
