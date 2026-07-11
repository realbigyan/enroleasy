import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const COOKIE_NAME = "enroleasy_session";
const SESSION_DAYS = 7;
const CHALLENGE_MINUTES = 5;

export type SessionPayload = {
  userId: string;
  organizationId: string;
  role: Role;
  name: string;
  email: string;
  // Id of the corresponding `Session` DB row. Older tokens issued before
  // session/device management shipped won't have this - treated as
  // always-valid until they naturally expire (see getSession below).
  sid?: string;
};

export type TwoFactorChallengePayload = {
  type: "2fa_challenge";
  userId: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${SESSION_DAYS}d` });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

// Short-lived token issued after a correct password but before a correct TOTP
// code, when the account has 2FA enabled. Carries no org/role info so it
// can't be used as a session on its own.
export function signTwoFactorChallenge(userId: string) {
  return jwt.sign({ type: "2fa_challenge", userId }, JWT_SECRET, {
    expiresIn: `${CHALLENGE_MINUTES}m`,
  });
}

export function verifyTwoFactorChallenge(token: string): TwoFactorChallengePayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TwoFactorChallengePayload;
    if (decoded.type !== "2fa_challenge") return null;
    return decoded;
  } catch {
    return null;
  }
}

// Creates a Session row (backs the device/session-management feature: an
// active-sessions list plus "log out this device") and embeds its id (`sid`)
// in the JWT so getSession() can check `revokedAt` for immediate
// server-side revocation without waiting for the JWT's natural 7-day expiry.
export async function setSessionCookie(
  payload: Omit<SessionPayload, "sid">,
  meta?: { userAgent?: string | null; ipAddress?: string | null }
) {
  const session = await prisma.session.create({
    data: {
      userId: payload.userId,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ipAddress ?? null,
    },
  });

  const token = signSession({ ...payload, sid: session.id });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    const payload = verifySession(token);
    if (payload?.sid) {
      await prisma.session
        .update({ where: { id: payload.sid }, data: { revokedAt: new Date() } })
        .catch(() => {});
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  if (!payload.sid) return payload;

  const session = await prisma.session.findUnique({ where: { id: payload.sid } });
  if (!session || session.revokedAt) return null;

  // Best-effort activity heartbeat for the active-sessions list; fire and
  // forget so it never adds latency to the request.
  prisma.session
    .update({ where: { id: payload.sid }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  return payload;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
