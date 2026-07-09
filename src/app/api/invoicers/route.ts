import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

const brandingFields = {
  receiptPrefix: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  addressLine1: z.string().optional().nullable(),
  addressLine2: z.string().optional().nullable(),
  taxIdType: z.enum(["PAN", "VAT"]).optional().nullable(),
  taxIdNumber: z.string().optional().nullable(),
  bankAccountName: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankSwift: z.string().optional().nullable(),
  qrCodeUrl: z.string().url().optional().nullable(),
  footerWebsite: z.string().optional().nullable(),
  footerPhone: z.string().optional().nullable(),
  footerEmail: z.string().email().optional().nullable(),
};

const createSchema = z.object({
  name: z.string().min(2),
  invoicePrefix: z.string().min(2).max(10),
  ...brandingFields,
});

export async function GET() {
  try {
    const session = await requireSession();
    const invoicers = await prisma.invoicer.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ invoicers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createSchema.parse(await req.json());

    const existingCount = await prisma.invoicer.count({ where: { organizationId: session.organizationId } });
    const invoicer = await prisma.invoicer.create({
      data: {
        ...body,
        organizationId: session.organizationId,
        isDefault: existingCount === 0, // first invoicer becomes default automatically
      },
    });
    return NextResponse.json({ invoicer }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
