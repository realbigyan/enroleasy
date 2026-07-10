import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./BookingForm";

export default async function BookTrialPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ kiosk?: string }>;
}) {
  const { orgSlug } = await params;
  const { kiosk } = await searchParams;
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  // Kiosk mode (?kiosk=1) is the reception/walk-in variant: full-screen,
  // touch-friendly, resets itself after each submission, and tags leads as
  // WALK_IN instead of WEBSITE. Reached via the QR code / shareable link on
  // the Integrations page, meant for a tablet at a consultancy's front desk
  // or a visitor scanning it on their own phone while waiting.
  const isKiosk = kiosk === "1";

  return (
    <div className={isKiosk ? "flex min-h-screen items-center justify-center bg-slate-50 p-6" : "flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12"}>
      <div className={isKiosk ? "w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-10 shadow-sm" : "w-full max-w-md rounded-xl border border-slate-200 bg-white p-8"}>
        {org.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- external Cloudinary URL, org-supplied
          <img src={org.logoUrl} alt={org.name} className={isKiosk ? "mx-auto mb-6 h-16 object-contain" : "mb-4 h-10 object-contain"} />
        )}
        <h1 className={isKiosk ? "text-center text-3xl font-semibold" : "text-xl font-semibold"}>
          {isKiosk ? `Welcome to ${org.name}` : `Book a free consultation with ${org.name}`}
        </h1>
        <p className={isKiosk ? "mt-2 text-center text-base text-slate-500" : "mt-1 text-sm text-slate-500"}>
          {isKiosk
            ? "Tell us a little about yourself and a counsellor will be with you shortly."
            : "Tell us a bit about your study/test goals and we'll reach out."}
        </p>
        <BookingForm orgSlug={orgSlug} kiosk={isKiosk} />
      </div>
    </div>
  );
}
