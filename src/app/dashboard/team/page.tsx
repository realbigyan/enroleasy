import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeamPageClient } from "./TeamPageClient";

// Staff management (add/edit/deactivate/delete, reset password, change role)
// is OWNER-only — an ADMIN shouldn't be able to manage their own peers or
// grant/revoke access for other staff. The underlying /api/team* routes
// enforce this too; this page-level check just avoids showing the page (and
// a wall of 403s) to anyone who isn't the owner.
export default async function TeamPage() {
  const session = await getSession();
  if (!session || session.role !== "OWNER") redirect("/dashboard");
  return <TeamPageClient />;
}
