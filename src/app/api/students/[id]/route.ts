import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  dob: z.string().datetime().optional().nullable(),
  passportNo: z.string().optional().nullable(),
  passportExpiry: z.string().datetime().optional().nullable(),
  countryOfBirth: z.string().optional().nullable(),
  currentCountry: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  academicGpaPercent: z.number().optional().nullable(),
  gapYears: z.number().int().optional().nullable(),
  englishTestType: z.enum(["IELTS", "PTE", "DUOLINGO", "MOI", "NONE"]).optional().nullable(),
  englishScore: z.number().optional().nullable(),
});

async function assertOwned(organizationId: string, id: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student || student.organizationId !== organizationId) throw new ApiError(404, "Student not found");
  return student;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await assertOwned(session.organizationId, id);
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        applications: { include: { destination: true } },
        notes: { orderBy: { createdAt: "desc" } },
        tasks: true,
        educationRecords: true,
        emergencyContacts: true,
        examBookings: { orderBy: { examDate: "desc" } },
        documents: true,
        invoices: { include: { invoicer: true } },
        referredBy: true,
      },
    });
    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR"]);
    const before = await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const student = await prisma.student.update({
      where: { id },
      data: {
        ...body,
        passportExpiry: body.passportExpiry ? new Date(body.passportExpiry) : undefined,
        dob: body.dob ? new Date(body.dob) : undefined,
      },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Student",
      entityId: id,
      before,
      after: student,
    });
    return NextResponse.json({ student });
  } catch (err) {
    return handleApiError(err);
  }
}
