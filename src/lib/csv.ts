// Minimal, dependency-free CSV parser/serializer. Handles quoted fields
// (commas and newlines inside quotes) and escaped double-quotes (""), which
// covers both hand-made spreadsheets and Meta Ads Manager's lead exports.
// Isomorphic — used both client-side (import preview) and server-side (the
// authoritative parse in the import API route).

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const rawRows = parseRows(text);
  if (rawRows.length === 0) return { headers: [], rows: [] };

  const headers = rawRows[0].map((h) => h.trim());
  const rows = rawRows.slice(1)
    .filter((r) => r.some((cell) => cell.trim().length > 0)) // skip blank lines
    .map((r) => {
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (r[i] ?? "").trim();
      });
      return row;
    });

  return { headers, rows };
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normalize line endings so \r\n and \r don't produce phantom blank rows.
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (inQuotes) {
      if (ch === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Last field/row (files without a trailing newline)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Best-effort auto-mapping from common CSV header spellings (including Meta
// Ads Manager's lead-export column names) to our Lead fields. Users can
// still override every mapping in the import UI before confirming.
const HEADER_ALIASES: Record<string, string[]> = {
  fullName: ["full name", "fullname", "name", "full_name"],
  email: ["email", "email address", "email_address"],
  phone: ["phone", "phone number", "phone_number", "mobile", "contact number"],
  interestedCountry: ["interested country", "country", "interestedcountry"],
  targetIntake: ["intake", "target intake", "targetintake"],
  externalId: ["id", "lead id", "leadid", "lead_id"],
};

export function guessMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const normalizedHeaders = headers.map((h) => ({ original: h, norm: h.trim().toLowerCase() }));
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const match = normalizedHeaders.find((h) => aliases.includes(h.norm));
    if (match) mapping[field] = match.original;
  }
  return mapping;
}
