import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const updateSchema = z.object({
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).optional(),
  invoicePrefix: z.string().min(2).max(10).optional(),
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
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const invoicer = await prisma.invoicer.findUnique({ where: { id } });
    if (!invoicer || invoicer.organizationId !== session.organizationId) {
      throw new ApiError(404, "Invoicer not found");
    }
    return NextResponse.json({ invoicer });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN"]);
    const existing = await prisma.invoicer.findUnique({ where: { id } });
    if (!existing || existing.organizationId !== session.organizationId) {
      throw new ApiError(404, "Invoicer not found");
    }
    const body = updateSchema.parse(await req.json());

    if (body.isDefault) {
      // Only one invoicer can be default at a time.
      await prisma.invoicer.updateMany({
        where: { organizationId: session.organizationId },
        data: { isDefault: false },
      });
    }

    const invoicer = await prisma.invoicer.update({ where: { id }, data: body });
    return NextResponse.json({ invoicer });
  } catch (err) {
    return handleApiError(err);
  }
}
