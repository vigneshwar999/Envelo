// Key-bound inserts for wrapped envelope copies.
//
// Every wrapped copy stored by this app is ciphertext prepared in a browser
// against a public key that browser READ at some earlier moment. Between
// that read and the server-side insert, the target user may have rotated or
// reset their key - and a copy wrapped for a retired key is permanently
// unopenable while every honesty flag reports healthy. So the rule
// (.agents/memory/key-state-binding.md) is: a write prepared against
// rotatable key state must echo the exact key it was prepared for, and the
// server verifies that echo under a row lock on the target user, in the same
// transaction as the insert. Rotation and reset lock the same row, which
// serializes every possible interleaving:
//   - insert commits first  -> rotation's coverage check sees the new row
//     and refuses (the browser reloads and re-wraps it too);
//   - rotation commits first -> the echo no longer matches and the insert is
//     refused (the sender reloads and wraps for the current key).
// Either way, no copy for a retired key ever lands.
import { eq } from "drizzle-orm";
import {
  db,
  grantsTable,
  invoiceEventsTable,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
  type GrantRow,
  type InvoiceRow,
  type UserRow,
} from "@workspace/db";

export type SealedInvoiceInsertResult =
  | { ok: true; invoice: InvoiceRow }
  | { ok: false; reason: "no_user" }
  | { ok: false; reason: "key_changed"; whose: "creator" | "client"; displayName: string };

export interface SealedInvoiceInsertInput {
  creatorId: string;
  clientId: string;
  /** The exact registered keys the browser wrapped each copy for. */
  creatorPublicKeyJwk: string;
  clientPublicKeyJwk: string;
  invoiceNumber: string;
  /** Already formatted to two decimals by the route. */
  amountUsdc: string;
  dueDate: string | null;
  /** Already lowercased by the route. */
  fingerprint: string;
  ciphertext: string;
  wrappedKeys: Array<{ userId: string; wrappedKey: string }>;
}

/**
 * Insert an invoice, its two wrapped copies, and its "created" event in ONE
 * transaction, with both parties' user rows locked and their registered keys
 * verified against the echoes. Also fixes a latent atomicity gap: these used
 * to be three separate statements, so a crash in between could leave an
 * invoice nobody could ever open.
 */
export async function insertSealedInvoice(
  input: SealedInvoiceInsertInput,
): Promise<SealedInvoiceInsertResult> {
  return db.transaction(async (tx) => {
    // Lock in sorted-id order so two concurrent creations between the same
    // pair (A invoices B while B invoices A) cannot deadlock.
    const locked = new Map<string, UserRow>();
    for (const id of [input.creatorId, input.clientId].sort()) {
      const [row] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .for("update");
      if (row) locked.set(row.id, row);
    }
    const creator = locked.get(input.creatorId);
    const client = locked.get(input.clientId);
    if (!creator || !client) return { ok: false, reason: "no_user" as const };
    if (creator.publicKeyJwk !== input.creatorPublicKeyJwk) {
      return {
        ok: false,
        reason: "key_changed" as const,
        whose: "creator" as const,
        displayName: creator.displayName,
      };
    }
    if (client.publicKeyJwk !== input.clientPublicKeyJwk) {
      return {
        ok: false,
        reason: "key_changed" as const,
        whose: "client" as const,
        displayName: client.displayName,
      };
    }

    const [invoice] = await tx
      .insert(invoicesTable)
      .values({
        invoiceNumber: input.invoiceNumber,
        freelancerId: creator.id,
        clientId: client.id,
        amountUsdc: input.amountUsdc,
        dueDate: input.dueDate,
        fingerprint: input.fingerprint,
        ciphertext: input.ciphertext,
      })
      .returning();
    await tx.insert(wrappedKeysTable).values(
      input.wrappedKeys.map((entry) => ({
        invoiceId: invoice!.id,
        userId: entry.userId,
        wrappedKey: entry.wrappedKey,
      })),
    );
    await tx.insert(invoiceEventsTable).values({
      invoiceId: invoice!.id,
      kind: "created",
      actorId: creator.id,
      detail: `${creator.displayName} sealed invoice ${input.invoiceNumber} for ${client.displayName} - ${input.amountUsdc} USDC. The contents stay encrypted; only the fingerprint goes onchain.`,
    });
    return { ok: true as const, invoice: invoice! };
  });
}

export type GrantInsertResult =
  | { ok: true; grant: GrantRow; granteeName: string }
  | { ok: false; reason: "no_grantee" }
  | { ok: false; reason: "key_changed"; granteeName: string };

export interface GrantInsertInput {
  invoiceId: string;
  grantorId: string;
  /** For the timeline event text; the caller already knows its own name. */
  grantorName: string;
  granteeId: string;
  /** The exact registered key the wrap was prepared for. */
  granteePublicKeyJwk: string;
  wrappedKey: string;
  expiresAt: Date;
}

/**
 * Insert a time-limited grant and its timeline event in one transaction,
 * with the grantee's row locked and their registered key verified against
 * the echo - so a share wrapped for a key the grantee just rotated or reset
 * away is refused instead of stored as a dead grant.
 */
export async function insertGrantBound(input: GrantInsertInput): Promise<GrantInsertResult> {
  return db.transaction(async (tx) => {
    const [grantee] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.granteeId))
      .for("update");
    if (!grantee) return { ok: false, reason: "no_grantee" as const };
    if (grantee.publicKeyJwk !== input.granteePublicKeyJwk) {
      return {
        ok: false,
        reason: "key_changed" as const,
        granteeName: grantee.displayName,
      };
    }
    const [grant] = await tx
      .insert(grantsTable)
      .values({
        invoiceId: input.invoiceId,
        grantorId: input.grantorId,
        granteeId: grantee.id,
        wrappedKey: input.wrappedKey,
        expiresAt: input.expiresAt,
      })
      .returning();
    await tx.insert(invoiceEventsTable).values({
      invoiceId: input.invoiceId,
      kind: "grant_issued",
      actorId: input.grantorId,
      detail: `${input.grantorName} granted ${grantee.displayName} time-limited view access. The envelope key was re-wrapped in the owner's browser - the server never saw it.`,
    });
    return { ok: true as const, grant: grant!, granteeName: grantee.displayName };
  });
}
