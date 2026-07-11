import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, ApiError, handleApiError } from "@/lib/api-guard";
import { verifyTwoFactorToken } from "@/lib/two-factor";
import { logAudit } from "@/lib/audit";

const schema = z.object({ code: z.string().min(6).max(6) });

// Step 2 of enabling 2FA: prove the user actually has the secret loaded in
// an authenticator app before flipping twoFactorEnabled on.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.twoFactorSecret) {
      throw new ApiError(400, "Start 2FA setup first");
    }

    const valid = verifyTwoFactorToken(body.code, user.twoFactorSecret);
    if (!valid) throw new ApiError(400, "Invalid verification code");

    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorEnabled: true },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "enable_2fa",
      entityType: "User",
      entityId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
