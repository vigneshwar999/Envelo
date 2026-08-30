// Graceful key rotation - the "I still HAVE my key" sibling of keyReset.
//
// A reset destroys the user's wrapped copies because the old private key is
// gone and the math is one-way. Rotation is different: the old private key is
// still in the user's browser, so every wrapped copy can be unwrapped there
// and re-wrapped for the NEW key before anything changes server-side. The
// server's whole job is to apply the swap atomically - the registered public
// key and every wrapped copy move together, or nothing moves at all. Done
// right, counterparties never notice: no copy disappears, no flag is raised,
// nobody re-shares.
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  db,
  grantsTable,
  usersTable,
  wrappedKeysTable,
  type GrantRow,
  type UserRow,
  type WrappedKeyRow,
} from "@workspace/db";

/** Works on the shared pool or inside a transaction. */
type DbHandle = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface HeldWrappedKeys {
  /** The user's own permanent per-invoice copies. */
  invoiceCopies: WrappedKeyRow[];
  /** Active, unexpired grants received from others. */
  grantCopies: GrantRow[];
}

/**
 * Every wrapped copy that still opens something for this user: their own
 * invoice copies plus active grants issued TO them. Revoked or expired
 * grants are excluded on purpose - they cannot open anything, so a rotation
 * neither needs to carry them over nor breaks anything by leaving them
 * wrapped for a key that no longer exists.
 */
export async function heldWrappedKeys(
  userId: string,
  handle: DbHandle = db,
): Promise<HeldWrappedKeys> {
  const invoiceCopies = await handle
    .select()
    .from(wrappedKeysTable)
    .where(eq(wrappedKeysTable.userId, userId));
  const grantCopies = await handle
    .select()
    .from(grantsTable)
    .where(
      and(
        eq(grantsTable.granteeId, userId),
        isNull(grantsTable.revokedAt),
        gt(grantsTable.expiresAt, new Date()),
      ),
    );
  return { invoiceCopies, grantCopies };
}

export type RotationRefusalReason =
  /** No profile row at all - the account was never synced. */
  | "no_user"
  /** Nothing registered, so there is nothing to rotate (sync will register one). */
  | "no_registered_key"
  /** The "new" key is already the registered one - a double submit, not an error state. */
  | "key_unchanged"
  /** A crash-recovery check fenced this rotation out after its page went silent. */
  | "fence_changed"
  /** The registered key is not the one this rotation was prepared against. */
  | "key_changed"
  /** The submitted copies do not exactly cover what the account holds. */
  | "coverage_mismatch";

export type RotationResult =
  | {
      ok: true;
      user: UserRow;
      rewrappedInvoiceCopies: number;
      rewrappedGrantCopies: number;
      droppedGrants: number;
    }
  | { ok: false; reason: RotationRefusalReason; detail?: string };

export interface RotationInput {
  userId: string;
  /** The rotationFence value the browser read before preparing this rotation. */
  fence: number;
  /** The exact registered key string the browser prepared its re-wraps for. */
  currentPublicKeyJwk: string;
  newPublicKeyJwk: string;
  /** EVERY invoice copy the user holds, re-wrapped for the new key. */
  invoiceCopies: Array<{ invoiceId: string; wrappedKey: string }>;
  /** Active grants received from others, re-wrapped for the new key. */
  grantCopies: Array<{ grantId: string; wrappedKey: string }>;
  /** Active grants to give up instead of carrying over (deleted). */
  dropGrantIds: string[];
}

/**
 * Swap the registered public key AND every wrapped copy in one transaction.
 *
 * Binding rules (see .agents/memory/key-state-binding.md for the history):
 * - The request echoes the exact registered key it was prepared against, and
 *   the comparison happens with the user's row locked (FOR UPDATE). A page
 *   that went stale - another tab rotated or reset meanwhile - is refused
 *   with key_changed instead of planting re-wraps that would not open.
 * - Coverage is exact and all-or-nothing: the submitted invoice copies must
 *   name precisely the copies on record, and every active received grant
 *   must be either re-wrapped or explicitly dropped. Anything that moved
 *   since the page loaded (new invoice, new grant, expired grant) surfaces
 *   as coverage_mismatch, and the client reloads and retries. Without this,
 *   a copy could silently stay wrapped for the retired key - unopenable,
 *   while every flag says healthy.
 *
 * The row lock also serializes rotation against every OTHER writer of this
 * user's crypto state: applyKeyReset updates the same row, and
 * rewrapForCounterparty, insertSealedInvoice, and insertGrantBound (see
 * keyBoundInserts.ts) all lock it and verify an echoed key before inserting
 * a wrapped copy. Each of those either commits first (rotation then sees the
 * new row inside its transaction and refuses on coverage) or waits on the
 * lock and then sees rotation's new key (echo mismatch, refused). No copy
 * wrapped for a retired key can land either way.
 *
 * The wrapped blobs themselves are opaque ciphertext - the server cannot
 * verify them cryptographically. What it CAN enforce is that only the
 * account holder swaps their own key, that the swap is bound to the exact
 * key state the browser saw, and that no copy is left behind.
 */
