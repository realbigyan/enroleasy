import { Resend } from "resend";

// Lazily constructed so builds/tests without RESEND_API_KEY don't crash at import time.
let client: Resend | null = null;
function getClient() {
  if (!client) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "EnrolEasy <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const resend = getClient();
  await resend.emails.send({
    from: FROM,
    to,
    subject: "Reset your EnrolEasy password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4338ca;">Reset your password</h2>
        <p>We received a request to reset the password for your EnrolEasy account.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
            Reset password
          </a>
        </p>
        <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px;">If the button doesn't work, copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}
