import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";

const STAFF_ROLES = ["OWNER", "ADMIN", "ADMIN_ASSIST", "COUNSELOR", "TRAINER", "EXAMINER", "CONTENT_MANAGER", "DOCUMENTATION_OFFICER"] as const;

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(STAFF_ROLES),
  password: z.string().min(8),
});

export async function GET() {
  try {
    const session = await requireSession();
    const staff = await prisma.user.findMany({
      where: { organizationId: session.organizationId, role: { not: "STUDENT" } },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ staff });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createSchema.parse(await req.json());

    const existing = await prisma.user.findFirst({
      where: { organizationId: session.organizationId, email: body.email.toLowerCase() },
    });
    if (existing) throw new ApiError(409, "A user with this email already exists");

    const [activeStaffCount, subscription] = await Promise.all([
      prisma.user.count({
        where: { organizationId: session.organizationId, role: { not: "STUDENT" }, isActive: true },
      }),
      prisma.subscription.findUnique({ where: { organizationId: session.organizationId } }),
    ]);
    const seatLimit = subscription?.seats ?? 5;
    if (activeStaffCount >= seatLimit) {
      throw new ApiError(
        403,
        `Seat limit reached (${seatLimit}). Deactivate a staff member or ask your admin to upgrade the plan to add more.`
      );
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        organizationId: session.organizationId,
        name: body.name,
        email: body.email.toLowerCase(),
        role: body.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
