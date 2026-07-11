import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-guard";
import { notifySuperAdmins } from "@/lib/notify";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const schema = z.object({
  organizationName: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    // 5 signups / 10 minutes per IP - signup is a heavier operation
    // (creates an org + notifies superadmins), so the limit is stricter
    // than login.
    const { allowed, retryAfterSeconds } = await checkRateLimit(`register:${ip}`, 5, 600);
    if (!allowed) return rateLimitResponse(retryAfterSeconds);

    const body = schema.parse(await req.json());
    const baseSlug = slugify(body.organizationName) || "consultancy";
    let slug = baseSlug;
    let suffix = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const passwordHash = await hashPassword(body.password);

    const org = await prisma.organization.create({
      data: {
        name: body.organizationName,
        slug,
        subscription: {
          create: {
            plan: "STARTER",
            status: "PENDING_APPROVAL",
          },
        },
        users: {
          create: {
            name: body.fullName,
            email: body.email.toLowerCase(),
            passwordHash,
            role: "OWNER",
          },
        },
      },
      include: { users: true },
    });

    const owner = org.users[0];
    await setSessionCookie(
      {
        userId: owner.id,
        organizationId: org.id,
        role: owner.role,
        name: owner.name,
        email: owner.email,
      },
      { userAgent: req.headers.get("user-agent"), ipAddress: ip }
    );

    notifySuperAdmins({
      type: "org_pending_approval",
      title: "New consultancy awaiting trial approval",
      body: `${org.name} just signed up (owner: ${owner.name}). Approve their trial in Superadmin.`,
      link: "/dashboard/superadmin",
    }).catch((err) => console.error("Failed to notify superadmins of new signup:", err));

    return NextResponse.json({ organizationId: org.id, slug: org.slug });
  } catch (err) {
    return handleApiError(err);
  }
}
