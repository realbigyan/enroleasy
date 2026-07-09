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

// Same as notifyRole but for a known, explicit set of recipients — used when
// a specific person was picked (e.g. the Documentation Officer assigned to
// an application) rather than "everyone with this role".
export async function notifyUsers(params: {
  organizationId: string;
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const { organizationId, userIds, type, title, body, link } = params;
  if (userIds.length === 0) return;

  const recipients = await prisma.user.findMany({
    where: { id: { in: userIds }, organizationId, isActive: true },
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

// Platform-level notification: every isSuperAdmin user across every org gets
// pinged (e.g. a new consultancy signed up and is waiting for trial
// approval). Each notification is scoped to the recipient's own
// organizationId so it shows up in their normal notification feed, even
// though it's about a different org entirely.
export async function notifySuperAdmins(params: {
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const { type, title, body, link } = params;

  const admins = await prisma.user.findMany({
    where: { isSuperAdmin: true, isActive: true },
    select: { id: true, email: true, name: true, organizationId: true },
  });

  if (admins.length === 0) return;

  type Admin = { id: string; email: string; name: string; organizationId: string };

  await prisma.notification.createMany({
    data: admins.map((a: Admin) => ({
      organizationId: a.organizationId,
      recipientId: a.id,
      type,
      title,
      body,
      link,
    })),
  });

  await Promise.all(
    admins.map(async (a: Admin) => {
      try {
        await sendNotificationEmail(a.email, title, body ?? title, link);
      } catch (err) {
        console.error(`Failed to email superadmin notification to ${a.email}:`, err);
      }
    })
  );
}
