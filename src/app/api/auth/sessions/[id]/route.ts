import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

// Revokes one of the current user's own sessions/devices ("log out this
// device"). Scoped to session.userId so you can never revoke someone else's.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const target = await prisma.session.findUnique({ where: { id } });
    if (!target || target.userId !== session.userId) {
      throw new ApiError(404, "Session not found");
    }

    await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "revoke_session",
      entityType: "Session",
      entityId: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
