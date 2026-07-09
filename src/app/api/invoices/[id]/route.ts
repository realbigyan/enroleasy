import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  status: z.enum(["PAID", "UNPAID", "VOID"]).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { invoicer: true, student: true, partner: true },
    });
    if (!invoice || invoice.organizationId !== session.organizationId) throw new ApiError(404, "Invoice not found");
    return NextResponse.json({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Invoice not found");

    const body = updateSchema.parse(await req.json());
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...body,
        paidAt: body.status === "PAID" ? new Date() : existing.paidAt,
      },
    });
    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "update",
      entityType: "Invoice",
      entityId: id,
      before: { status: existing.status },
      after: { status: invoice.status },
    });
    return NextResponse.json({ invoice });
  } catch (err) {
    return handleApiError(err);
  }
}
