import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  body: z.string().min(1),
  leadId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
  applicationId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = createSchema.parse(await req.json());
    const note = await prisma.note.create({
      data: { ...body, authorId: session.userId, organizationId: session.organizationId },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Note",
      entityId: note.id,
      after: note,
    });
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
