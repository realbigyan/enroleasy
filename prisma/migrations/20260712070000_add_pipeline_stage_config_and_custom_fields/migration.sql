-- Pipeline stage customization (per-org reorder/relabel/hide of the fixed LeadStage enum)
CREATE TABLE "pipeline_stage_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stage" "LeadStage" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pipeline_stage_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pipeline_stage_configs_organizationId_stage_key" ON "pipeline_stage_configs"("organizationId", "stage");
CREATE INDEX "pipeline_stage_configs_organizationId_order_idx" ON "pipeline_stage_configs"("organizationId", "order");

ALTER TABLE "pipeline_stage_configs" ADD CONSTRAINT "pipeline_stage_configs_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Generic custom fields on leads/students/applications
CREATE TYPE "CustomFieldEntityType" AS ENUM ('LEAD', 'STUDENT', 'APPLICATION');
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'SELECT');

CREATE TABLE "custom_field_definitions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "entityType" "CustomFieldEntityType" NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" "CustomFieldType" NOT NULL DEFAULT 'TEXT',
    "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_field_definitions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "custom_field_definitions_organizationId_entityType_idx" ON "custom_field_definitions"("organizationId", "entityType");

ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "custom_field_values" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "custom_field_values_definitionId_entityId_key" ON "custom_field_values"("definitionId", "entityId");
CREATE INDEX "custom_field_values_entityId_idx" ON "custom_field_values"("entityId");

ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_definitionId_fkey"
    FOREIGN KEY ("definitionId") REFERENCES "custom_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
