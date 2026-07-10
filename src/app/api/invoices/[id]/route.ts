import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { postInvoicePayment, reverseInvoiceAccrual, reverseInvoicePayment } from "@/lib/accounting/invoice-posting";

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
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) throw new ApiError(404, "Invoice not found");

    const body = updateSchema.parse(await req.json());
    const paidAt = body.status === "PAID" ? new Date() : existing.paidAt;
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        ...body,
        paidAt,
      },
    });

    // Keep the ledger in sync with status transitions. Failures here
    // shouldn't block the status update for the CRM user, so log rather
    // than throw.
    try {
      if (existing.status !== "PAID" && invoice.status === "PAID" && paidAt) {
        await postInvoicePayment(invoice, session.userId, paidAt);
      } else if (existing.status === "PAID" && invoice.status !== "PAID") {
        await reverseInvoicePayment(invoice.id);
      }
      if (invoice.status === "VOID") {
        await reverseInvoicePayment(invoice.id);
        await reverseInvoiceAccrual(invoice.id);
      }
    } catch (postingErr) {
      console.error("Failed to sync invoice ledger entries", invoice.id, postingErr);
    }

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
