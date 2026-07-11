import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError, ApiError } from "@/lib/api-guard";
import { parseCsv } from "@/lib/csv";
import { logAudit } from "@/lib/audit";
import type { LeadSource } from "@prisma/client";

// Bulk CSV import — option 3 of the lead-intake feature. A generic,
// always-available fallback: no external accounts or approval needed, but
// it's a manual step (export from Meta Ads Manager, or any other source,
// upload here) rather than a live feed like options 1 and 2.
const MAX_ROWS = 2000;

const bodySchema = z.object({
  csvText: z.string().min(1),
  mapping: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    interestedCountry: z.string().optional(),
    targetIntake: z.string().optional(),
    externalId: z.string().optional(),
  }),
  defaultSource: z.enum([
    "WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EVENT",
    "PARTNER_AGENT", "META_ADS", "CSV_IMPORT", "OTHER",
  ]).default("CSV_IMPORT"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession(["OWNER", "ADMIN", "COUNSELOR"]);
    const { csvText, mapping, defaultSource } = bodySchema.parse(await req.json());

    const { rows } = parseCsv(csvText);
    if (rows.length === 0) throw new ApiError(400, "No data rows found in that file");
    if (rows.length > MAX_ROWS) {
      throw new ApiError(413, `That file has ${rows.length} rows — imports are capped at ${MAX_ROWS} at a time. Split it into smaller files.`);
    }
    if (!mapping.fullName) throw new ApiError(400, "Map a column to Full name before importing");

    // Pull existing leads once so we can dedupe in-memory instead of one
    // query per row. Fine at the scale a single consultancy's Lead table
    // realistically reaches; revisit if that stops being true.
    const existing = await prisma.lead.findMany({
      where: { organizationId: session.organizationId },
      select: { email: true, phone: true, externalId: true },
    });
    const existingEmails = new Set(existing.map((l) => l.email?.toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existing.map((l) => l.phone).filter(Boolean));
    const existingExternalIds = new Set(existing.map((l) => l.externalId).filter(Boolean));

    let created = 0;
    let skippedDuplicates = 0;
    const errors: { row: number; reason: string }[] = [];
    const seenInThisFile = new Set<string>(); // email/phone/externalId already used earlier in the same file

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const fullName = mapping.fullName ? row[mapping.fullName] : "";
      const email = mapping.email ? row[mapping.email] || null : null;
      const phone = mapping.phone ? row[mapping.phone] || null : null;
      const interestedCountry = mapping.interestedCountry ? row[mapping.interestedCountry] || null : null;
      const targetIntake = mapping.targetIntake ? row[mapping.targetIntake] || null : null;
      const externalId = mapping.externalId ? row[mapping.externalId] || null : null;

      if (!fullName) {
        errors.push({ row: i + 2, reason: "Missing full name" }); // +2: header row + 1-index
        continue;
      }
      if (!email && !phone) {
        errors.push({ row: i + 2, reason: "Missing both email and phone" });
        continue;
      }

      const dedupeKeys = [
        externalId ? `ext:${externalId}` : null,
        email ? `email:${email.toLowerCase()}` : null,
        phone ? `phone:${phone}` : null,
      ].filter(Boolean) as string[];

      const isDuplicate =
        (externalId && existingExternalIds.has(externalId)) ||
        (email && existingEmails.has(email.toLowerCase())) ||
        (phone && existingPhones.has(phone)) ||
        dedupeKeys.some((k) => seenInThisFile.has(k));

      if (isDuplicate) {
        skippedDuplicates++;
        continue;
      }

      try {
        await prisma.lead.create({
          data: {
            organizationId: session.organizationId,
            fullName,
            email,
            phone,
            interestedCountry,
            targetIntake,
            externalId,
            source: defaultSource as LeadSource,
            stage: "NEW",
            lastActivityAt: new Date(),
          },
        });
        created++;
        dedupeKeys.forEach((k) => seenInThisFile.add(k));
      } catch (err) {
        errors.push({ row: i + 2, reason: err instanceof Error ? err.message : "Could not create lead" });
      }
    }

    await logAudit({
      organizationId: session.organizationId,
      actorId: session.userId,
      action: "bulk_import",
      entityType: "Lead",
      entityId: "csv_import",
      after: { createdCount: created, skippedCount: skippedDuplicates },
    });

    return NextResponse.json({ created, skippedDuplicates, errors, totalRows: rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}
