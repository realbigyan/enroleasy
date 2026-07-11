import { authenticator } from "otplib";
import QRCode from "qrcode";

// Thin wrapper around otplib so every call site uses the same TOTP config
// (RFC 6238 defaults: 30s step, 6 digits) and no one has to import otplib
// directly.
authenticator.options = { window: 1 };

export function generateTwoFactorSecret() {
  return authenticator.generateSecret();
}

export function verifyTwoFactorToken(token: string, secret: string) {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function generateTwoFactorQrCode(email: string, secret: string) {
  const otpauth = authenticator.keyuri(email, "EnrolEasy", secret);
  return QRCode.toDataURL(otpauth);
}
