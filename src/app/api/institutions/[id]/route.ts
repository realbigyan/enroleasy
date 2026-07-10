import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  introduction: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  // Superadmin-only: promote an existing private institution into the shared
  // global catalog (organizationId -> null) so every consultancy sees it.
  makeGlobal: z.boolean().optional(),
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
      include: { courses: { orderBy: { name: "asc" } } },
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
    const { makeGlobal, ...body } = updateSchema.parse(await req.json());

    const data: typeof body & { organizationId?: null } = { ...body };
    if (makeGlobal) {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { isSuperAdmin: true } });
      if (!user?.isSuperAdmin) throw new ApiError(403, "Only a platform superadmin can add to the shared global catalog");
      data.organizationId = null;
    }

    const institution = await prisma.institution.update({ where: { id }, data });
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
