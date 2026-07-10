-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('PUBLIC_UNIVERSITY', 'PRIVATE_UNIVERSITY', 'VET_COLLEGE', 'PRIVATE_COLLEGE', 'POLYTECHNIC');

-- AlterTable
ALTER TABLE "institutions" ADD COLUMN     "locations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "type" "InstitutionType";

-- CreateTable
CREATE TABLE "institution_rankings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institution_rankings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "institution_rankings_institutionId_idx" ON "institution_rankings"("institutionId");

-- AddForeignKey
ALTER TABLE "institution_rankings" ADD CONSTRAINT "institution_rankings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
