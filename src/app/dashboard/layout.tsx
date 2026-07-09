import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  // isSuperAdmin is intentionally not part of the session JWT (see api-guard's
  // requireSuperAdmin), so re-check it fresh here just to decide nav visibility.
  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardNav
        orgName={org.name}
        userName={session.name}
        role={session.role}
        isSuperAdmin={currentUser?.isSuperAdmin ?? false}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
