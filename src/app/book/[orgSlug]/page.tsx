import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookingForm } from "./BookingForm";

export default async function BookTrialPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
  if (!org) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-xl font-semibold">Book a free consultation with {org.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Tell us a bit about your study/test goals and we&apos;ll reach out.</p>
        <BookingForm orgSlug={orgSlug} />
      </div>
    </div>
  );
}
