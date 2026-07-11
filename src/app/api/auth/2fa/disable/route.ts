import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api-guard";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({ password: z.string().min(1) });

// Require the current password (not just an active session) before turning
// 2FA off - this is the one setting where a stolen/left-open session
// shouldn't be enough on its own.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new ApiError(401, "Not authenticated");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Incorrect password");

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "disable_2fa",
      entityType: "User",
      entityId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
