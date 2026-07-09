import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/login");

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardNav orgName={org.name} userName={session.name} role={session.role} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}
