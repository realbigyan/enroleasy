import { generateSecret, verify, generateURI } from "otplib";
import { createGuardrails } from "@otplib/core";
import QRCode from "qrcode";

// Thin wrapper around otplib so every call site uses the same TOTP config
// and no one has to import otplib directly.
//
// Upgraded from otplib v12's `authenticator` singleton to v13's functional
// API (v13 is a full rewrite — see https://otplib.yeojz.dev/guide/v12-adapter.html).
// Two things had to be preserved for backward compatibility with staff who
// already enrolled in 2FA under the old library:
//   1. v13 enforces a 16-byte minimum secret length by default, but v12's
//      `authenticator.generateSecret()` only ever produced 10-byte secrets
//      (16 base32 characters). Every already-enrolled user's stored secret
//      is 10 bytes, so verifying them would now throw SecretTooShortError
//      without this override. This only relaxes the floor for *verifying*
//      pre-existing secrets — newly generated secrets (generateTwoFactorSecret,
//      below) still come out at v13's full recommended length (20 bytes).
//   2. v12's `window: 1` (±1 time-step) is v13's `epochTolerance: 30`
//      (±30 seconds) for the default 30-second TOTP period.
const LEGACY_SECRET_GUARDRAILS = createGuardrails({ MIN_SECRET_BYTES: 10 });
const EPOCH_TOLERANCE_SECONDS = 30;

export function generateTwoFactorSecret() {
  return generateSecret();
}

export async function verifyTwoFactorToken(token: string, secret: string) {
  try {
    const result = await verify({
      secret,
      token,
      epochTolerance: EPOCH_TOLERANCE_SECONDS,
      guardrails: LEGACY_SECRET_GUARDRAILS,
    });
    return result.valid;
  } catch {
    return false;
  }
}

export async function generateTwoFactorQrCode(email: string, secret: string) {
  const otpauth = generateURI({ issuer: "EnrolEasy", label: email, secret });
  return QRCode.toDataURL(otpauth);
}
