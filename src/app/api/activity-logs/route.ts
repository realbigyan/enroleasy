import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  leadId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  applicationId: z.string().optional().nullable(),
  type: z.string().default("note"),
  description: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const leadId = req.nextUrl.searchParams.get("leadId");
    const studentId = req.nextUrl.searchParams.get("studentId");
    const applicationId = req.nextUrl.searchParams.get("applicationId");
    const logs = await prisma.activityLog.findMany({
      where: {
        organizationId: session.organizationId,
        ...(leadId ? { leadId } : {}),
        ...(studentId ? { studentId } : {}),
        ...(applicationId ? { applicationId } : {}),
      },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ logs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = createSchema.parse(await req.json());
    const log = await prisma.activityLog.create({
      data: { ...body, organizationId: session.organizationId, authorId: session.userId },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "ActivityLog",
      entityId: log.id,
      after: log,
    });
    if (body.studentId) {
      await prisma.student.update({ where: { id: body.studentId }, data: { lastActivityAt: new Date() } });
    }
    if (body.leadId) {
      await prisma.lead.update({ where: { id: body.leadId }, data: { lastActivityAt: new Date() } });
    }
    return NextResponse.json({ log }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
