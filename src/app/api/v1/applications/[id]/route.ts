import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey, ApiKeyError, handleApiKeyError } from "@/lib/api-keys";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const key = await requireApiKey(req);
    const { allowed, retryAfterSeconds } = await checkRateLimit(`v1:${key.apiKeyId}`, 120, 60);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const { id } = await params;
    const application = await prisma.application.findUnique({
      where: { id },
      include: { student: true, destination: true },
    });
    if (!application || application.organizationId !== key.organizationId) {
      throw new ApiKeyError(404, "Application not found");
    }
    return NextResponse.json({ application });
  } catch (err) {
    return handleApiKeyError(err);
  }
}
