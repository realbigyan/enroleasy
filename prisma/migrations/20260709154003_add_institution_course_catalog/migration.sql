-- CreateEnum
CREATE TYPE "LanguageTestType" AS ENUM ('IELTS', 'PTE', 'DUOLINGO', 'MOI', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "StudentLanguageStatus" AS ENUM ('IELTS', 'PTE', 'DUOLINGO', 'MOI', 'NONE');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "academicGpaPercent" DOUBLE PRECISION,
ADD COLUMN     "englishScore" DOUBLE PRECISION,
ADD COLUMN     "englishTestType" "StudentLanguageStatus",
ADD COLUMN     "gapYears" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "introduction" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT,
    "durationMonths" INTEGER,
    "feeAmount" DOUBLE PRECISION,
    "feeCurrency" TEXT NOT NULL DEFAULT 'USD',
    "careerOutcomes" TEXT,
    "description" TEXT,
    "minGpaPercent" DOUBLE PRECISION,
    "maxGapYears" INTEGER,
    "languageTestType" "LanguageTestType" NOT NULL DEFAULT 'NOT_REQUIRED',
    "languageMinScore" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institutions_organizationId_country_idx" ON "institutions"("organizationId", "country");

-- CreateIndex
CREATE INDEX "courses_institutionId_idx" ON "courses"("institutionId");

-- AddForeignKey
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
