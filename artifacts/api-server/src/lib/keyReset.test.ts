import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  grantsTable,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
  type InvoiceRow,
} from "@workspace/db";
import {
  applyKeyReset,
  isUsableRsaPublicJwk,
  rewrapForCounterparty,
  wrappedKeyHolders,
} from "./keyReset";
import { toInvoice, type EnvelopeAccessContext } from "./serializers";

// Runs against the real development Postgres (DATABASE_URL): the point is to
// prove what actually gets deleted and what survives a key reset, plus the
// exact refusal reasons of the rewrap step. Every row this file creates is
// deleted again in afterAll.

const A = "test_keyreset_a"; // party with a healthy key throughout
const B = "test_keyreset_b"; // the user who loses + resets their key
const C = "test_keyreset_c"; // outsider who only ever gets a grant
const D = "test_keyreset_d"; // user row without any registered key
const USER_IDS = [A, B, C, D];

let inv1: InvoiceRow; // A -> B (A freelancer, B client)
let inv2: InvoiceRow; // B -> A (direction flipped on purpose)
let inv3: InvoiceRow; // A -> C, with a grant A->B on it
let inv4: InvoiceRow; // A -> D (D has no key at all)
const invoiceIds: string[] = [];

function namesOf(): Map<string, string> {
  return new Map(USER_IDS.map((id) => [id, `Name of ${id}`]));
}

async function accessFor(viewerId: string): Promise<EnvelopeAccessContext> {
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, USER_IDS));
  return {
    viewerId,
    holdersByInvoice: await wrappedKeyHolders(invoiceIds),
    publicKeyJwkById: new Map(users.map((u) => [u.id, u.publicKeyJwk])),
  };
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values([
      { id: A, displayName: "KeyReset A", publicKeyJwk: '{"kty":"RSA","n":"a"}', isTestPersona: true },
      { id: B, displayName: "KeyReset B", publicKeyJwk: '{"kty":"RSA","n":"b"}', isTestPersona: true },
      { id: C, displayName: "KeyReset C", publicKeyJwk: '{"kty":"RSA","n":"c"}', isTestPersona: true },
      { id: D, displayName: "KeyReset D", publicKeyJwk: null, isTestPersona: true },
    ])
    .onConflictDoNothing();

  async function mkInvoice(
    freelancerId: string,
    clientId: string,
    holders: string[],
  ): Promise<InvoiceRow> {
    const [row] = await db
      .insert(invoicesTable)
      .values({
        invoiceNumber: `KR-${freelancerId.slice(-1)}${clientId.slice(-1)}-${Date.now()}`,
        freelancerId,
        clientId,
        amountUsdc: "1.00",
        fingerprint: "ab".repeat(32),
        ciphertext: "dGVzdA==",
      })
      .returning();
    invoiceIds.push(row!.id);
    if (holders.length > 0) {
      await db.insert(wrappedKeysTable).values(
        holders.map((userId) => ({
          invoiceId: row!.id,
          userId,
          wrappedKey: `WRAP_${userId}_${row!.id.slice(0, 8)}`,
        })),
      );
    }
    return row!;
  }

  inv1 = await mkInvoice(A, B, [A, B]);
  inv2 = await mkInvoice(B, A, [A, B]);
  inv3 = await mkInvoice(A, C, [A, C]);
  inv4 = await mkInvoice(A, D, [A]);

  await db.insert(grantsTable).values([
    // Grant issued BY A TO C on inv1 - must survive B's reset.
    {
      invoiceId: inv1.id,
      grantorId: A,
      granteeId: C,
      wrappedKey: "GRANT_A_TO_C",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    // Grant issued TO B on inv3 - wrapped for B's old key, must die with it.
    {
      invoiceId: inv3.id,
      grantorId: A,
      granteeId: B,
      wrappedKey: "GRANT_A_TO_B",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  ]);
});

afterAll(async () => {
  if (invoiceIds.length > 0) {
    await db.delete(grantsTable).where(inArray(grantsTable.invoiceId, invoiceIds));
    await db
      .delete(wrappedKeysTable)
      .where(inArray(wrappedKeysTable.invoiceId, invoiceIds));
    await db.delete(invoicesTable).where(inArray(invoicesTable.id, invoiceIds));
  }
  await db.delete(usersTable).where(inArray(usersTable.id, USER_IDS));
});

