import { prisma } from "./prisma";
import { sendNotificationEmail } from "./email";
import type { Role } from "@prisma/client";

// Creates an in-app Notification for every active user of the given role(s)
// in an organization, and best-effort emails them too. Email failures are
// logged but never thrown — a Resend outage shouldn't break the action that
// triggered the notification (e.g. creating an application).
export async function notifyRole(params: {
  organizationId: string;
  roles: Role[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const { organizationId, roles, type, title, body, link } = params;

  const recipients = await prisma.user.findMany({
    where: { organizationId, role: { in: roles }, isActive: true },
    select: { id: true, email: true, name: true },
  });

  if (recipients.length === 0) return;

  type Recipient = { id: string; email: string; name: string };

  await prisma.notification.createMany({
    data: recipients.map((r: Recipient) => ({
      organizationId,
      recipientId: r.id,
      type,
      title,
      body,
      link,
    })),
  });

  await Promise.all(
    recipients.map(async (r: Recipient) => {
      try {
        await sendNotificationEmail(r.email, title, body ?? title, link);
      } catch (err) {
        console.error(`Failed to email notification to ${r.email}:`, err);
      }
    })
  );
}
