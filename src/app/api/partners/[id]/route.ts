import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  commissionPct: z.number().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { referredLeads: true, referredStudents: true, invoices: true },
    });
    if (!partner || partner.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    return NextResponse.json({ partner });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    const body = updateSchema.parse(await req.json());
    const partner = await prisma.partner.update({ where: { id }, data: body });
    return NextResponse.json({ partner });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.partner.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Partner not found");
    await prisma.partner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
