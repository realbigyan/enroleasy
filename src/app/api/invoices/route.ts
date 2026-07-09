import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const createSchema = z.object({
  invoicerId: z.string().optional(),
  billedToType: z.enum(["STUDENT", "PARTNER"]),
  studentId: z.string().optional().nullable(),
  partnerId: z.string().optional().nullable(),
  feeType: z.enum(["MANUAL", "MEMBERSHIP", "COMMISSION"]).default("MANUAL"),
  description: z.string().optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  dueDate: z.string().datetime().optional().nullable(),
  // A receipt is just an invoice created already-paid: no dunning needed, no
  // bank/QR shown on the printed document, numbered with the invoicer's
  // receiptPrefix instead of invoicePrefix (falls back to invoicePrefix if unset).
  markPaid: z.boolean().optional().default(false),
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
        amount: body.amount,
        currency: body.currency,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.markPaid ? "PAID" : "UNPAID",
        paidAt: body.markPaid ? new Date() : null,
      },
      include: { invoicer: true, student: true, partner: true },
    });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
