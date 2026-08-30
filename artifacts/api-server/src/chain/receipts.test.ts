import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db, usersTable, walletTransfersTable } from "@workspace/db";
import { settleReceiptIfUnchanged, upsertSendingReceipt } from "./arc";

// Runs against the real development Postgres (DATABASE_URL): the point is to
// prove the actual unique-constraint behavior, not a mock's. Every row this
// file creates is deleted again in afterAll.

const TEST_USER = "test_receipt_durability_user";
const TO = "0x000000000000000000000000000000000000dEaD" as `0x${string}`;
const createdHashes: `0x${string}`[] = [];

function freshHash(): `0x${string}` {
  const h = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
  createdHashes.push(h);
  return h;
}

async function rowFor(txHash: string) {
  const rows = await db
    .select()
    .from(walletTransfersTable)
    .where(eq(walletTransfersTable.txHash, txHash));
  return rows;
}

// File-level: both describe blocks share the seeded user and hash cleanup.
beforeAll(async () => {
  await db
    .insert(usersTable)
    .values({ id: TEST_USER, displayName: "Receipt Durability Test" })
    .onConflictDoNothing();
});

afterAll(async () => {
  if (createdHashes.length > 0) {
    await db
      .delete(walletTransfersTable)
      .where(inArray(walletTransfersTable.txHash, createdHashes));
  }
  await db.delete(usersTable).where(eq(usersTable.id, TEST_USER));
});

describe("upsertSendingReceipt (duplicate precomputed-hash writes)", () => {
  it("creates exactly one sending receipt on first write", async () => {
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 123_000_000_000_000_000n, TO, hash);
    const rows = await rowFor(hash);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("sending");
    expect(rows[0]!.amountWei).toBe("123000000000000000");
  });

  it("does not error or duplicate when the identical signed bytes are retried", async () => {
    // A retried sweep re-signs deterministically identical bytes -> same
    // hash. The second write must succeed quietly (the existing row IS the
    // durable record), never bubble a unique violation into a 503 loop.
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    await expect(
      upsertSendingReceipt(TEST_USER, 42n, TO, hash),
    ).resolves.toBeUndefined();
    const rows = await rowFor(hash);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("sending");
  });

  it("revives a receipt the reconciler had settled as failed when its tx is rebroadcast", async () => {
    // Scenario: broadcast looked dead, the row aged into "failed", then a
    // retry rebroadcasts the same signed bytes - the outcome is open again,
    // so the reconciler must watch the row again.
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    await db
      .update(walletTransfersTable)
      .set({ status: "failed" })
      .where(eq(walletTransfersTable.txHash, hash));
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    const rows = await rowFor(hash);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("sending");
  });

  it("never downgrades a confirmed receipt", async () => {
    // If the tx already confirmed (money moved), a duplicate write must not
    // push the receipt back into "sending" - confirmed is final.
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    await db
      .update(walletTransfersTable)
      .set({ status: "confirmed" })
      .where(eq(walletTransfersTable.txHash, hash));
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    const rows = await rowFor(hash);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.status).toBe("confirmed");
  });
});

describe("settleReceiptIfUnchanged (stale observers must change nothing)", () => {
  it("a stale failed-decision cannot overwrite a concurrent confirmation", async () => {
    // Interleaving: reconciler reads the row -> sweep confirms it -> the
    // reconciler (holding a stale never-seen-on-chain observation) tries to
    // fail it. Confirmed must be terminal.
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    const observed = (await rowFor(hash))[0]!;
    await db
      .update(walletTransfersTable)
      .set({ status: "confirmed" })
      .where(eq(walletTransfersTable.txHash, hash));
    await settleReceiptIfUnchanged(observed.id, observed.lastAttemptAt, "failed");
    expect((await rowFor(hash))[0]!.status).toBe("confirmed");
  });

  it("a stale failed-decision cannot settle a revived retry", async () => {
    // Interleaving: reconciler reads attempt 1 -> a retry of the identical
    // signed bytes revives the row (attempt 2, fresh timestamp) -> the stale
    // decision from attempt 1 arrives. It must be a no-op.
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    const observed = (await rowFor(hash))[0]!;
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash); // revival = new attempt
    const revived = (await rowFor(hash))[0]!;
    expect(revived.lastAttemptAt.getTime()).not.toBe(
      observed.lastAttemptAt.getTime(),
    );
    await settleReceiptIfUnchanged(observed.id, observed.lastAttemptAt, "failed");
    expect((await rowFor(hash))[0]!.status).toBe("sending");
    // A FRESH observation of the current attempt still settles normally.
    await settleReceiptIfUnchanged(
      revived.id,
      revived.lastAttemptAt,
      "confirmed",
    );
    expect((await rowFor(hash))[0]!.status).toBe("confirmed");
  });

  it("settles normally when nothing changed in between", async () => {
    const hash = freshHash();
    await upsertSendingReceipt(TEST_USER, 42n, TO, hash);
    const observed = (await rowFor(hash))[0]!;
    await settleReceiptIfUnchanged(observed.id, observed.lastAttemptAt, "failed");
    expect((await rowFor(hash))[0]!.status).toBe("failed");
  });
});
