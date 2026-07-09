import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";
import { prisma } from "./prisma";
import type { Role } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireSession(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ApiError(403, "Insufficient permissions");
  }
  return session;
}

// Platform-level check: isSuperAdmin isn't part of the session JWT (a
// session issued before someone was promoted would otherwise stay stale for
// up to 7 days), so this always re-checks the DB.
export async function requireSuperAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  if (!user?.isSuperAdmin) throw new ApiError(403, "Superadmin access required");
  return session;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
