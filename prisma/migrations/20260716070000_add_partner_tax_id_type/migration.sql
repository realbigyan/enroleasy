-- Partner's own PAN/VAT registration type, printed under "M/S" on invoices
-- billed to them (e.g. "VAT no: 604251480" vs "PAN no: ...").
ALTER TABLE "partners" ADD COLUMN "taxIdType" "TaxIdType";
