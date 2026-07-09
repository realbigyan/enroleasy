import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const createSchema = z.object({
  name: z.string().min(2),
  country: z.string().min(2),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  introduction: z.string().optional().nullable(),
  isGlobal: z.boolean().optional().default(false),
});

// Visible institutions = the org's own private catalog + the shared global
// catalog (organizationId null), so every consultancy sees the superadmin's
// shared entries alongside anything they've added themselves.
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const country = req.nextUrl.searchParams.get("country");
    const institutions = await prisma.institution.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId: session.organizationId }, { organizationId: null }],
        ...(country ? { country } : {}),
      },
      include: { _count: { select: { courses: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ institutions });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "CONTENT_MANAGER"]);
    const body = createSchema.parse(await req.json());

    let organizationId: string | null = session.organizationId;
    if (body.isGlobal) {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isSuperAdmin: true } });
      if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can add to the shared global catalog");
      organizationId = null;
    }

    const institution = await prisma.institution.create({
      data: {
        name: body.name,
        country: body.country,
        website: body.website,
        logoUrl: body.logoUrl,
        introduction: body.introduction,
        organizationId,
      },
    });
    return NextResponse.json({ institution }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
