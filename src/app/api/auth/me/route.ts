import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  // isSuperAdmin and twoFactorEnabled are intentionally not part of the
  // session JWT (a session issued before either changed would otherwise
  // stay stale for up to 7 days), so both are re-checked fresh from the DB.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true, twoFactorEnabled: true },
  });

  return NextResponse.json({
    user: session,
    isSuperAdmin: dbUser?.isSuperAdmin ?? false,
    twoFactorEnabled: dbUser?.twoFactorEnabled ?? false,
  });
}
