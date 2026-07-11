import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, handleApiError } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";

// Full data-portability export for an organization (GDPR "right to access /
// data portability"). OWNER-only. Every org-scoped table is included; fields
// that are secrets rather than data the org itself entered (password hashes,
// 2FA secrets, API key hashes, OAuth tokens) are deliberately left out.
// Uploaded files (documents, receipts) aren't re-downloaded into the export —
// their Cloudinary URLs are included instead, so the org can fetch the actual
// files separately if needed.
export async function GET() {
  try {
    const session = await requireSession(["OWNER"]);
    const organizationId = session.organizationId;

    const [
      organization,
      subscription,
      users,
      leads,
      students,
      applications,
      tasks,
      notes,
      destinations,
      partners,
      invoicers,
      invoices,
      documents,
      activityLogs,
      institutions,
      notifications,
      accounts,
      journalEntries,
      vendors,
      expenses,
      bankAccounts,
      fixedAssets,
      employees,
      apiKeys,
      pipelineStageConfigs,
      customFieldDefinitions,
      metaIntegration,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.subscription.findUnique({ where: { organizationId } }),
      prisma.user.findMany({
        where: { organizationId },
        select: {
          id: true, name: true, email: true, role: true, avatarUrl: true,
          isActive: true, isSuperAdmin: true, twoFactorEnabled: true,
          createdAt: true, updatedAt: true,
        },
      }),
      prisma.lead.findMany({ where: { organizationId } }),
      prisma.student.findMany({
        where: { organizationId },
        include: { educationRecords: true, emergencyContacts: true, examBookings: true },
      }),
      prisma.application.findMany({ where: { organizationId } }),
      prisma.task.findMany({ where: { organizationId } }),
      prisma.note.findMany({ where: { organizationId } }),
      prisma.destination.findMany({ where: { organizationId } }),
      prisma.partner.findMany({ where: { organizationId } }),
      prisma.invoicer.findMany({ where: { organizationId } }),
      prisma.invoice.findMany({ where: { organizationId } }),
      prisma.document.findMany({ where: { organizationId } }),
      prisma.activityLog.findMany({ where: { organizationId } }),
      prisma.institution.findMany({ where: { organizationId } }),
      prisma.notification.findMany({ where: { organizationId } }),
      prisma.account.findMany({ where: { organizationId } }),
      prisma.journalEntry.findMany({ where: { organizationId }, include: { lines: true } }),
      prisma.vendor.findMany({ where: { organizationId } }),
      prisma.expense.findMany({ where: { organizationId } }),
      prisma.bankAccount.findMany({ where: { organizationId }, include: { transactions: true } }),
      prisma.fixedAsset.findMany({ where: { organizationId }, include: { depreciationEntries: true } }),
      prisma.employee.findMany({ where: { organizationId }, include: { payslips: true } }),
      prisma.apiKey.findMany({
        where: { organizationId },
        select: { id: true, name: true, keyPrefix: true, scope: true, createdById: true, lastUsedAt: true, revokedAt: true, createdAt: true },
      }),
      prisma.pipelineStageConfig.findMany({ where: { organizationId } }),
      prisma.customFieldDefinition.findMany({ where: { organizationId } }),
      prisma.metaIntegration.findUnique({
        where: { organizationId },
        select: { id: true, pageId: true, pageName: true, subscribedFormIds: true, status: true, connectedByUserId: true, lastLeadAt: true, createdAt: true, updatedAt: true },
      }),
    ]);

    const customFieldValues = customFieldDefinitions.length
      ? await prisma.customFieldValue.findMany({
          where: { definitionId: { in: customFieldDefinitions.map((d) => d.id) } },
        })
      : [];

    // AuditLog is exported last and separately since it's the largest table
    // and least likely to be needed in full for most export requests, but is
    // still included in full for completeness.
    const auditLogs = await prisma.auditLog.findMany({ where: { organizationId }, orderBy: { createdAt: "asc" } });

    await logAudit({
      organizationId,
      actorId: session.userId,
      action: "export_data",
      entityType: "Organization",
      entityId: organizationId,
    });

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      organization,
      subscription,
      users,
      leads,
      students,
      applications,
      tasks,
      notes,
      destinations,
      partners,
      invoicers,
      invoices,
      documents,
      activityLogs,
      auditLogs,
      institutions,
      notifications,
      accounting: { accounts, journalEntries, vendors, expenses, bankAccounts, fixedAssets, employees },
      apiKeys,
      pipelineStageConfigs,
      customFields: { definitions: customFieldDefinitions, values: customFieldValues },
      metaIntegration,
    };

    const fileName = `enroleasy-export-${organization?.slug ?? organizationId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
