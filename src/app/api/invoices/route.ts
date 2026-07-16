import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { postInvoiceAccrual, postInvoicePayment } from "@/lib/accounting/invoice-posting";
import { logAudit } from "@/lib/audit";

const lineItemSchema = z.object({
  hsCode: z.string().optional().nullable(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  rate: z.number().nonnegative(),
});

const createSchema = z.object({
  invoicerId: z.string().optional(),
  billedToType: z.enum(["STUDENT", "PARTNER"]),
  studentId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  feeType: z.enum(["MANUAL", "MEMBERSHIP", "COMMISSION"]).default("MANUAL"),
  description: z.string().optional().nullable(),
  // Either a flat amount, or itemized lineItems (S.N / H.S. Code / Description /
  // Qty / Rate) whose quantity*rate sum becomes the taxable amount — lineItems
  // takes precedence when provided and non-empty.
  amount: z.number().positive().optional(),
  lineItems: z.array(lineItemSchema).optional(),
  includeVat: z.boolean().optional().default(false),
  currency: z.string().default("USD"),
  dueDate: z.string().datetime().optional().nullable(),
  // A receipt is just an invoice created already-paid: no dunning needed, no
  // bank/QR shown on the printed document, numbered with the invoicer's
  // receiptPrefix instead of invoicePrefix (falls back to invoicePrefix if unset).
  markPaid: z.boolean().optional().default(false),
}).refine((v) => v.amount != null || (v.lineItems && v.lineItems.length > 0), {
  message: "Provide either an amount or at least one line item",
  path: ["amount"],
});

async function generateInvoiceNumber(organizationId: string, invoicerId: string, prefix: string) {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { organizationId, invoicerId, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const status = req.nextUrl.searchParams.get("status");
    const billedToType = req.nextUrl.searchParams.get("billedToType");
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: session.organizationId,
        ...(status ? { status: status as "PAID" | "UNPAID" | "VOID" } : {}),
        ...(billedToType ? { billedToType: billedToType as "STUDENT" | "PARTNER" } : {}),
      },
      include: { invoicer: true, student: true, partner: true },
      orderBy: { issueDate: "desc" },
    });
    return NextResponse.json({ invoices });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const body = createSchema.parse(await req.json());

    const invoicer = body.invoicerId
      ? await prisma.invoicer.findUnique({ where: { id: body.invoicerId } })
      : await prisma.invoicer.findFirst({ where: { organizationId: session.organizationId, isDefault: true } });
    if (!invoicer || invoicer.organizationId !== session.organizationId) {
      throw new ApiError(400, "No valid invoicer found — create an invoicer first");
    }

    const prefix = body.markPaid ? invoicer.receiptPrefix ?? invoicer.invoicePrefix : invoicer.invoicePrefix;
    const invoiceNumber = await generateInvoiceNumber(session.organizationId, invoicer.id, prefix);

    const lineItems = body.lineItems ?? [];
    const amount = lineItems.length > 0
      ? lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0)
      : body.amount!;

    const invoice = await prisma.invoice.create({
      data: {
        organizationId: session.organizationId,
        invoicerId: invoicer.id,
        invoiceNumber,
        billedToType: body.billedToType,
        studentId: body.billedToType === "STUDENT" ? body.studentId : null,
        partnerId: body.billedToType === "PARTNER" ? body.partnerId : null,
        feeType: body.feeType,
        description: body.description,
        amount,
        includeVat: body.includeVat,
        currency: body.currency,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.markPaid ? "PAID" : "UNPAID",
        paidAt: body.markPaid ? new Date() : null,
        lineItems: lineItems.length > 0
          ? {
              create: lineItems.map((li, i) => ({
                hsCode: li.hsCode || null,
                description: li.description,
                quantity: li.quantity,
                rate: li.rate,
                amount: li.quantity * li.rate,
                order: i,
              })),
            }
          : undefined,
      },
      include: { invoicer: true, student: true, partner: true, lineItems: { orderBy: { order: "asc" } } },
    });

    // Auto-post to the accounting ledger (NPR invoices only — see
    // invoice-posting.ts). Failures here shouldn't block invoice creation
    // for the CRM user, so log rather than throw.
    try {
      await postInvoiceAccrual(invoice, session.userId);
      if (invoice.status === "PAID" && invoice.paidAt) {
        await postInvoicePayment(invoice, session.userId, invoice.paidAt);
      }
    } catch (postingErr) {
      console.error("Failed to auto-post invoice to ledger", invoice.id, postingErr);
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "Invoice",
      entityId: invoice.id,
      after: invoice,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
