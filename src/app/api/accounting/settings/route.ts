import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";

// Org-level tax registration setting — VAT_REGISTERED orgs charge 13% VAT
// on invoices and use the 1.5%/15% TDS split on expenses per Income Tax
// Act 2058; PAN_ONLY orgs don't charge VAT. Drives the TDS rate suggestion
// on the expense form (suggestExpenseTdsRate) and is shown on the VAT
// summary report.
const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

const updateSchema = z.object({
  taxRegistrationType: z.enum(["VAT_REGISTERED", "PAN_ONLY"]).nullable(),
  panVatNumber: z.string().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const organization = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { id: true, name: true, taxRegistrationType: true, panVatNumber: true },
    });
    return NextResponse.json({ organization });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const body = updateSchema.parse(await req.json());
    const organization = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        taxRegistrationType: body.taxRegistrationType,
        panVatNumber: body.panVatNumber,
      },
      select: { id: true, name: true, taxRegistrationType: true, panVatNumber: true },
    });
    return NextResponse.json({ organization });
  } catch (err) {
    return handleApiError(err);
  }
}
