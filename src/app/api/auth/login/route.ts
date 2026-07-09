import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/api-guard";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: { email: body.email.toLowerCase() },
    });
    if (!user || !user.isActive) throw new ApiError(401, "Invalid email or password");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

    await setSessionCookie({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
      email: user.email,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (err) {
    return handleApiError(err);
  }
}
