import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  panNumber: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

async function assertOwned(organizationId: string, id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor || vendor.organizationId !== organizationId) throw new ApiError(404, "Vendor not found");
  return vendor;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(session.organizationId, id);
    const body = updateSchema.parse(await req.json());
    const vendor = await prisma.vendor.update({ where: { id }, data: body });
    return NextResponse.json({ vendor });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    await assertOwned(session.organizationId, id);
    const expenseCount = await prisma.expense.count({ where: { vendorId: id } });
    if (expenseCount > 0) {
      throw new ApiError(400, "Cannot delete a vendor with recorded expenses — deactivate it instead");
    }
    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
