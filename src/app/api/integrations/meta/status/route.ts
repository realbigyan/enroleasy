import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { isMetaConfigured } from "@/lib/meta";

// Drives the Integrations page's Meta section: whether this EnrolEasy
// deployment even has a Meta Developer App configured yet (a platform-level
// concern, same for every org), and whether *this* org has connected a Page.
export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const integration = await prisma.metaIntegration.findUnique({
      where: { organizationId: session.organizationId },
      select: { pageName: true, status: true, lastLeadAt: true, updatedAt: true },
    });
    return NextResponse.json({
      configured: isMetaConfigured(),
      integration,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
