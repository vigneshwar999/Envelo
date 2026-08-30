import { and, eq } from "drizzle-orm";
import { db, grantsTable, invoicesTable, type InvoiceRow } from "@workspace/db";
import { isUuid } from "./serializers";

/** Look up an invoice by id; returns null for malformed or unknown ids. */
export async function findInvoice(invoiceId: string): Promise<InvoiceRow | null> {
  if (!isUuid(invoiceId)) return null;
  const [row] = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.id, invoiceId));
  return row ?? null;
}

/**
 * Party on the invoice, or holder of a currently-active grant.
 *
 * Every invoice endpoint (including subresources like the envelope and the
 * grants list) answers 404 - not 403 - when this is false, so nobody outside
 * the invoice can even confirm it exists.
 */
export async function canSeeInvoice(
  invoice: InvoiceRow,
  userId: string,
): Promise<boolean> {
  if (invoice.freelancerId === userId || invoice.clientId === userId) return true;
  const grants = await db
    .select()
    .from(grantsTable)
    .where(
      and(eq(grantsTable.invoiceId, invoice.id), eq(grantsTable.granteeId, userId)),
    );
  return grants.some((g) => !g.revokedAt && g.expiresAt.getTime() > Date.now());
}
