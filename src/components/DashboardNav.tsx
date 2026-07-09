"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap, LayoutDashboard, Users, UserSquare2, ClipboardList,
  CheckSquare, Headphones, LogOut, Handshake, Receipt, ShieldCheck, ScrollText,
  Landmark, SearchCheck, Settings, Crown,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: null },
  { href: "/dashboard/leads", label: "Leads", icon: Users, roles: null },
  { href: "/dashboard/students", label: "Students", icon: UserSquare2, roles: null },
  { href: "/dashboard/applications", label: "Applications", icon: ClipboardList, roles: null },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare, roles: null },
  { href: "/dashboard/test-prep", label: "Test Prep", icon: Headphones, roles: null },
  { href: "/dashboard/institutions", label: "Institutions", icon: Landmark, roles: null },
  { href: "/dashboard/course-search", label: "Course Search", icon: SearchCheck, roles: null },
  { href: "/dashboard/partners", label: "Partners", icon: Handshake, roles: ["OWNER", "ADMIN", "COUNSELOR"] },
  { href: "/dashboard/billing", label: "Billing", icon: Receipt, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/team", label: "Team", icon: ShieldCheck, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/audit-log", label: "Audit Log", icon: ScrollText, roles: ["OWNER", "ADMIN"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: null },
  { href: "/dashboard/superadmin", label: "Superadmin", icon: Crown, roles: null, superAdminOnly: true },
];

export function DashboardNav({
  orgName,
  userName,
  role,
  isSuperAdmin,
}: {
  orgName: string;
  userName: string;
  role: string;
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white print:hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-5 font-semibold">
        <GraduationCap className="h-6 w-6 text-indigo-600" /> EnrolEasy
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {nav
          .filter((item) => !item.roles || item.roles.includes(role))
          .filter((item) => !item.superAdminOnly || isSuperAdmin)
          .map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-slate-200 p-4 text-sm">
        <p className="font-medium">{userName}</p>
        <p className="truncate text-xs text-slate-500">{orgName}</p>
        <button
          onClick={logout}
          className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Log out
        </button>
      </div>
    </aside>
  );
}
