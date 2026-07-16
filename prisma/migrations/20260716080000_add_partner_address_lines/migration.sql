-- Split Partner.address into addressLine1/2/3 (matches Invoicer's existing
-- address-line convention). Existing single-line values are preserved as
-- addressLine1; line 2 and 3 start empty.
ALTER TABLE "partners" RENAME COLUMN "address" TO "addressLine1";
ALTER TABLE "partners" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "partners" ADD COLUMN "addressLine3" TEXT;
