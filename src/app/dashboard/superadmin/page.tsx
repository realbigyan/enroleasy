import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SuperadminOrganizationsClient } from "./SuperadminOrganizationsClient";

export default async function SuperadminPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isSuperAdmin: true },
  });
  // 404 rather than 403 so this page's existence isn't revealed to non-superadmins.
  if (!user?.isSuperAdmin) notFound();

  return <SuperadminOrganizationsClient />;
}