describe("applyKeyReset", () => {
  it("swaps the registered key and deletes exactly the rows the old key made useless", async () => {
    const updated = await applyKeyReset(B, '{"kty":"RSA","n":"b2"}');
    expect(updated.publicKeyJwk).toBe('{"kty":"RSA","n":"b2"}');

    // B's own wrapped copies are gone on BOTH invoices; A's are untouched.
    const holders = await wrappedKeyHolders(invoiceIds);
    expect(holders.get(inv1.id)).toEqual(new Set([A]));
    expect(holders.get(inv2.id)).toEqual(new Set([A]));
    expect(holders.get(inv3.id)).toEqual(new Set([A, C]));
    expect(holders.get(inv4.id)).toEqual(new Set([A]));

    // Grants TO B died with the key; the grant B had nothing to do with lives.
    const grants = await db
      .select()
      .from(grantsTable)
      .where(inArray(grantsTable.invoiceId, invoiceIds));
    expect(grants.map((g) => g.granteeId)).toEqual([C]);
  });

  it("refuses to touch a user row that does not exist", async () => {
    await expect(applyKeyReset("test_keyreset_nobody", "{}")).rejects.toThrow(
      /No user row/,
    );
  });
});

describe("toInvoice lost-key flags", () => {
  it("marks the reset user's copy locked, in both invoice directions", async () => {
    const names = namesOf();
    const asB = await accessFor(B);
    const inv1AsB = toInvoice(inv1, names, asB) as Record<string, unknown>;
    expect(inv1AsB.myCopyLocked).toBe(true);
    // A still holds a copy, so B is NOT asked to re-share for A.
    expect(inv1AsB.counterpartyNeedsRekey).toBe(false);
    expect(inv1AsB.counterpartyPublicKeyJwk).toBeNull();
    // inv2 has flipped roles (B is the freelancer) - same verdicts.
    const inv2AsB = toInvoice(inv2, names, asB) as Record<string, unknown>;
    expect(inv2AsB.myCopyLocked).toBe(true);
    expect(inv2AsB.counterpartyNeedsRekey).toBe(false);
  });

  it("tells the healthy party to re-share and hands them the NEW public key", async () => {
    const names = namesOf();
    const asA = await accessFor(A);
    for (const inv of [inv1, inv2]) {
      const view = toInvoice(inv, names, asA) as Record<string, unknown>;
      expect(view.myCopyLocked).toBe(false);
      expect(view.counterpartyNeedsRekey).toBe(true);
      expect(view.counterpartyPublicKeyJwk).toBe('{"kty":"RSA","n":"b2"}');
    }
  });

  it("never asks to re-share for a counterparty with no registered key", async () => {
    const view = toInvoice(inv4, namesOf(), await accessFor(A)) as Record<string, unknown>;
    expect(view.myCopyLocked).toBe(false);
    expect(view.counterpartyNeedsRekey).toBe(false);
    expect(view.counterpartyPublicKeyJwk).toBeNull();
  });

  it("keeps grant viewers out of the party-to-party re-share story", async () => {
    const view = toInvoice(inv1, namesOf(), await accessFor(C)) as Record<string, unknown>;
    expect(view.myCopyLocked).toBe(false);
    expect(view.counterpartyNeedsRekey).toBe(false);
    expect(view.counterpartyPublicKeyJwk).toBeNull();
  });

  it("omits the flags entirely when no access context is supplied", () => {
    const view = toInvoice(inv1, namesOf()) as Record<string, unknown>;
    expect("myCopyLocked" in view).toBe(false);
    expect("counterpartyNeedsRekey" in view).toBe(false);
  });
});

