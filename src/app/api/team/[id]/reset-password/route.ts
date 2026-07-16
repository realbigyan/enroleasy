import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Staff management is OWNER-only — see POST /api/team for rationale.
    const session = await requireSession(["OWNER"]);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "User not found");

    // Generates a one-time temporary password shown to the admin once.
    // Swap for an emailed reset link once email delivery is wired up.
    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    // Never persist the actual password (temp or otherwise) in the audit trail.
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "reset_password",
      entityType: "User",
      entityId: id,
      after: { resetBy: session.userId },
    });

    return NextResponse.json({ tempPassword });
  } catch (err) {
    return handleApiError(err);
  }
}
