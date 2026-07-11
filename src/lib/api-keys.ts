import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { ApiKeyScope } from "@prisma/client";

const KEY_PREFIX = "ee_live_";

export class ApiKeyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex");
}

// Generates a new key of the form "ee_live_<32 hex chars>". Only the hash is
// ever persisted (same pattern as PasswordResetToken); `keyPrefix` is the
// first 12 characters, kept in the clear so the settings UI can show enough
// of the key to identify it without exposing the whole thing.
export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const random = crypto.randomBytes(16).toString("hex");
  const plaintext = `${KEY_PREFIX}${random}`;
  return {
    plaintext,
    prefix: plaintext.slice(0, 12),
    hash: hashApiKey(plaintext),
  };
}

export type ApiKeyContext = {
  apiKeyId: string;
  organizationId: string;
  scope: ApiKeyScope;
};

// Auth guard for the public /api/v1/* REST API — parallel to requireSession()
// (src/lib/api-guard.ts) but for external callers authenticating with a
// Bearer API key instead of the session cookie. Pass requireWrite: true for
// any mutating (POST/PATCH/DELETE) route to reject READ_ONLY keys.
export async function requireApiKey(req: NextRequest, opts?: { requireWrite?: boolean }): Promise<ApiKeyContext> {
  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiKeyError(401, "Missing API key. Pass it as 'Authorization: Bearer <key>'.");

  const plaintext = match[1].trim();
  const keyHash = hashApiKey(plaintext);
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || apiKey.revokedAt) throw new ApiKeyError(401, "Invalid or revoked API key");

  if (opts?.requireWrite && apiKey.scope !== "READ_WRITE") {
    throw new ApiKeyError(403, "This API key is read-only");
  }

  // Best-effort activity heartbeat; never block the request on it.
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return { apiKeyId: apiKey.id, organizationId: apiKey.organizationId, scope: apiKey.scope };
}

export function handleApiKeyError(err: unknown) {
  if (err instanceof ApiKeyError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
