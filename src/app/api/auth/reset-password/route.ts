import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/api-guard";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // 10 attempts / 15 minutes per IP - guards against brute-forcing the
    // reset token itself.
    const { allowed, retryAfterSeconds } = await checkRateLimit(`reset-password:${ip}`, 10, 900);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = schema.parse(await req.json());
    const tokenHash = hashToken(body.token);

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new ApiError(400, "This reset link is invalid or has expired. Please request a new one.");
    }

    const passwordHash = await hashPassword(body.password);

    await prisma.$transaction([
      prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Invalidate any other outstanding reset tokens for this user.
      prisma.passwordResetToken.updateMany({
        where: { userId: resetToken.userId, usedAt: null, id: { not: resetToken.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
