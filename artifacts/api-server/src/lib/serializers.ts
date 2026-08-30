// Shared row -> API response mappers.
import type { GrantRow, InvoiceEventRow, InvoiceRow } from "@workspace/db";

/** Normalize any decimal string to exactly two decimals, e.g. "12" -> "12.00". */
export function fmt2(value: string): string {
  const [whole, frac = ""] = String(value).split(".");
  return `${whole || "0"}.${(frac + "00").slice(0, 2)}`;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Everything needed to answer "whose wrapped copies of these envelope keys
 * still exist?" for ONE viewer across many invoices. Read routes (list,
 * detail, rewrap) build it so the response carries the lost-key flags;
 * write paths skip it and the optional flags simply stay absent.
 */
export interface EnvelopeAccessContext {
  viewerId: string;
  /** invoice id -> user ids that hold a live wrapped_keys row */
  holdersByInvoice: Map<string, Set<string>>;
  /** user id -> registered public key JWK JSON (null when none) */
  publicKeyJwkById: Map<string, string | null>;
}

/** names: user id -> display name, for labeling invoices without extra requests. */
export function toInvoice(
  row: InvoiceRow,
  names: Map<string, string>,
  access?: EnvelopeAccessContext,
) {
  const base = {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    status: row.status,
    amountUsdc: fmt2(row.amountUsdc),
    freelancerId: row.freelancerId,
    clientId: row.clientId,
    freelancerName: names.get(row.freelancerId) ?? "Unknown user",
    clientName: names.get(row.clientId) ?? "Unknown user",
    dueDate: row.dueDate,
    fingerprint: row.fingerprint,
    anchorStatus: row.anchorStatus,
    anchorTxHash: row.anchorTxHash,
    payTxHash: row.payTxHash,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
  if (!access) return base;
  const isParty =
    access.viewerId === row.freelancerId || access.viewerId === row.clientId;
  if (!isParty) {
    // Grant viewers borrow access; the party-to-party re-share story does
    // not apply to them.
    return {
      ...base,
      myCopyLocked: false,
      counterpartyNeedsRekey: false,
      counterpartyPublicKeyJwk: null,
    };
  }
  const otherId =
    access.viewerId === row.freelancerId ? row.clientId : row.freelancerId;
  const holders = access.holdersByInvoice.get(row.id) ?? new Set<string>();
  const otherJwk = access.publicKeyJwkById.get(otherId) ?? null;
  // Every invoice starts with a wrapped copy for BOTH parties, so a missing
  // row always means "deleted by a key reset", never "never existed".
  const counterpartyNeedsRekey = !holders.has(otherId) && otherJwk !== null;
  return {
    ...base,
    myCopyLocked: !holders.has(access.viewerId),
    counterpartyNeedsRekey,
    counterpartyPublicKeyJwk: counterpartyNeedsRekey ? otherJwk : null,
  };
}

export function toEvent(row: InvoiceEventRow) {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    kind: row.kind,
    actorId: row.actorId,
    detail: row.detail,
    txHash: row.txHash,
    createdAt: row.createdAt.toISOString(),
  };
}

export function grantStatus(row: GrantRow): "active" | "expired" | "revoked" {
  if (row.revokedAt) return "revoked";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "active";
}

export function toGrant(row: GrantRow, names: Map<string, string>) {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    grantorId: row.grantorId,
    granteeId: row.granteeId,
    granteeName: names.get(row.granteeId) ?? "Unknown user",
    expiresAt: row.expiresAt.toISOString(),
    status: grantStatus(row),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Cent-accurate math on "12.34" strings without floating point. */
export function centsOf(amount: string): bigint {
  const [whole, frac = ""] = fmt2(amount).split(".");
  return BigInt(whole || "0") * 100n + BigInt((frac + "00").slice(0, 2));
}

export function centsToUsdc(cents: bigint): string {
  const whole = cents / 100n;
  const frac = cents % 100n;
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}
