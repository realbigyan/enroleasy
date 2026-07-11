import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth";
import type { Session } from "@prisma/client";

// Lists this user's active (non-revoked) sessions/devices, newest first,
// flagging which one is the current browser session.
export async function GET() {
  try {
    const session = await requireSession();
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const current = token ? verifySession(token) : null;

    const rows = await prisma.session.findMany({
      where: { userId: session.userId, revokedAt: null },
      orderBy: { lastSeenAt: "desc" },
    });

    return NextResponse.json({
      sessions: rows.map((row: Session) => ({
        id: row.id,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        createdAt: row.createdAt,
        lastSeenAt: row.lastSeenAt,
        isCurrent: row.id === current?.sid,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
