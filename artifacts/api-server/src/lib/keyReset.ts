// The "I lost my key with no backup" machinery.
//
// Losing the private key makes every wrapped copy of every envelope key that
// was wrapped FOR that key permanently useless - the math is one-way. What
// remains true: the OTHER party of each invoice still holds a working copy,
// so they can re-wrap it for the affected user's NEW key (exactly the grant
// mechanic). These helpers keep the database honest about which copies still
// work, so "who needs a re-share" is a plain relational fact instead of a
// guess.
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  grantsTable,
  usersTable,
  wrappedKeysTable,
  type InvoiceRow,
  type UserRow,
} from "@workspace/db";

/**
 * Deliberately replace a user's registered public key. Deletes rows that are
 * cryptographic garbage after the swap:
 * - the user's own wrapped_keys rows (wrapped for the destroyed key), and
 * - grants issued TO the user (same reason).
 * Grants issued BY the user stay: those keys were wrapped for OTHER people's
 * keys and still work. Everything happens in one transaction so the
 * registered key and the "who can open what" bookkeeping can never disagree.
 */
export async function applyKeyReset(
  userId: string,
  publicKeyJwk: string,
): Promise<UserRow> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(usersTable)
      .set({ publicKeyJwk })
      .where(eq(usersTable.id, userId))
      .returning();
    if (!updated) throw new Error(`No user row to reset for ${userId}`);
    await tx.delete(wrappedKeysTable).where(eq(wrappedKeysTable.userId, userId));
    await tx.delete(grantsTable).where(eq(grantsTable.granteeId, userId));
    return updated;
  });
}

/** invoiceId -> ids of users who hold a WORKING wrapped copy of its key. */
export async function wrappedKeyHolders(
  invoiceIds: string[],
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>();
  if (invoiceIds.length === 0) return map;
  const rows = await db
    .select()
    .from(wrappedKeysTable)
    .where(inArray(wrappedKeysTable.invoiceId, invoiceIds));
  for (const row of rows) {
    const set = map.get(row.invoiceId) ?? new Set<string>();
    set.add(row.userId);
    map.set(row.invoiceId, set);
  }
  return map;
}

export type RewrapResult =
  | { ok: true; counterpartyId: string }
  | {
      ok: false;
      reason:
        | "not_a_party"
        | "caller_locked"
        | "counterparty_has_key"
        | "counterparty_keyless"
        | "key_changed";
    };

/**
 * Minimal shape check for a usable RSA public JWK, as produced by the
 * browser's WebCrypto export: valid JSON, kty RSA, non-empty n and e. Keys
 * failing this could be REGISTERED but never wrapped-for, which would make
 * every future re-share and grant toward this user fail in other people's
 * browsers - refuse them at the door instead.
 */
export function isUsableRsaPublicJwk(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;
    const jwk = parsed as Record<string, unknown>;
    return (
      jwk.kty === "RSA" &&
      typeof jwk.n === "string" &&
      jwk.n.length > 0 &&
      typeof jwk.e === "string" &&
      jwk.e.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Store a re-wrapped envelope key for the OTHER party of an invoice, after
 * they reset their key. Direction-agnostic on purpose: whichever party still
 * holds a working copy can bring the other one back, no matter who sent the
 * invoice. The wrapped key itself was produced in the caller's browser - the
 * server only stores it.
 *
 * Everything runs in ONE transaction with the counterparty's user row locked
 * (FOR UPDATE). applyKeyReset updates that same row first inside its own
 * transaction, so a concurrent reset either commits before our lock (we see
 * the new key and refuse with key_changed) or waits behind our commit and
 * then deletes the row we wrote - which is correct, because our wrap was for
 * the key that reset just destroyed.
 */
export async function rewrapForCounterparty(
  invoice: InvoiceRow,
  callerId: string,
  wrappedKey: string,
  forPublicKeyJwk: string,
): Promise<RewrapResult> {
  const isParty =
    callerId === invoice.freelancerId || callerId === invoice.clientId;
  if (!isParty) return { ok: false, reason: "not_a_party" };
  const counterpartyId =
    callerId === invoice.freelancerId ? invoice.clientId : invoice.freelancerId;
  return await db.transaction(async (tx) => {
    const [counterparty] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, counterpartyId))
      .for("update");
    // The caller must still HOLD a working copy - being a party is not
    // enough. A party whose own copy was destroyed by a reset cannot have
    // produced a valid wrap (they cannot open the envelope), so accepting
    // one would plant an undecryptable row that marks the counterparty as
    // healthy and blocks the legitimate repair forever.
    const [callerRow] = await tx
      .select()
      .from(wrappedKeysTable)
      .where(
        and(
          eq(wrappedKeysTable.invoiceId, invoice.id),
          eq(wrappedKeysTable.userId, callerId),
        ),
      );
    if (!callerRow) return { ok: false, reason: "caller_locked" as const };
    if (!counterparty || counterparty.publicKeyJwk === null) {
      return { ok: false, reason: "counterparty_keyless" as const };
    }
    const [existing] = await tx
      .select()
      .from(wrappedKeysTable)
      .where(
        and(
          eq(wrappedKeysTable.invoiceId, invoice.id),
          eq(wrappedKeysTable.userId, counterpartyId),
        ),
      );
    // Checked before key_changed on purpose: "they already have a working
    // key" is the terminal answer for a stale page, not "reload and retry".
    if (existing) return { ok: false, reason: "counterparty_has_key" as const };
    // The caller wrapped for the key their page knew about. If the
    // counterparty reset AGAIN since then, storing this wrap would clear the
    // needs-re-share flags while leaving them unable to decrypt - a
    // permanently wedged invoice. Refuse and let the caller reload.
    if (counterparty.publicKeyJwk !== forPublicKeyJwk) {
      return { ok: false, reason: "key_changed" as const };
    }
    // Two simultaneous re-shares race benignly: both wraps unlock the same
    // AES key for the same (lock-verified) public key, so first-in wins and
    // the loser is a no-op rather than an error.
    await tx
      .insert(wrappedKeysTable)
      .values({ invoiceId: invoice.id, userId: counterpartyId, wrappedKey })
      .onConflictDoNothing();
    return { ok: true, counterpartyId };
  });
}
