import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const STAFF_ROLES = ["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "TRAINER", "EXAMINER", "CONTENT_MANAGER", "DOCUMENTATION_OFFICER"] as const;

const updateSchema = z.object({
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Staff management is OWNER-only — see POST /api/team for rationale.
    const session = await requireSession(["OWNER"]);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "User not found");

    const body = updateSchema.parse(await req.json());
    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "User",
      entityId: id,
      before: { role: existing.role, isActive: existing.isActive },
      after: { role: user.role, isActive: user.isActive },
    });
    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Staff management is OWNER-only — see POST /api/team for rationale.
    const session = await requireSession(["OWNER"]);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "User not found");
    if (existing.role === "OWNER") throw new ApiError(400, "Cannot delete the organization owner");
    await prisma.user.delete({ where: { id } });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "User",
      entityId: id,
      before: existing,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
