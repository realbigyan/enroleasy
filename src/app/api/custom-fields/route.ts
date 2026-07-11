import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

const ENTITY_TYPES = ["LEAD", "STUDENT", "APPLICATION"] as const;
const FIELD_TYPES = ["TEXT", "NUMBER", "DATE", "SELECT"] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const entityType = req.nextUrl.searchParams.get("entityType");
    const parsed = z.enum(ENTITY_TYPES).optional().parse(entityType ?? undefined);
    const definitions = await prisma.customFieldDefinition.findMany({
      where: {
        organizationId: session.organizationId,
        ...(parsed ? { entityType: parsed } : {}),
      },
      orderBy: [{ entityType: "asc" }, { order: "asc" }],
    });
    return NextResponse.json({ definitions });
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  name: z.string().min(1).max(60),
  fieldType: z.enum(FIELD_TYPES).default("TEXT"),
  options: z.array(z.string().min(1)).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN"]);
    const body = createSchema.parse(await req.json());

    const count = await prisma.customFieldDefinition.count({
      where: { organizationId: session.organizationId, entityType: body.entityType },
    });

    const definition = await prisma.customFieldDefinition.create({
      data: {
        organizationId: session.organizationId,
        entityType: body.entityType,
        name: body.name,
        fieldType: body.fieldType,
        options: body.fieldType === "SELECT" ? body.options : [],
        order: count,
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "create",
      entityType: "CustomFieldDefinition",
      entityId: definition.id,
      after: definition,
    });

    return NextResponse.json({ definition }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
