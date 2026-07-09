import { prisma } from "./prisma";

// Records a before/after snapshot of an admin action for accountability.
// Fire-and-forget: audit logging should never block or fail the main request.
export async function logAudit(params: {
  organizationId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        beforeJson: params.before === undefined ? undefined : (params.before as object),
        afterJson: params.after === undefined ? undefined : (params.after as object),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
