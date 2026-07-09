import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { cloudinary } from "@/lib/cloudinary";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession(["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "DOCUMENTATION_OFFICER"]);
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document || document.organizationId !== session.organizationId) {
      throw new ApiError(404, "Document not found");
    }
    if (document.publicId) {
      await cloudinary.uploader.destroy(document.publicId).catch(() => null);
    }
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
