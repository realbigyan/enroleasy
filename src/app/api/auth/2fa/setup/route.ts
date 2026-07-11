import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-guard";
import { generateTwoFactorSecret, generateTwoFactorQrCode } from "@/lib/two-factor";
import { handleApiError } from "@/lib/api-guard";

// Step 1 of enabling 2FA: generate a new secret (not yet saved as "enabled"
// - that only happens once /api/auth/2fa/confirm verifies the user actually
// scanned it and can produce valid codes) and return a QR code to scan.
export async function POST() {
  try {
    const session = await requireSession();
    const secret = generateTwoFactorSecret();

    // Stash the pending secret on the user row so /confirm can read it back,
    // but leave twoFactorEnabled false until confirmed.
    await prisma.user.update({
      where: { id: session.userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeDataUrl = await generateTwoFactorQrCode(session.email, secret);
    return NextResponse.json({ secret, qrCodeDataUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
