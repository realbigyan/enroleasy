import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { handleApiError } from "@/lib/api-guard";

const schema = z.object({ email: z.string().email() });

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const email = body.email.toLowerCase();

    // Always respond the same way whether or not the account exists, so this
    // endpoint can't be used to enumerate registered emails.
    const genericResponse = NextResponse.json({
      ok: true,
      message: "If an account with that email exists, we've sent a reset link.",
    });

    const user = await prisma.user.findFirst({ where: { email, isActive: true } });
    if (!user) return genericResponse;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const origin = req.nextUrl.origin;
    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr instanceof Error ? emailErr.message : emailErr);
      // Don't leak email-sending failures to the client either.
    }

    return genericResponse;
  } catch (err) {
    return handleApiError(err);
  }
}
