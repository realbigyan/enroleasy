import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/DashboardNav";
import { PendingApprovalScreen } from "@/components/PendingApprovalScreen";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    include: { subscription: true },
  });
  if (!org) redirect("/login");

  // isSuperAdmin is intentionally not part of the session JWT (see api-guard's
  // requireSuperAdmin), so re-check it fresh here just to decide nav visibility.
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;

  // New signups start out unapproved — nobody (except a platform superadmin,
  // who needs the dashboard to actually go approve them) gets into the CRM
  // until a superadmin turns this into an active trial.
  if (org.subscription?.status === "PENDING_APPROVAL" && !isSuperAdmin) {
    return <PendingApprovalScreen orgName={org.name} />;
  }

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardNav
        orgName={org.name}
        orgLogoUrl={org.logoUrl}
        userName={session.name}
        role={session.role}
        isSuperAdmin={isSuperAdmin}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
