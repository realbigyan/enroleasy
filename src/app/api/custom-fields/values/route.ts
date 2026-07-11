import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import type { CustomFieldEntityType } from "@prisma/client";

const ENTITY_TYPES = ["LEAD", "STUDENT", "APPLICATION"] as const;

// Confirms `entityId` is a real row in the caller's org before letting them
// read/write custom field values against it — entityId is just a bare id,
// so without this check one org could probe/overwrite another org's data.
async function assertEntityOwned(organizationId: string, entityType: CustomFieldEntityType, entityId: string) {
  const found = await (entityType === "LEAD"
    ? prisma.lead.findUnique({ where: { id: entityId }, select: { organizationId: true } })
    : entityType === "STUDENT"
    ? prisma.student.findUnique({ where: { id: entityId }, select: { organizationId: true } })
    : prisma.application.findUnique({ where: { id: entityId }, select: { organizationId: true } }));
  if (!found || found.organizationId !== organizationId) {
    throw new ApiError(404, "Record not found");
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    const entityType = z.enum(ENTITY_TYPES).parse(req.nextUrl.searchParams.get("entityType"));
    const entityId = req.nextUrl.searchParams.get("entityId");
    if (!entityId) throw new ApiError(400, "entityId is required");

    await assertEntityOwned(session.organizationId, entityType, entityId);

    const definitions = await prisma.customFieldDefinition.findMany({
      where: { organizationId: session.organizationId, entityType, isActive: true },
      orderBy: { order: "asc" },
    });
    const values = await prisma.customFieldValue.findMany({
      where: { entityId, definitionId: { in: definitions.map((d) => d.id) } },
    });
    const valueByDefinitionId = Object.fromEntries(values.map((v) => [v.definitionId, v.value]));

    return NextResponse.json({
      fields: definitions.map((d) => ({ ...d, value: valueByDefinitionId[d.id] ?? null })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const putSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string(),
  values: z.array(z.object({ definitionId: z.string(), value: z.string().nullable() })),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR", "DOCUMENTATION_OFFICER", "ADMIN_ASSIST"]);
    const body = putSchema.parse(await req.json());

    await assertEntityOwned(session.organizationId, body.entityType, body.entityId);

    const definitions = await prisma.customFieldDefinition.findMany({
      where: { organizationId: session.organizationId, entityType: body.entityType },
    });
    const definitionIds = new Set(definitions.map((d) => d.id));
    for (const v of body.values) {
      if (!definitionIds.has(v.definitionId)) throw new ApiError(400, "Unknown custom field");
    }

    await prisma.$transaction(
      body.values.map((v) =>
        prisma.customFieldValue.upsert({
          where: { definitionId_entityId: { definitionId: v.definitionId, entityId: body.entityId } },
          create: { definitionId: v.definitionId, entityId: body.entityId, value: v.value },
          update: { value: v.value },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
