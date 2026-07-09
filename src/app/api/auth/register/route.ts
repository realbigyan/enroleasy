import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-guard";

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
            status: "TRIALING",
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
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
    await setSessionCookie({
      userId: owner.id,
      organizationId: org.id,
      role: owner.role,
      name: owner.name,
      email: owner.email,
    });

    return NextResponse.json({ organizationId: org.id, slug: org.slug });
  } catch (err) {
    return handleApiError(err);
  }
}
