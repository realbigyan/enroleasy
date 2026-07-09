-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "assignedDocOfficerId" TEXT;

-- CreateIndex
CREATE INDEX "applications_organizationId_assignedDocOfficerId_idx" ON "applications"("organizationId", "assignedDocOfficerId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_assignedDocOfficerId_fkey" FOREIGN KEY ("assignedDocOfficerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
