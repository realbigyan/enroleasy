-- Partner PAN/VAT number + address, printed on invoices billed to them
ALTER TABLE "partners" ADD COLUMN "address" TEXT;
ALTER TABLE "partners" ADD COLUMN "panNumber" TEXT;

-- Invoice: 13% VAT display toggle (VAT itself is not stored/posted separately;
-- computed at print time from the taxable `amount`)
ALTER TABLE "invoices" ADD COLUMN "includeVat" BOOLEAN NOT NULL DEFAULT false;

-- Itemized invoice line rows (S.N / H.S. Code / Description / Qty / Rate / Amount)
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "hsCode" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
