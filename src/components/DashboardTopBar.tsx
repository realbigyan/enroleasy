import { NotificationBell } from "./NotificationBell";
import { LogoMark } from "./Logo";

// Sits above the page content (not in the sidebar) so a long business name
// and a properly-sized logo have room to breathe — the old sidebar header
// truncated both. Falls back to the EnrolEasy mark when the org hasn't
// uploaded its own logo yet (see Settings > Organization Branding).
export function DashboardTopBar({ orgName, orgLogoUrl }: { orgName: string; orgLogoUrl?: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        {orgLogoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, not a local asset */}
            <img src={orgLogoUrl} alt={orgName} className="h-10 w-10 shrink-0 rounded object-contain" />
            <p className="truncate text-base font-medium text-slate-900">{orgName}</p>
          </>
        ) : (
          <>
            <LogoMark className="h-8 w-8 shrink-0" />
            <p className="text-base font-medium text-slate-900">EnrolEasy</p>
          </>
        )}
      </div>
      <NotificationBell />
    </div>
  );
}
