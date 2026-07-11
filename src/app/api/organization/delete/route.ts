import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { verifyPassword, clearSessionCookie } from "@/lib/auth";
import { sendOrganizationDeletedEmail } from "@/lib/email";

const bodySchema = z.object({
  confirmName: z.string().min(1),
  password: z.string().min(1),
});

// GDPR "right to erasure" for a whole organization. OWNER-only, and gated
// behind two independent confirmations (typing the exact org name, and the
// requester's own password) since this is a single irreversible action that
// permanently removes every CRM and accounting record for the tenant — there
// is no undo, soft-delete, or grace period.
//
// The actual removal is a single `organization.delete()`: every org-scoped
// table in the schema declares `onDelete: Cascade` on its organization
// relation, so Postgres cascades the deletion through leads, students,
// applications, documents, invoices, the full accounting domain, staff
// accounts, sessions, API keys, pipeline/custom-field config, etc. in one
// statement. Global (non-org) data like the shared institution catalog
// (Institution.organizationId = null) is untouched.
export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER"]);
    const body = bodySchema.parse(await req.json());

    const [organization, user] = await Promise.all([
      prisma.organization.findUnique({ where: { id: session.organizationId } }),
      prisma.user.findUnique({ where: { id: session.userId } }),
    ]);
    if (!organization || !user) throw new ApiError(404, "Organization not found");

    if (body.confirmName.trim() !== organization.name) {
      throw new ApiError(400, "Organization name does not match. Type it exactly as shown to confirm.");
    }
    const validPassword = await verifyPassword(body.password, user.passwordHash);
    if (!validPassword) throw new ApiError(400, "Incorrect password");

    // Best-effort confirmation email, sent before deletion since the user's
    // own row (and thus their email lookup) won't exist afterward. A failure
    // here must not block the deletion itself — the org owner explicitly
    // confirmed with their name + password, and that should not silently
    // fail just because outbound email had an issue.
    try {
      await sendOrganizationDeletedEmail(user.email, organization.name);
    } catch (err) {
      console.error("Failed to send organization-deleted confirmation email", err);
    }

    await prisma.organization.delete({ where: { id: organization.id } });
    await clearSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
