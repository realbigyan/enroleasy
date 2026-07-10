import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });

  // isSuperAdmin is intentionally not part of the session JWT, so re-check it
  // fresh from the DB here — same pattern used by dashboard/layout.tsx.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });

  return NextResponse.json({ user: session, isSuperAdmin: dbUser?.isSuperAdmin ?? false });
}
