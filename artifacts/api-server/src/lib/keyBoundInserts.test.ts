import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import {
  db,
  grantsTable,
  invoiceEventsTable,
  invoicesTable,
  usersTable,
  wrappedKeysTable,
  type InvoiceRow,
} from "@workspace/db";
import { insertGrantBound, insertSealedInvoice } from "./keyBoundInserts";

// Proves the key-state binding on the two writers that used to be
// unprotected: invoice creation and grant creation. Each write must echo the
// exact registered key the wrap was prepared for; a stale echo (the target
// rotated or reset since the browser read the key) is refused and the
// transaction leaves NOTHING behind - no invoice, no wrapped copies, no
// grant, no timeline event.

const KA = "test_kbi_creator";
const KB = "test_kbi_client";
const KC = "test_kbi_grantee";
const USER_IDS = [KA, KB, KC];

const KEY_A = '{"kty":"RSA","n":"kbi-a","e":"AQAB"}';
const KEY_B = '{"kty":"RSA","n":"kbi-b","e":"AQAB"}';
const KEY_C = '{"kty":"RSA","n":"kbi-c","e":"AQAB"}';
const STALE = '{"kty":"RSA","n":"kbi-stale","e":"AQAB"}';

let createdInvoice: InvoiceRow;

function invoiceInput(overrides: Partial<Parameters<typeof insertSealedInvoice>[0]> = {}) {
  return {
    creatorId: KA,
    clientId: KB,
    creatorPublicKeyJwk: KEY_A,
    clientPublicKeyJwk: KEY_B,
    invoiceNumber: `KBI-${Date.now()}`,
    amountUsdc: "1.00",
    dueDate: null,
    fingerprint: "ab".repeat(32),
    ciphertext: "dGVzdA==",
    wrappedKeys: [
      { userId: KA, wrappedKey: "WRAP_A" },
      { userId: KB, wrappedKey: "WRAP_B" },
    ],
    ...overrides,
  };
}

async function invoiceCount(): Promise<number> {
  const rows = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.freelancerId, KA));
  return rows.length;
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values([
      { id: KA, displayName: "KBI Creator", publicKeyJwk: KEY_A, isTestPersona: true },
      { id: KB, displayName: "KBI Client", publicKeyJwk: KEY_B, isTestPersona: true },
      { id: KC, displayName: "KBI Grantee", publicKeyJwk: KEY_C, isTestPersona: true },
    ])
    .onConflictDoNothing();
});

afterAll(async () => {
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(eq(invoicesTable.freelancerId, KA));
  const ids = invoices.map((i) => i.id);
  if (ids.length > 0) {
    await db.delete(invoiceEventsTable).where(inArray(invoiceEventsTable.invoiceId, ids));
    await db.delete(grantsTable).where(inArray(grantsTable.invoiceId, ids));
    await db.delete(wrappedKeysTable).where(inArray(wrappedKeysTable.invoiceId, ids));
    await db.delete(invoicesTable).where(inArray(invoicesTable.id, ids));
  }
  await db.delete(usersTable).where(inArray(usersTable.id, USER_IDS));
});

describe("insertSealedInvoice", () => {
  it("refuses a stale CLIENT key echo and leaves nothing behind", async () => {
    const before = await invoiceCount();
    const result = await insertSealedInvoice(
      invoiceInput({ clientPublicKeyJwk: STALE }),
    );
    expect(result).toEqual({
      ok: false,
      reason: "key_changed",
      whose: "client",
      displayName: "KBI Client",
    });
    expect(await invoiceCount()).toBe(before);
  });

  it("refuses a stale CREATOR key echo (rotated in another tab)", async () => {
    const result = await insertSealedInvoice(
      invoiceInput({ creatorPublicKeyJwk: STALE }),
    );
    expect(result).toEqual({
      ok: false,
      reason: "key_changed",
      whose: "creator",
      displayName: "KBI Creator",
    });
  });

  it("refuses an unknown party outright", async () => {
    const result = await insertSealedInvoice(
      invoiceInput({ clientId: "test_kbi_nobody" }),
    );
    expect(result).toEqual({ ok: false, reason: "no_user" });
  });

  it("inserts invoice, both wrapped copies, and the created event atomically when echoes match", async () => {
    const result = await insertSealedInvoice(invoiceInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    createdInvoice = result.invoice;

    const wraps = await db
      .select()
      .from(wrappedKeysTable)
      .where(eq(wrappedKeysTable.invoiceId, createdInvoice.id));
    expect(new Set(wraps.map((w) => `${w.userId}:${w.wrappedKey}`))).toEqual(
      new Set([`${KA}:WRAP_A`, `${KB}:WRAP_B`]),
    );
    const events = await db
      .select()
      .from(invoiceEventsTable)
      .where(
        and(
          eq(invoiceEventsTable.invoiceId, createdInvoice.id),
          eq(invoiceEventsTable.kind, "created"),
        ),
      );
    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toContain("KBI Creator");
    expect(events[0]!.detail).toContain("KBI Client");
  });
});

describe("insertGrantBound", () => {
  it("refuses a stale GRANTEE key echo and stores no grant", async () => {
    const result = await insertGrantBound({
      invoiceId: createdInvoice.id,
      grantorId: KA,
      grantorName: "KBI Creator",
      granteeId: KC,
      granteePublicKeyJwk: STALE,
      wrappedKey: "GRANT_WRAP_STALE",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    expect(result).toEqual({
      ok: false,
      reason: "key_changed",
      granteeName: "KBI Grantee",
    });
    const grants = await db
      .select()
      .from(grantsTable)
      .where(eq(grantsTable.invoiceId, createdInvoice.id));
    expect(grants).toHaveLength(0);
  });

  it("refuses an unknown grantee", async () => {
    const result = await insertGrantBound({
      invoiceId: createdInvoice.id,
      grantorId: KA,
      grantorName: "KBI Creator",
      granteeId: "test_kbi_nobody",
      granteePublicKeyJwk: KEY_C,
      wrappedKey: "GRANT_WRAP",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    expect(result).toEqual({ ok: false, reason: "no_grantee" });
  });

  it("stores the grant and its event when the echo matches", async () => {
    const result = await insertGrantBound({
      invoiceId: createdInvoice.id,
      grantorId: KA,
      grantorName: "KBI Creator",
      granteeId: KC,
      granteePublicKeyJwk: KEY_C,
      wrappedKey: "GRANT_WRAP_OK",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.grant.granteeId).toBe(KC);
    expect(result.granteeName).toBe("KBI Grantee");

    const events = await db
      .select()
      .from(invoiceEventsTable)
      .where(
        and(
          eq(invoiceEventsTable.invoiceId, createdInvoice.id),
          eq(invoiceEventsTable.kind, "grant_issued"),
        ),
      );
    expect(events).toHaveLength(1);
    expect(events[0]!.detail).toContain("KBI Grantee");
  });
});
