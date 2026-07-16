import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, verifyTwoFactorChallenge } from "@/lib/auth";
import { verifyTwoFactorToken } from "@/lib/two-factor";
import { ApiError, handleApiError } from "@/lib/api-guard";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  challengeToken: z.string().min(1),
  code: z.string().min(6).max(6),
});

// Second step of login when the account has 2FA enabled. The client posts
// here with the short-lived challengeToken from /api/auth/login plus the
// 6-digit TOTP code from their authenticator app.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`verify-2fa:${ip}`, 10, 300);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = schema.parse(await req.json());
    const challenge = verifyTwoFactorChallenge(body.challengeToken);
    if (!challenge) throw new ApiError(401, "This login attempt has expired. Please log in again.");

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new ApiError(401, "This login attempt has expired. Please log in again.");
    }

    const valid = await verifyTwoFactorToken(body.code, user.twoFactorSecret);
    if (!valid) throw new ApiError(401, "Invalid verification code");

    await setSessionCookie(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      { userAgent: req.headers.get("user-agent"), ipAddress: ip }
    );

    return NextResponse.json({ ok: true, role: user.role });
  } catch (err) {
    return handleApiError(err);
  }
}
