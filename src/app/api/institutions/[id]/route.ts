import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { INSTITUTION_TYPES } from "@/lib/institution-types";

const rankingSchema = z.object({
  scope: z.string().min(1),
  rank: z.number().int().positive(),
  source: z.string().min(1),
});

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  locations: z.array(z.string().min(1)).optional(),
  type: z.enum(INSTITUTION_TYPES).optional().nullable(),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  introduction: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // Superadmin-only: promote an existing private institution into the shared
  // global catalog (organizationId -> null) so every consultancy sees it.
  makeGlobal: z.boolean().optional(),
  // When provided, replaces the institution's entire ranking list (simpler
  // than fine-grained add/remove endpoints, and matches how the create form
  // already submits the whole list at once).
  rankings: z.array(rankingSchema).optional(),
});

async function assertAccessible(sessionOrgId: string, id: string) {
  const institution = await prisma.institution.findUnique({ where: { id } });
  if (!institution) throw new ApiError(404, "Institution not found");
  if (institution.organizationId !== null && institution.organizationId !== sessionOrgId) {
    throw new ApiError(404, "Institution not found");
  }
  return institution;
}

async function assertEditable(sessionUserId: string, sessionOrgId: string, id: string) {
  const institution = await assertAccessible(sessionOrgId, id);
  if (institution.organizationId === null) {
    const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { isSuperAdmin: true } });
    if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can edit the shared global catalog");
  }
  return institution;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await assertAccessible(session.organizationId, id);
    const institution = await prisma.institution.findUnique({
      where: { id },
      include: {
        courses: { orderBy: { name: "asc" } },
        rankings: { orderBy: { rank: "asc" } },
      },
    });
    return NextResponse.json({ institution });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "CONTENT_MANAGER"]);
    await assertEditable(session.userId, session.organizationId, id);
    const { makeGlobal, rankings, ...body } = updateSchema.parse(await req.json());

    const data: typeof body & { organizationId?: null } = { ...body };
    if (makeGlobal) {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isSuperAdmin: true } });
      if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can add to the shared global catalog");
      data.organizationId = null;
    }

    if (rankings !== undefined) {
      await prisma.institutionRanking.deleteMany({ where: { institutionId: id } });
    }
    const institution = await prisma.institution.update({
      where: { id },
      data: {
        ...data,
        ...(rankings !== undefined ? { rankings: { create: rankings } } : {}),
      },
      include: { courses: { orderBy: { name: "asc" } }, rankings: { orderBy: { rank: "asc" } } },
    });
    return NextResponse.json({ institution });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    await assertEditable(session.userId, session.organizationId, id);
    await prisma.institution.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
