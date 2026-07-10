// Institution type list. Shared between API routes and client UI so both
// stay in sync (same pattern as application-stages.ts).
export const INSTITUTION_TYPES = [
  "PUBLIC_UNIVERSITY",
  "PRIVATE_UNIVERSITY",
  "VET_COLLEGE",
  "PRIVATE_COLLEGE",
  "POLYTECHNIC",
] as const;

export type InstitutionTypeValue = (typeof INSTITUTION_TYPES)[number];

export const INSTITUTION_TYPE_LABELS: Record<InstitutionTypeValue, string> = {
  PUBLIC_UNIVERSITY: "Public University",
  PRIVATE_UNIVERSITY: "Private University",
  VET_COLLEGE: "VET College",
  PRIVATE_COLLEGE: "Private College",
  POLYTECHNIC: "Polytechnic",
};
