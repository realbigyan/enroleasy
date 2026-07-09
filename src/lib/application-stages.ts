// Manually-tracked application stage list (Documentation Officer workflow).
// Shared between the API route and client UI so both stay in sync.
export const STAGE_VALUES = [
  "WAITING_KEY_DOCUMENTS", "APPLICATION", "OFFER_RECEIVED", "OFFER_DENIED",
  "DOCUMENTATION", "WAITING_GS_APPROVAL", "GS_APPROVED", "GS_REJECTED",
  "WAITING_VISA_LODGEMENT", "VISA_LODGED", "VISA_GRANTED", "VISA_REFUSED",
  "LOST", "OTHER",
] as const;

export type ApplicationStageValue = (typeof STAGE_VALUES)[number];

export const STAGE_LABELS: Record<ApplicationStageValue, string> = {
  WAITING_KEY_DOCUMENTS: "Waiting Key Documents",
  APPLICATION: "Application",
  OFFER_RECEIVED: "Offer Received",
  OFFER_DENIED: "Offer Denied",
  DOCUMENTATION: "Documentation",
  WAITING_GS_APPROVAL: "Waiting GS Approval",
  GS_APPROVED: "GS Approved",
  GS_REJECTED: "GS Rejected",
  WAITING_VISA_LODGEMENT: "Waiting Visa Lodgement",
  VISA_LODGED: "Visa Lodged",
  VISA_GRANTED: "Visa Granted",
  VISA_REFUSED: "Visa Refused",
  LOST: "Lost",
  OTHER: "Other",
};
