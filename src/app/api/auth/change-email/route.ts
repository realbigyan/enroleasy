import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { requireSession, ApiError, handleApiError } from "@/lib/api-guard";

const schema = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.string().email(),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = schema.parse(await req.json());
    const newEmail = body.newEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new ApiError(401, "Not authenticated");

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(400, "Current password is incorrect");

    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail },
      });

      await setSessionCookie({
        userId: updated.id,
        organizationId: updated.organizationId,
        role: updated.role,
        name: updated.name,
        email: updated.email,
      });

      return NextResponse.json({ ok: true, email: updated.email });
    } catch (err) {
      // Prisma's unique-constraint violation code; checked structurally so this
      // doesn't depend on importing the Prisma error class directly.
      if (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002") {
        throw new ApiError(409, "That email is already in use in your workspace");
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
