import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { META_PENDING_PAGES_COOKIE, type MetaPage } from "@/lib/meta";
import { logAudit } from "@/lib/audit";

const STATE_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const schema = z.object({ pageId: z.string() });

// Finalizes the connect flow once the user has picked which Facebook Page
// to use (only shown when their account manages more than one Page).
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const { pageId } = schema.parse(await req.json());

    const cookieStore = await cookies();
    const token = cookieStore.get(META_PENDING_PAGES_COOKIE)?.value;
    if (!token) throw new ApiError(404, "That connection attempt expired — start over from Integrations.");

    const claims = jwt.verify(token, STATE_SECRET) as {
      organizationId: string;
      userId: string;
      pages: MetaPage[];
    };
    if (claims.organizationId !== session.organizationId) {
      throw new ApiError(403, "This connection belongs to a different organization");
    }

    const page = claims.pages.find((p) => p.id === pageId);
    if (!page) throw new ApiError(400, "That Page wasn't part of the original connection — start over.");

    const existing = await prisma.metaIntegration.findUnique({ where: { organizationId: session.organizationId } });
    const integration = await prisma.metaIntegration.upsert({
      where: { organizationId: session.organizationId },
      create: {
        organizationId: session.organizationId,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        connectedByUserId: claims.userId,
        status: "CONNECTED",
      },
      update: {
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token,
        connectedByUserId: claims.userId,
        status: "CONNECTED",
      },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "connect",
      entityType: "MetaIntegration",
      entityId: integration.id,
      before: existing ?? undefined,
      after: integration,
    });

    cookieStore.delete(META_PENDING_PAGES_COOKIE);
    return NextResponse.json({ ok: true, pageName: page.name });
  } catch (err) {
    return handleApiError(err);
  }
}
