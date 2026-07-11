import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

async function assertOwned(organizationId: string, id: string) {
  const definition = await prisma.customFieldDefinition.findUnique({ where: { id } });
  if (!definition || definition.organizationId !== organizationId) {
    throw new ApiError(404, "Custom field not found");
  }
  return definition;
}

const updateSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  options: z.array(z.string().min(1)).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const before = await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());

    const definition = await prisma.customFieldDefinition.update({
      where: { id },
      data: body,
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "CustomFieldDefinition",
      entityId: id,
      before,
      after: definition,
    });

    return NextResponse.json({ definition });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const before = await assertOwned(session.organizationId, id);
    await prisma.customFieldDefinition.delete({ where: { id } });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "delete",
      entityType: "CustomFieldDefinition",
      entityId: id,
      before,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
