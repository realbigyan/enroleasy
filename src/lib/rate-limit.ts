import { NextResponse } from "next/server";
import { prisma } from "./prisma";

// Fixed-window rate limiting backed by Postgres. Serverless functions don't
// share memory across cold starts/instances, so an in-process limiter would
// be trivially bypassable — this uses the RateLimitBucket table instead,
// keyed by whatever the caller passes (e.g. "login:<ip>", "webhook:<token>").
//
// Returns { allowed, retryAfterSeconds } — callers should return 429 with a
// Retry-After header when `allowed` is false. Fails OPEN (allows the request)
// if the rate-limit check itself errors, so a DB hiccup never blocks real
// traffic — this is an abuse guard, not a correctness guarantee.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    const now = new Date();
    const windowMs = windowSeconds * 1000;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

    const bucket = await prisma.rateLimitBucket.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });

    const retryAfterSeconds = Math.ceil((windowStart.getTime() + windowMs - now.getTime()) / 1000);
    return { allowed: bucket.count <= limit, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
  } catch (err) {
    console.error("Rate limit check failed, allowing request", err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

// Best-effort client IP extraction behind Vercel's proxy chain.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Returns a NextResponse (not a plain Response) so callers that further
// decorate the response - e.g. wrapping it with CORS headers via a helper
// typed against NextResponse - can do so without a type mismatch.
export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  const res = NextResponse.json(
    { error: "Too many requests. Please try again shortly." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfterSeconds));
  return res;
}
