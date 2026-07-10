import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-guard";

// Looks up a seeded default account (e.g. "2030" TDS Payable, "1040" VAT
// Receivable) by its chart-of-accounts code. These come from
// DEFAULT_CHART_OF_ACCOUNTS and are auto-seeded per org, but an org could
// have renamed/deleted its code — surface a clear, actionable error instead
// of a generic 500 if that happens.
export async function getSystemAccountByCode(organizationId: string, code: string, friendlyName: string) {
  const account = await prisma.account.findFirst({ where: { organizationId, code } });
  if (!account) {
    throw new ApiError(
      400,
      `Could not find the "${friendlyName}" account (code ${code}) in your chart of accounts. It may have been renamed or deleted — check Accounting > Chart of Accounts.`
    );
  }
  return account;
}