describe("rewrapForCounterparty", () => {
  it("rejects callers who are not a party, even a valid grant holder", async () => {
    expect(await rewrapForCounterparty(inv1, C, "X", '{"kty":"RSA","n":"b2"}')).toEqual({
      ok: false,
      reason: "not_a_party",
    });
  });

  it("refuses when the counterparty has no registered key to wrap for", async () => {
    expect(await rewrapForCounterparty(inv4, A, "X", '{"kty":"RSA","n":"whatever"}')).toEqual({
      ok: false,
      reason: "counterparty_keyless",
    });
  });

  it("refuses when the counterparty already holds a working copy, even from a stale page", async () => {
    // Stale forPublicKeyJwk on purpose: "already has a key" must win over
    // "key changed" - it is the terminal answer, not a retry hint.
    expect(await rewrapForCounterparty(inv3, A, "X", '{"kty":"RSA","n":"STALE"}')).toEqual({
      ok: false,
      reason: "counterparty_has_key",
    });
  });

  it("refuses a wrap prepared for a key that was reset again meanwhile", async () => {
    // B reset from b1 to b2; a page still holding b1 must NOT be able to
    // store a wrap - that would clear the flags while B stays locked out.
    expect(await rewrapForCounterparty(inv2, A, "WRAP_FOR_OLD_B1", '{"kty":"RSA","n":"b1"}')).toEqual({
      ok: false,
      reason: "key_changed",
    });
    const rows = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.invoiceId, inv2.id))
      .then((all) => all.filter((r) => r.userId === B));
    expect(rows).toHaveLength(0);
  });

  it("restores the missing copy and the locked flag clears", async () => {
    const result = await rewrapForCounterparty(inv1, A, "REWRAP_FOR_B2", '{"kty":"RSA","n":"b2"}');
    expect(result).toEqual({ ok: true, counterpartyId: B });

    const [row] = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.invoiceId, inv1.id))
      .then((rows) => rows.filter((r) => r.userId === B));
    expect(row?.wrappedKey).toBe("REWRAP_FOR_B2");

    const asB = toInvoice(inv1, namesOf(), await accessFor(B)) as Record<string, unknown>;
    expect(asB.myCopyLocked).toBe(false);
    const asA = toInvoice(inv1, namesOf(), await accessFor(A)) as Record<string, unknown>;
    expect(asA.counterpartyNeedsRekey).toBe(false);
    expect(asA.counterpartyPublicKeyJwk).toBeNull();
  });

  it("a second re-share of the same invoice is refused, not duplicated", async () => {
    expect(await rewrapForCounterparty(inv1, A, "ANOTHER", '{"kty":"RSA","n":"b2"}')).toEqual({
      ok: false,
      reason: "counterparty_has_key",
    });
    const rows = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.invoiceId, inv1.id));
    expect(rows).toHaveLength(2);
  });

  it("a party whose own copy is gone cannot plant a key for the other side", async () => {
    // Destroy BOTH copies of inv1 (as if both parties reset). B - a party,
    // correctly naming A's current key - must still be refused: without a
    // working copy B cannot open the envelope, so any blob B submits is
    // garbage that would mark A healthy and block the real repair forever.
    await db.delete(wrappedKeysTable).where(eq(wrappedKeysTable.invoiceId, inv1.id));
    expect(await rewrapForCounterparty(inv1, B, "GARBAGE", '{"kty":"RSA","n":"a"}')).toEqual({
      ok: false,
      reason: "caller_locked",
    });
    const rows = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.invoiceId, inv1.id));
    expect(rows).toHaveLength(0); // nothing planted
  });
});

describe("isUsableRsaPublicJwk", () => {
  it("accepts a browser-exported RSA public JWK", () => {
    expect(
      isUsableRsaPublicJwk('{"kty":"RSA","n":"abc123","e":"AQAB","alg":"RSA-OAEP-256"}'),
    ).toBe(true);
  });

  it("refuses garbage that could never be wrapped for", () => {
    expect(isUsableRsaPublicJwk("not json")).toBe(false);
    expect(isUsableRsaPublicJwk('"just a string"')).toBe(false);
    expect(isUsableRsaPublicJwk('{"kty":"EC","n":"abc","e":"AQAB"}')).toBe(false);
    expect(isUsableRsaPublicJwk('{"kty":"RSA","e":"AQAB"}')).toBe(false); // no modulus
    expect(isUsableRsaPublicJwk('{"kty":"RSA","n":"abc"}')).toBe(false); // no exponent
    expect(isUsableRsaPublicJwk('{"kty":"RSA","n":"","e":""}')).toBe(false);
  });
});
