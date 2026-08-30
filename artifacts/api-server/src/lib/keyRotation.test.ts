import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  grantsTable,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
  type GrantRow,
  type InvoiceRow,
} from "@workspace/db";
import { applyKeyRotation, bumpRotationFence, heldWrappedKeys } from "./keyRotation";
import { wrappedKeyHolders } from "./keyReset";
import { toInvoice, type EnvelopeAccessContext } from "./serializers";

// Runs against the real development Postgres (DATABASE_URL), like
// keyReset.test.ts: the point is to prove the rotation really is
// all-or-nothing, bound to the exact registered key, and invisible to
// counterparties. Every row this file creates is deleted again in afterAll.

const RA = "test_keyrot_a"; // the user who rotates
const RB = "test_keyrot_b"; // counterparty - must never notice anything
const RC = "test_keyrot_c"; // outsider - receives a grant FROM RA
const RD = "test_keyrot_d"; // user row without any registered key
const USER_IDS = [RA, RB, RC, RD];

const KEY_RA_1 = '{"kty":"RSA","n":"ra1","e":"AQAB"}';
const KEY_RA_2 = '{"kty":"RSA","n":"ra2","e":"AQAB"}';
const KEY_RA_3 = '{"kty":"RSA","n":"ra3","e":"AQAB"}';
const KEY_RA_4 = '{"kty":"RSA","n":"ra4","e":"AQAB"}';

let inv1: InvoiceRow; // RA -> RB
let inv2: InvoiceRow; // RB -> RA (direction flipped on purpose)
let inv3: InvoiceRow; // RB -> RC; RA sees it only through a grant
const invoiceIds: string[] = [];

let grantToRA: GrantRow; // active, BY RB TO RA on inv3 - must be carried over
let grantByRA: GrantRow; // active, BY RA TO RC on inv1 - must survive untouched
let grantExpired: GrantRow; // expired, TO RA - outside rotation's scope
let grantRevoked: GrantRow; // revoked, TO RA - outside rotation's scope

function namesOf(): Map<string, string> {
  return new Map(USER_IDS.map((id) => [id, `Name of ${id}`]));
}

async function accessFor(viewerId: string): Promise<EnvelopeAccessContext> {
  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, USER_IDS));
  return {
    viewerId,
    holdersByInvoice: await wrappedKeyHolders(invoiceIds),
    publicKeyJwkById: new Map(users.map((u) => [u.id, u.publicKeyJwk])),
  };
}

/** The exact full-coverage input for RA's first rotation (KEY_RA_1 -> KEY_RA_2). */
function fullRotation() {
  return {
    userId: RA,
    fence: 0, // personas are created fresh, so their fence starts at 0
    currentPublicKeyJwk: KEY_RA_1,
    newPublicKeyJwk: KEY_RA_2,
    invoiceCopies: [
      { invoiceId: inv1.id, wrappedKey: "REWRAP_RA_INV1" },
      { invoiceId: inv2.id, wrappedKey: "REWRAP_RA_INV2" },
    ],
    grantCopies: [{ grantId: grantToRA.id, wrappedKey: "REWRAP_RA_GRANT" }],
    dropGrantIds: [] as string[],
  };
}

