import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  level: z.string().optional().nullable(),
  durationMonths: z.number().int().positive().optional().nullable(),
  feeAmount: z.number().nonnegative().optional().nullable(),
  feeCurrency: z.string().optional(),
  careerOutcomes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  minGpaPercent: z.number().optional().nullable(),
  maxGapYears: z.number().int().optional().nullable(),
  languageTestType: z.enum(["IELTS", "PTE", "DUOLINGO", "MOI", "NOT_REQUIRED"]).optional(),
  languageMinScore: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function assertCourseEditable(sessionUserId: string, sessionOrgId: string, id: string) {
  const course = await prisma.course.findUnique({ where: { id }, include: { institution: true } });
  if (!course) throw new ApiError(404, "Course not found");
  const institution = course.institution;
  if (institution.organizationId !== null && institution.organizationId !== sessionOrgId) {
    throw new ApiError(404, "Course not found");
  }
  if (institution.organizationId === null) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { isSuperAdmin: true } });
    if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can edit the shared global catalog");
  }
  return course;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const course = await prisma.course.findUnique({ where: { id }, include: { institution: true } });
    if (!course || (course.institution.organizationId !== null && course.institution.organizationId !== session.organizationId)) {
      throw new ApiError(404, "Course not found");
    }
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "CONTENT_MANAGER"]);
    const before = await assertCourseEditable(session.userId, session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const course = await prisma.course.update({ where: { id }, data: body });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Course",
      entityId: id,
      before,
      after: course,
    });
    return NextResponse.json({ course });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const before = await assertCourseEditable(session.userId, session.organizationId, id);
    await prisma.course.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "Course",
      entityId: id,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
