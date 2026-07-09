import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin, handleApiError, ApiError } from "@/lib/api-guard";

const SUBSCRIPTION_PLANS = ["STARTER", "GROWTH", "SCALE"] as const;
const SUBSCRIPTION_STATUSES = ["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED"] as const;

const updateSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  seats: z.number().int().min(1).max(10000).optional(),
  // ISO date string ("2026-08-01") or null to clear the trial end date.
  trialEndsAt: z.string().min(1).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin();
    const { id } = await params;
    const body = updateSchema.parse(await req.json());

    const org = await prisma.organization.findUnique({ where: { id } });
    if (!org) throw new ApiError(404, "Organization not found");

    const subscription = await prisma.subscription.upsert({
      where: { organizationId: id },
      create: {
        organizationId: id,
        plan: body.plan ?? "STARTER",
        status: body.status ?? "TRIALING",
        seats: body.seats ?? 5,
        trialEndsAt: body.trialEndsAt === undefined ? undefined : body.trialEndsAt ? new Date(body.trialEndsAt) : null,
      },
      update: {
        ...(body.plan !== undefined ? { plan: body.plan } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.seats !== undefined ? { seats: body.seats } : {}),
        ...(body.trialEndsAt !== undefined
          ? { trialEndsAt: body.trialEndsAt ? new Date(body.trialEndsAt) : null }
          : {}),
      },
    });

    return NextResponse.json({ subscription });
  } catch (err) {
    return handleApiError(err);
  }
}