async function snapshotRA() {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, RA));
  const wraps = await db
    .select()
    .from(wrappedKeysTable)
    .where(eq(wrappedKeysTable.userId, RA));
  const grants = await db
    .select()
    .from(grantsTable)
    .where(inArray(grantsTable.invoiceId, invoiceIds));
  return {
    publicKeyJwk: user?.publicKeyJwk,
    wraps: new Map(wraps.map((w) => [w.invoiceId, w.wrappedKey])),
    grants: new Map(grants.map((g) => [g.id, g.wrappedKey])),
  };
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values([
      { id: RA, displayName: "KeyRot A", publicKeyJwk: KEY_RA_1, isTestPersona: true },
      { id: RB, displayName: "KeyRot B", publicKeyJwk: '{"kty":"RSA","n":"rb","e":"AQAB"}', isTestPersona: true },
      { id: RC, displayName: "KeyRot C", publicKeyJwk: '{"kty":"RSA","n":"rc","e":"AQAB"}', isTestPersona: true },
      { id: RD, displayName: "KeyRot D", publicKeyJwk: null, isTestPersona: true },
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
        invoiceNumber: `ROT-${freelancerId.slice(-1)}${clientId.slice(-1)}-${Date.now()}`,
        freelancerId,
        clientId,
        amountUsdc: "1.00",
        fingerprint: "cd".repeat(32),
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

  inv1 = await mkInvoice(RA, RB, [RA, RB]);
  inv2 = await mkInvoice(RB, RA, [RA, RB]);
  inv3 = await mkInvoice(RB, RC, [RB, RC]);

  const hourAhead = new Date(Date.now() + 60 * 60 * 1000);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const inserted = await db
    .insert(grantsTable)
    .values([
      { invoiceId: inv3.id, grantorId: RB, granteeId: RA, wrappedKey: "GRANT_RB_TO_RA", expiresAt: hourAhead },
      { invoiceId: inv1.id, grantorId: RA, granteeId: RC, wrappedKey: "GRANT_RA_TO_RC", expiresAt: hourAhead },
      { invoiceId: inv3.id, grantorId: RB, granteeId: RA, wrappedKey: "GRANT_EXPIRED", expiresAt: hourAgo },
      {
        invoiceId: inv3.id,
        grantorId: RB,
        granteeId: RA,
        wrappedKey: "GRANT_REVOKED",
        expiresAt: hourAhead,
        revokedAt: hourAgo,
      },
    ])
    .returning();
  [grantToRA, grantByRA, grantExpired, grantRevoked] = inserted as [
    GrantRow,
    GrantRow,
    GrantRow,
    GrantRow,
  ];
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

describe("heldWrappedKeys", () => {
  it("lists every invoice copy plus only the ACTIVE grants received", async () => {
    const held = await heldWrappedKeys(RA);
    expect(new Set(held.invoiceCopies.map((c) => c.invoiceId))).toEqual(
      new Set([inv1.id, inv2.id]),
    );
    // The expired and revoked grants to RA are excluded; the grant RA
    // issued to someone else never belonged here.
    expect(held.grantCopies.map((g) => g.id)).toEqual([grantToRA.id]);
  });
});

describe("rotation refusals (each one must change nothing)", () => {
  it("refuses a rotation prepared against a key that is not the registered one", async () => {
    const before = await snapshotRA();
    const result = await applyKeyRotation({
      ...fullRotation(),
      currentPublicKeyJwk: '{"kty":"RSA","n":"STALE","e":"AQAB"}',
    });
    expect(result).toEqual({ ok: false, reason: "key_changed" });
    expect(await snapshotRA()).toEqual(before);
  });

  it("calls a double submit by its real name: the key is already registered", async () => {
    // Echo is stale AND the new key equals the registered one - the
    // key_unchanged answer must win, it is terminal rather than a retry hint.
    const result = await applyKeyRotation({
      ...fullRotation(),
      currentPublicKeyJwk: '{"kty":"RSA","n":"STALE","e":"AQAB"}',
      newPublicKeyJwk: KEY_RA_1,
    });
    expect(result).toEqual({ ok: false, reason: "key_unchanged" });
  });

  it("refuses when an invoice copy is missing from the request", async () => {
    const input = fullRotation();
    input.invoiceCopies = input.invoiceCopies.slice(0, 1);
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses an invoice copy the account does not hold", async () => {
    const input = fullRotation();
    input.invoiceCopies = [
      ...input.invoiceCopies.slice(0, 1),
      { invoiceId: inv3.id, wrappedKey: "NOT_MINE" }, // RA holds no copy on inv3
    ];
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses duplicate invoice copies", async () => {
    const input = fullRotation();
    input.invoiceCopies = [...input.invoiceCopies, input.invoiceCopies[0]!];
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses when an active received grant is neither re-wrapped nor dropped", async () => {
    const input = fullRotation();
    input.grantCopies = [];
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses a grant listed as both re-wrapped and dropped", async () => {
    const input = fullRotation();
    input.dropGrantIds = [grantToRA.id];
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses a grant id the account does not hold (e.g. issued BY the caller)", async () => {
    const input = fullRotation();
    input.grantCopies = [
      ...input.grantCopies,
      { grantId: grantByRA.id, wrappedKey: "NOT_A_RECEIVED_GRANT" },
    ];
    const result = await applyKeyRotation(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("coverage_mismatch");
  });

  it("refuses a user with no registered key, and an unknown user", async () => {
    expect(
      await applyKeyRotation({ ...fullRotation(), userId: RD }),
    ).toEqual({ ok: false, reason: "no_registered_key" });
    expect(
      await applyKeyRotation({ ...fullRotation(), userId: "test_keyrot_nobody" }),
    ).toEqual({ ok: false, reason: "no_user" });
  });

  it("after all refusals, nothing anywhere has changed", async () => {
    const snap = await snapshotRA();
    expect(snap.publicKeyJwk).toBe(KEY_RA_1);
    expect(snap.wraps.get(inv1.id)).toBe(`WRAP_${RA}_${inv1.id.slice(0, 8)}`);
    expect(snap.wraps.get(inv2.id)).toBe(`WRAP_${RA}_${inv2.id.slice(0, 8)}`);
    expect(snap.grants.get(grantToRA.id)).toBe("GRANT_RB_TO_RA");
  });
});

describe("successful rotation", () => {
  it("swaps the key and every copy together, and counterparties see no flags", async () => {
    const result = await applyKeyRotation(fullRotation());
    expect(result).toEqual({
      ok: true,
      user: expect.objectContaining({ id: RA, publicKeyJwk: KEY_RA_2 }),
      rewrappedInvoiceCopies: 2,
      rewrappedGrantCopies: 1,
      droppedGrants: 0,
    });

    const snap = await snapshotRA();
    expect(snap.publicKeyJwk).toBe(KEY_RA_2);
    expect(snap.wraps.get(inv1.id)).toBe("REWRAP_RA_INV1");
    expect(snap.wraps.get(inv2.id)).toBe("REWRAP_RA_INV2");
    expect(snap.grants.get(grantToRA.id)).toBe("REWRAP_RA_GRANT");
    // Untouched: the grant RA issued, and the dead grants to RA.
    expect(snap.grants.get(grantByRA.id)).toBe("GRANT_RA_TO_RC");
    expect(snap.grants.get(grantExpired.id)).toBe("GRANT_EXPIRED");
    expect(snap.grants.get(grantRevoked.id)).toBe("GRANT_REVOKED");

    // RB's own copies were never touched.
    const rbWraps = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.userId, RB));
    for (const wrap of rbWraps) {
      expect(wrap.wrappedKey).toBe(`WRAP_${RB}_${wrap.invoiceId.slice(0, 8)}`);
    }

    // The whole point: nobody is asked to do anything about it.
    const names = namesOf();
    for (const inv of [inv1, inv2]) {
      const asRA = toInvoice(inv, names, await accessFor(RA)) as Record<string, unknown>;
      expect(asRA.myCopyLocked).toBe(false);
      expect(asRA.counterpartyNeedsRekey).toBe(false);
      const asRB = toInvoice(inv, names, await accessFor(RB)) as Record<string, unknown>;
      expect(asRB.myCopyLocked).toBe(false);
      expect(asRB.counterpartyNeedsRekey).toBe(false);
      expect(asRB.counterpartyPublicKeyJwk).toBeNull();
    }
  });

  it("re-submitting the same rotation is refused as key_unchanged, not applied twice", async () => {
    expect(await applyKeyRotation(fullRotation())).toEqual({
      ok: false,
      reason: "key_unchanged",
    });
  });

  it("can drop a received grant instead of carrying it over", async () => {
    const result = await applyKeyRotation({
      userId: RA,
      fence: 0,
      currentPublicKeyJwk: KEY_RA_2,
      newPublicKeyJwk: KEY_RA_3,
      invoiceCopies: [
        { invoiceId: inv1.id, wrappedKey: "REWRAP2_RA_INV1" },
        { invoiceId: inv2.id, wrappedKey: "REWRAP2_RA_INV2" },
      ],
      grantCopies: [],
      dropGrantIds: [grantToRA.id],
    });
    expect(result).toEqual({
      ok: true,
      user: expect.objectContaining({ publicKeyJwk: KEY_RA_3 }),
      rewrappedInvoiceCopies: 2,
      rewrappedGrantCopies: 0,
      droppedGrants: 1,
    });
    const [dropped] = await db
      .select()
      .from(grantsTable)
      .where(eq(grantsTable.id, grantToRA.id));
    expect(dropped).toBeUndefined();
    // The grant RA issued to RC still stands.
    const [kept] = await db
      .select()
      .from(grantsTable)
      .where(eq(grantsTable.id, grantByRA.id));
    expect(kept?.wrappedKey).toBe("GRANT_RA_TO_RC");
  });
});

describe("the rotation fence (crash-recovery guard)", () => {
  // The scenario this exists for: a page stages a new keypair, sends the
  // rotation, and dies before the answer. A fresh load must decide what to
  // do with the ONLY copy of the new private key - and looking at the
  // registered key alone is a trap, because the dead page's request may
  // still be in flight and commit later. Recovery bumps the fence FIRST;
  // whichever side wins the row lock, no key can be lost.

  it("fences out a rotation prepared before the bump, and nothing changes", async () => {
    // State after the drop test: registered KEY_RA_3, fence 0, no grants.
    const before = await snapshotRA();
    expect(await bumpRotationFence(RA)).toEqual({
      fence: 1,
      publicKeyJwk: KEY_RA_3,
    });
    // The zombie request arrives AFTER recovery already decided.
    const result = await applyKeyRotation({
      userId: RA,
      fence: 0, // read before the bump
      currentPublicKeyJwk: KEY_RA_3,
      newPublicKeyJwk: KEY_RA_4,
      invoiceCopies: [
        { invoiceId: inv1.id, wrappedKey: "ZOMBIE_INV1" },
        { invoiceId: inv2.id, wrappedKey: "ZOMBIE_INV2" },
      ],
      grantCopies: [],
      dropGrantIds: [],
    });
    expect(result).toEqual({ ok: false, reason: "fence_changed" });
    expect(await snapshotRA()).toEqual(before);
  });

  it("a rotation prepared against the CURRENT fence works after a recovery ran", async () => {
    const result = await applyKeyRotation({
      userId: RA,
      fence: 1, // the post-recovery value a reloaded page reads
      currentPublicKeyJwk: KEY_RA_3,
      newPublicKeyJwk: KEY_RA_4,
      invoiceCopies: [
        { invoiceId: inv1.id, wrappedKey: "REWRAP3_RA_INV1" },
        { invoiceId: inv2.id, wrappedKey: "REWRAP3_RA_INV2" },
      ],
      grantCopies: [],
      dropGrantIds: [],
    });
    expect(result.ok).toBe(true);
    expect((await snapshotRA()).publicKeyJwk).toBe(KEY_RA_4);
  });

  it("reports null for an unknown user, so recovery retains instead of guessing", async () => {
    expect(await bumpRotationFence("test_keyrot_nobody")).toBeNull();
  });

  it("under real lock contention, the rotation either commits or is fenced - never half", async () => {
    // The reviewer-nightmare interleaving, eight rounds: recovery (the
    // bump) races a zombie rotation for the same row lock. Both orders are
    // legal; what may never happen is a half state - a committed swap the
    // recovering browser already decided to forget, or a refused swap that
    // still touched something.
    for (let i = 0; i < 8; i++) {
      const [row] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, RA));
      const currentKey = row!.publicKeyJwk!;
      const currentFence = row!.rotationFence;
      const nextKey = `{"kty":"RSA","n":"race${i}","e":"AQAB"}`;
      const wrapsBefore = (await snapshotRA()).wraps;

      const [rotation] = await Promise.all([
        applyKeyRotation({
          userId: RA,
          fence: currentFence,
          currentPublicKeyJwk: currentKey,
          newPublicKeyJwk: nextKey,
          invoiceCopies: [
            { invoiceId: inv1.id, wrappedKey: `RACE${i}_INV1` },
            { invoiceId: inv2.id, wrappedKey: `RACE${i}_INV2` },
          ],
          grantCopies: [],
          dropGrantIds: [],
        }),
        bumpRotationFence(RA),
      ]);

      const after = await snapshotRA();
      if (rotation.ok) {
        // The rotation won the lock. Recovery's bump then reported the NEW
        // key, so the recovering browser promotes its staged copy - which
        // is exactly the key everything is now wrapped for.
        expect(after.publicKeyJwk).toBe(nextKey);
        expect(after.wraps.get(inv1.id)).toBe(`RACE${i}_INV1`);
        expect(after.wraps.get(inv2.id)).toBe(`RACE${i}_INV2`);
      } else {
        // Recovery won. The rotation was fenced out and the world is
        // EXACTLY as it was - discarding the staged copy loses nothing.
        expect(rotation.reason).toBe("fence_changed");
        expect(after.publicKeyJwk).toBe(currentKey);
        expect(after.wraps).toEqual(wrapsBefore);
      }
    }
  });
});
