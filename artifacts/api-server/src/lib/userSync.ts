// Sign-in sync for the user row - the quiet fourth writer of key state.
//
// Sync's contract: create the profile row on first sign-in, refresh email,
// register the browser's public key when none exists, and NEVER overwrite a
// different registered key (old envelopes would silently die). The subtle
// part is not the rule but the read it is based on: deciding from a row read
// OUTSIDE the transaction and then updating is a revert race. A second
// browser signs in holding the CURRENT key, reads the row, sees "same key";
// a rotation commits meanwhile (new key + every copy re-wrapped); the stale
// sync update then writes the old key back - and now the registered key
// matches nothing that is stored. Every copy is wrapped for a key the
// database no longer advertises, with every honesty flag reporting healthy.
//
// So existing rows are read, decided on, and written here inside ONE
// transaction with the user row locked (FOR UPDATE) - the same lock every
// other writer of key state takes (rotation, reset, and the wrapped-copy
// inserts in keyBoundInserts.ts). Sync therefore runs entirely before a
// concurrent rotation (harmlessly re-writing the same key the rotation was
// prepared against) or entirely after it (seeing the new key and refusing
// the overwrite). It can never interleave into a revert.
//
// A missing row cannot be locked. Two first loads may both reach this code
// before either has created the user, so creation uses INSERT ... ON CONFLICT
// DO NOTHING. The winner returns its row; a loser waits for that insert and
// then follows the normal locked existing-row path instead of surfacing a
// duplicate-primary-key error.
import { eq } from "drizzle-orm";
import { db, usersTable, type UserRow } from "@workspace/db";

export interface UserSyncInput {
  userId: string;
  /** Already trimmed/defaulted by the route; only used on first creation. */
  displayName: string;
  email?: string | null;
  publicKeyJwk: string;
}

export interface UserSyncResult {
  user: UserRow;
  created: boolean;
}

export async function applyUserSync(input: UserSyncInput): Promise<UserSyncResult> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(usersTable)
      .values({
        id: input.userId,
        displayName: input.displayName,
        email: input.email ?? null,
        publicKeyJwk: input.publicKeyJwk,
      })
      .onConflictDoNothing({ target: usersTable.id })
      .returning();
    if (inserted) {
      return { user: inserted, created: true };
    }

    const [existing] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .for("update");
    if (!existing) {
      throw new Error("User disappeared while synchronizing account");
    }

    // Never overwrite an existing public key with a different one:
    // envelopes already sealed for the old key would become unreadable,
    // silently. A new browser must keep using the original key material
    // (or restore it from a backup).
    const keyChanged =
      existing.publicKeyJwk !== null && existing.publicKeyJwk !== input.publicKeyJwk;
    // Deliberately NOT updating displayName here: sync runs on every
    // sign-in with whatever Clerk derives (often a raw username), and it
    // would clobber a name the user chose in the app. The Clerk-derived
    // name is only a starting value on first creation; PUT
    // /users/me/display-name owns it after that.
    const [updated] = await tx
      .update(usersTable)
      .set({
        email: input.email ?? existing.email,
        publicKeyJwk: keyChanged ? existing.publicKeyJwk : input.publicKeyJwk,
      })
      .where(eq(usersTable.id, input.userId))
      .returning();
    return { user: updated!, created: false };
  });
}
