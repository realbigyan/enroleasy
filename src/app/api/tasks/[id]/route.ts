import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
  title: z.string().min(2).optional(),
  dueAt: z.string().datetime().optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      throw new ApiError(404, "Task not found");
    }
    const body = updateSchema.parse(await req.json());
    const task = await prisma.task.update({
      where: { id },
      data: { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Task",
      entityId: id,
      before: existing,
      after: task,
    });
    return NextResponse.json({ task });
  } catch (err) {
    return handleApiError(err);
  }
}
