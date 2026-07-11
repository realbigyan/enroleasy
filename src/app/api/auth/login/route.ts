import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, signTwoFactorChallenge } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/api-guard";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // 10 attempts / 5 minutes per IP - generous enough for a mistyped
    // password or two, tight enough to blunt credential-stuffing.
    const { allowed, retryAfterSeconds } = await checkRateLimit(`login:${ip}`, 10, 300);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = schema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    if (user.twoFactorEnabled) {
      const challengeToken = signTwoFactorChallenge(user.id);
      return NextResponse.json({ ok: true, twoFactorRequired: true, challengeToken });
    }

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
