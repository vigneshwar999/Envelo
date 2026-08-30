import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
} from "@workspace/db";
import { applyUserSync } from "./userSync";
import { applyKeyRotation } from "./keyRotation";

// The revert race a completion review caught: sync used to read the user row
// WITHOUT a lock, decide "same key, fine", and then write the key back. A
// rotation committing between that read and that write got silently undone -
// registered key reverted to the old value while every stored copy was
// wrapped for the new one. These tests pin the fixed behavior: sync's
// read-decide-write runs under the same row lock as rotation, so whichever
// order they serialize in, the registered key always matches the stored
// copies afterward.

const US = "test_usync_user"; // the user whose key rotates while sync runs
const UB = "test_usync_other"; // counterparty so an invoice + copies exist
const USER_IDS = [US, UB];

const KEY_1 = '{"kty":"RSA","n":"usync1","e":"AQAB"}';
const KEY_2 = '{"kty":"RSA","n":"usync2","e":"AQAB"}';
const KEY_3 = '{"kty":"RSA","n":"usync3","e":"AQAB"}';

let invoiceId: string;

async function registeredKey(): Promise<string | null> {
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, US));
  return row?.publicKeyJwk ?? null;
}

async function storedWrap(): Promise<string | undefined> {
  const [row] = await db
    .select()
    .from(wrappedKeysTable)
    .where(eq(wrappedKeysTable.userId, US));
  return row?.wrappedKey;
}

/** Force the pre-rotation state: registered KEY_1, copy wrapped as WRAP_OLD. */
async function resetToKey1() {
  await db.update(usersTable).set({ publicKeyJwk: KEY_1 }).where(eq(usersTable.id, US));
  await db
    .update(wrappedKeysTable)
    .set({ wrappedKey: "WRAP_OLD" })
    .where(eq(wrappedKeysTable.userId, US));
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values([
      { id: US, displayName: "USync User", publicKeyJwk: KEY_1, isTestPersona: true },
      { id: UB, displayName: "USync Other", publicKeyJwk: '{"kty":"RSA","n":"ub","e":"AQAB"}', isTestPersona: true },
    ])
    .onConflictDoNothing();
  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: `USYNC-${Date.now()}`,
      freelancerId: UB,
      clientId: US,
      amountUsdc: "1.00",
      fingerprint: "ef".repeat(32),
      ciphertext: "dGVzdA==",
    })
    .returning();
  invoiceId = invoice!.id;
  await db.insert(wrappedKeysTable).values([
    { invoiceId, userId: US, wrappedKey: "WRAP_OLD" },
    { invoiceId, userId: UB, wrappedKey: "WRAP_UB" },
  ]);
});

afterAll(async () => {
  await db.delete(wrappedKeysTable).where(eq(wrappedKeysTable.invoiceId, invoiceId));
  await db.delete(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  await db.delete(usersTable).where(inArray(usersTable.id, USER_IDS));
});

describe("applyUserSync basics", () => {
  it("creates the row on first sync and registers the browser key", async () => {
    const row = await applyUserSync({
      userId: "test_usync_fresh",
      displayName: "Fresh",
      email: "fresh@example.com",
      publicKeyJwk: KEY_3,
    });
    expect(row.publicKeyJwk).toBe(KEY_3);
    await db.delete(usersTable).where(eq(usersTable.id, "test_usync_fresh"));
  });

  it("never overwrites a different registered key (second-browser rule)", async () => {
    const row = await applyUserSync({
      userId: US,
      displayName: "USync User",
      publicKeyJwk: KEY_3, // some other browser's freshly generated key
    });
    expect(row.publicKeyJwk).toBe(KEY_1); // registered key wins
    expect(await registeredKey()).toBe(KEY_1);
  });
});

describe("sync racing rotation can never revert the key", () => {
  it("a stale-browser sync AFTER rotation does not undo it", async () => {
    await resetToKey1();
    const rotation = await applyKeyRotation({
      userId: US,
      fence: 0, // nothing in this file bumps the fence
      currentPublicKeyJwk: KEY_1,
      newPublicKeyJwk: KEY_2,
      invoiceCopies: [{ invoiceId, wrappedKey: "WRAP_NEW" }],
      grantCopies: [],
      dropGrantIds: [],
    });
    expect(rotation.ok).toBe(true);
    // A browser that still holds KEY_1 signs in and syncs.
    const row = await applyUserSync({
      userId: US,
      displayName: "USync User",
      publicKeyJwk: KEY_1,
    });
    expect(row.publicKeyJwk).toBe(KEY_2); // rotation survives
    expect(await registeredKey()).toBe(KEY_2);
    expect(await storedWrap()).toBe("WRAP_NEW"); // key and copy still agree
  });

  it("holds the invariant when sync and rotation run CONCURRENTLY (both orders)", async () => {
    // The pool serializes the two transactions via the user-row lock; which
    // one wins varies per iteration. The invariant must hold either way:
    // registered key and stored copies always end up matching each other.
    for (let i = 0; i < 8; i++) {
      await resetToKey1();
      const [rotation, synced] = await Promise.all([
        applyKeyRotation({
          userId: US,
          fence: 0, // nothing in this file bumps the fence
          currentPublicKeyJwk: KEY_1,
          newPublicKeyJwk: KEY_2,
          invoiceCopies: [{ invoiceId, wrappedKey: "WRAP_NEW" }],
          grantCopies: [],
          dropGrantIds: [],
        }),
        applyUserSync({
          userId: US,
          displayName: "USync User",
          publicKeyJwk: KEY_1, // the same current key - the dangerous echo
        }),
      ]);
      // Sync first: it re-writes KEY_1 (a no-op value), rotation then swaps.
      // Rotation first: sync sees KEY_2 and refuses the overwrite.
      expect(rotation.ok).toBe(true);
      expect(await registeredKey()).toBe(KEY_2);
      expect(await storedWrap()).toBe("WRAP_NEW");
      // Whatever row sync returned, it never claims a key that contradicts
      // the stored copies' final state in a way that survives: its returned
      // key is either the pre-rotation KEY_1 (it ran first) or KEY_2.
      expect([KEY_1, KEY_2]).toContain(synced.publicKeyJwk);
    }
  });
});
