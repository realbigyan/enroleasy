import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { META_PENDING_PAGES_COOKIE, type MetaPage } from "@/lib/meta";

const STATE_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

// Returns the Pages found mid-connect, for the picker shown when a Facebook
// user manages more than one Page. Never returns the page access tokens —
// only id/name, which is all the picker UI needs.
export async function GET() {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const cookieStore = await cookies();
    const token = cookieStore.get(META_PENDING_PAGES_COOKIE)?.value;
    if (!token) throw new ApiError(404, "No pending Facebook connection found — start over from Integrations.");

    const claims = jwt.verify(token, STATE_SECRET) as { organizationId: string; pages: MetaPage[] };
    if (claims.organizationId !== session.organizationId) throw new ApiError(403, "This connection belongs to a different organization");

    return NextResponse.json({ pages: claims.pages.map((p) => ({ id: p.id, name: p.name })) });
  } catch (err) {
    return handleApiError(err);
  }
}
