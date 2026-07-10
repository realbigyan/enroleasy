import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { slug: true },
    });
    if (!org) throw new ApiError(404, "Organization not found");

    const kioskUrl = `${req.nextUrl.origin}/book/${org.slug}?kiosk=1`;
    const png = await QRCode.toBuffer(kioskUrl, {
      type: "png",
      width: 320,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    });

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
