import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { generateApiKey } from "@/lib/api-keys";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(2).max(60),
  scope: z.enum(["READ_ONLY", "READ_WRITE"]).default("READ_ONLY"),
});

// Lists this org's API keys (never the plaintext key itself, only
// identifying metadata) for the Integrations settings page.
export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const keys = await prisma.apiKey.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    return handleApiError(err);
  }
}

// Creates a new key. The plaintext value is returned ONLY in this response —
// it is never retrievable again afterwards, matching how most developer
// platforms handle API key issuance.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createSchema.parse(await req.json());
    const { plaintext, prefix, hash } = generateApiKey();

    const key = await prisma.apiKey.create({
      data: {
        organizationId: session.organizationId,
        name: body.name,
        scope: body.scope,
        keyPrefix: prefix,
        keyHash: hash,
        createdById: session.userId,
      },
      select: { id: true, name: true, keyPrefix: true, scope: true, createdAt: true },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "ApiKey",
      entityId: key.id,
      after: { name: key.name, scope: key.scope, keyPrefix: key.keyPrefix },
    });

    return NextResponse.json({ key, plaintext }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
