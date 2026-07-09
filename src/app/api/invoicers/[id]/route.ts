import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

const updateSchema = z.object({
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(2).optional(),
});

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
