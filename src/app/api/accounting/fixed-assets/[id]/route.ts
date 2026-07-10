import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const ACCOUNTING_ROLES = ["OWNER", "ADMIN"] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fixedAsset = await prisma.fixedAsset.findUnique({
      where: { id },
      include: { account: true, paymentAccount: true, depreciationEntries: { orderBy: { fiscalYear: "asc" } } },
    });
    if (!fixedAsset || fixedAsset.organizationId !== session.organizationId) throw new ApiError(404, "Fixed asset not found");
    return NextResponse.json({ fixedAsset });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession([...ACCOUNTING_ROLES]);
    const fixedAsset = await prisma.fixedAsset.findUnique({ where: { id } });
    if (!fixedAsset || fixedAsset.organizationId !== session.organizationId) throw new ApiError(404, "Fixed asset not found");

    await prisma.journalEntry.deleteMany({ where: { sourceType: "FIXED_ASSET", sourceId: id } });
    const depreciationEntries = await prisma.depreciationEntry.findMany({ where: { fixedAssetId: id } });
    await prisma.journalEntry.deleteMany({
      where: { sourceType: "DEPRECIATION", sourceId: { in: depreciationEntries.map((d: { id: string }) => d.id) } },
    });
    await prisma.fixedAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