export async function applyKeyRotation(input: RotationInput): Promise<RotationResult> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .for("update");
    if (!user) return { ok: false, reason: "no_user" as const };
    if (user.publicKeyJwk === null) {
      return { ok: false, reason: "no_registered_key" as const };
    }
    // Checked before key_changed on purpose: a double submit of the SAME
    // rotation echoes the pre-rotation key, and "this is already your key"
    // is the terminal, truthful answer - not "reload and retry".
    if (user.publicKeyJwk === input.newPublicKeyJwk) {
      return { ok: false, reason: "key_unchanged" as const };
    }
    // The fence comparison happens under the same row lock as everything
    // else, which is what gives bumpRotationFence its guarantee: after a
    // bump commits, a rotation carrying the pre-bump fence can NEVER commit,
    // no matter how long its request sat in flight. Without this, a browser
    // recovering from a crash could look at the registered key, conclude
    // "the rotation never happened", throw away the staged private key - and
    // then watch the zombie request commit a swap to a key nobody holds.
    if (user.rotationFence !== input.fence) {
      return { ok: false, reason: "fence_changed" as const };
    }
    if (user.publicKeyJwk !== input.currentPublicKeyJwk) {
      return { ok: false, reason: "key_changed" as const };
    }

    // What the account holds, read under the same transaction as the lock.
    const held = await heldWrappedKeys(input.userId, tx);

    const sentInvoiceIds = input.invoiceCopies.map((c) => c.invoiceId);
    const sentInvoiceSet = new Set(sentInvoiceIds);
    if (sentInvoiceSet.size !== sentInvoiceIds.length) {
      return {
        ok: false,
        reason: "coverage_mismatch" as const,
        detail: "an invoice copy appears more than once",
      };
    }
    const heldInvoiceIds = new Set(held.invoiceCopies.map((r) => r.invoiceId));
    if (
      heldInvoiceIds.size !== sentInvoiceSet.size ||
      [...heldInvoiceIds].some((id) => !sentInvoiceSet.has(id))
    ) {
      return {
        ok: false,
        reason: "coverage_mismatch" as const,
        detail: "the submitted invoice copies do not exactly match the copies this account holds",
      };
    }

    const sentGrantIds = [
      ...input.grantCopies.map((g) => g.grantId),
      ...input.dropGrantIds,
    ];
    const sentGrantSet = new Set(sentGrantIds);
    if (sentGrantSet.size !== sentGrantIds.length) {
      return {
        ok: false,
        reason: "coverage_mismatch" as const,
        detail: "a grant appears more than once across re-wraps and drops",
      };
    }
    const heldGrantIds = new Set(held.grantCopies.map((r) => r.id));
    if (
      heldGrantIds.size !== sentGrantSet.size ||
      [...heldGrantIds].some((id) => !sentGrantSet.has(id))
    ) {
      return {
        ok: false,
        reason: "coverage_mismatch" as const,
        detail:
          "the submitted grants do not exactly cover the active grants this account holds",
      };
    }

    // Coverage proven - apply everything. Every id below came from the
    // coverage sets, so each UPDATE/DELETE hits exactly the rows enumerated
    // under the lock.
    const [updated] = await tx
      .update(usersTable)
      .set({ publicKeyJwk: input.newPublicKeyJwk })
      .where(eq(usersTable.id, input.userId))
      .returning();
    for (const copy of input.invoiceCopies) {
      await tx
        .update(wrappedKeysTable)
        .set({ wrappedKey: copy.wrappedKey })
        .where(
          and(
            eq(wrappedKeysTable.invoiceId, copy.invoiceId),
            eq(wrappedKeysTable.userId, input.userId),
          ),
        );
    }
    for (const copy of input.grantCopies) {
      await tx
        .update(grantsTable)
        .set({ wrappedKey: copy.wrappedKey })
        .where(
          and(eq(grantsTable.id, copy.grantId), eq(grantsTable.granteeId, input.userId)),
        );
    }
    if (input.dropGrantIds.length > 0) {
      await tx
        .delete(grantsTable)
        .where(
          and(
            inArray(grantsTable.id, input.dropGrantIds),
            eq(grantsTable.granteeId, input.userId),
          ),
        );
    }
    return {
      ok: true,
      user: updated!,
      rewrappedInvoiceCopies: input.invoiceCopies.length,
      rewrappedGrantCopies: input.grantCopies.length,
      droppedGrants: input.dropGrantIds.length,
    };
  });
}

/**
 * The recovery half of crash-safe rotation: make any still-in-flight rotation
 * for this user impossible to commit, then report the registered key.
 *
 * A single UPDATE takes the user's row lock, so it serializes against every
 * rotation transaction. Whichever wins the lock, the returned key is FINAL
 * with respect to any rotation prepared before this call: either that
 * rotation already committed (the returned key IS its new key, and the
 * caller promotes its staged copy) or it can never commit again (the fence
 * moved, so it will be refused - the staged copy is safe to discard).
 *
 * Deliberately NOT bumped by successful rotations themselves: a double
 * submit of an already-applied rotation should keep hitting the truthful
 * key_unchanged answer, not a spurious fence_changed.
 */
export async function bumpRotationFence(
  userId: string,
): Promise<{ fence: number; publicKeyJwk: string | null } | null> {
  const [row] = await db
    .update(usersTable)
    .set({ rotationFence: sql`${usersTable.rotationFence} + 1` })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!row) return null;
  return { fence: row.rotationFence, publicKeyJwk: row.publicKeyJwk };
}
