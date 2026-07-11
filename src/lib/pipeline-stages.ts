import { prisma } from "./prisma";
import type { LeadStage } from "@prisma/client";

// Fixed enum order — also the default column order for orgs that have
// never customized their pipeline. Kept in one place so seeding and any
// "reset to default" action stay in sync with the Prisma enum.
export const LEAD_STAGE_ORDER: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "TRIAL_BOOKED",
  "TRIAL_DONE",
  "QUALIFIED",
  "COUNSELING",
  "APPLICATION_STARTED",
  "OFFER_RECEIVED",
  "VISA_STAGE",
  "ENROLLED",
  "LOST",
];

export function defaultStageLabel(stage: string): string {
  return stage
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

// Returns every stage's config for an org, seeding one row per LeadStage on
// first call (idempotent: a unique constraint on [organizationId, stage]
// means a racing duplicate seed attempt just no-ops via skipDuplicates).
export async function getOrCreateStageConfigs(organizationId: string) {
  let configs = await prisma.pipelineStageConfig.findMany({
    where: { organizationId },
    orderBy: { order: "asc" },
  });

  if (configs.length === 0) {
    await prisma.pipelineStageConfig.createMany({
      data: LEAD_STAGE_ORDER.map((stage, i) => ({
        organizationId,
        stage,
        label: defaultStageLabel(stage),
        order: i,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    configs = await prisma.pipelineStageConfig.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
    });
  }

  // Guard against a schema/enum change after configs were already seeded
  // for an org (a new LeadStage value added later would otherwise never
  // show up) by backfilling any missing stages, appended at the end.
  const missing = LEAD_STAGE_ORDER.filter((s) => !configs.some((c) => c.stage === s));
  if (missing.length > 0) {
    const maxOrder = configs.reduce((m, c) => Math.max(m, c.order), -1);
    await prisma.pipelineStageConfig.createMany({
      data: missing.map((stage, i) => ({
        organizationId,
        stage,
        label: defaultStageLabel(stage),
        order: maxOrder + 1 + i,
        isActive: true,
      })),
      skipDuplicates: true,
    });
    configs = await prisma.pipelineStageConfig.findMany({
      where: { organizationId },
      orderBy: { order: "asc" },
    });
  }

  return configs;
}
