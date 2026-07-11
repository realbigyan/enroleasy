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
  const { data, error } = await resend.emails.send({
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

  // The Resend SDK resolves with { data, error } instead of throwing on
  // failure (invalid sender domain, bad recipient, rate limit, etc.) — surface
  // that as a thrown error so callers/logs actually see it.
  if (error) {
    throw new Error(`Resend failed to send: ${error.name ?? "unknown"} — ${error.message ?? JSON.stringify(error)}`);
  }

  return data;
}

export async function sendOrganizationDeletedEmail(to: string, orgName: string) {
  const resend = getClient();
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your EnrolEasy organization "${orgName}" has been deleted`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4338ca;">Organization deleted</h2>
        <p>This confirms that <strong>${orgName}</strong> and all of its data (leads, students, applications,
        documents, invoices, accounting records, and staff accounts) has been permanently deleted from EnrolEasy,
        as requested.</p>
        <p style="color: #64748b; font-size: 13px;">This action cannot be undone. If you did not request this deletion,
        please contact us immediately.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send: ${error.name ?? "unknown"} — ${error.message ?? JSON.stringify(error)}`);
  }

  return data;
}

export async function sendNotificationEmail(to: string, title: string, body: string, link?: string) {
  const resend = getClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://enroleasy.com";
  const fullLink = link ? (link.startsWith("http") ? link : `${appUrl}${link}`) : null;
  const { data, error } = await resend.emails.send({
    from: FROM,
    to,
    subject: title,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #4338ca;">${title}</h2>
        <p>${body}</p>
        ${fullLink ? `<p><a href="${fullLink}" style="display: inline-block; background: #4f46e5; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">View in EnrolEasy</a></p>` : ""}
      </div>
    `,
  });

  if (error) {
    throw new Error(`Resend failed to send: ${error.name ?? "unknown"} — ${error.message ?? JSON.stringify(error)}`);
  }

  return data;
}
