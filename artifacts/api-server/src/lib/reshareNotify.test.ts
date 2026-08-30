import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  invoicesTable,
  reshareNotificationsTable,
  usersTable,
  wrappedKeysTable,
} from "@workspace/db";
import {
  isTestModeEmail,
  notifyCounterpartiesOfReset,
} from "./reshareNotify";
import type { EmailMessage } from "./email";

// Runs against the real development Postgres (DATABASE_URL), like
// keyReset.test.ts: the point is to prove exactly who gets emailed after a
// reset, how invoices are grouped, that the once-per-day budget survives
// CONCURRENT resets, and that it only burns on a successful (or crashed)
// send - never on a cleanly failed one. Every row created here is deleted
// in afterAll.

const R = "test_notify_r"; // the resetter
const W = "test_notify_w"; // working copy + real-looking email -> gets the email
const T = "test_notify_t"; // working copy + Clerk test-mode email -> skipped
const N = "test_notify_n"; // working copy + NO email on file -> skipped
const L = "test_notify_l"; // also lost their copy -> not even a candidate
const USER_IDS = [R, W, T, N, L];

const invoiceIds: string[] = [];

async function mkInvoice(
  freelancerId: string,
  clientId: string,
  holders: string[],
): Promise<string> {
  const [row] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: `NT-${freelancerId.slice(-1)}${clientId.slice(-1)}-${Date.now()}-${invoiceIds.length}`,
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
  return row!.id;
}

/** A send function that records every message instead of sending. */
function recorder(sent: EmailMessage[]) {
  return async (msg: EmailMessage) => {
    sent.push(msg);
  };
}

async function clearSentLog(): Promise<void> {
  await db
    .delete(reshareNotificationsTable)
    .where(inArray(reshareNotificationsTable.recipientUserId, USER_IDS));
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values([
      { id: R, displayName: "Notify Resetter", email: "notify-r@example.com", isTestPersona: true },
      { id: W, displayName: "Notify Working", email: "notify-w@sealed-invoices-test.dev", isTestPersona: true },
      { id: T, displayName: "Notify Testmode", email: "notify.t+clerk_test@example.com", isTestPersona: true },
      { id: N, displayName: "Notify NoEmail", email: null, isTestPersona: true },
      { id: L, displayName: "Notify LockedToo", email: "notify-l@sealed-invoices-test.dev", isTestPersona: true },
    ])
    .onConflictDoNothing();

  // Two invoices with W (both directions - grouping must not care), one
  // each with T, N, L. The resetter R holds no copies (he just reset);
  // W, T, N still hold theirs, L does not.
  await mkInvoice(R, W, [W]);
  await mkInvoice(W, R, [W]);
  await mkInvoice(R, T, [T]);
  await mkInvoice(N, R, [N]);
  await mkInvoice(R, L, []);
});

afterAll(async () => {
  await clearSentLog();
  if (invoiceIds.length > 0) {
    await db
      .delete(wrappedKeysTable)
      .where(inArray(wrappedKeysTable.invoiceId, invoiceIds));
    await db.delete(invoicesTable).where(inArray(invoicesTable.id, invoiceIds));
  }
  await db.delete(usersTable).where(inArray(usersTable.id, USER_IDS));
});

describe("isTestModeEmail", () => {
  it("flags Clerk test-mode and example.com addresses, keeps real ones", () => {
    expect(isTestModeEmail("riko.resetter+clerk_test@example.com")).toBe(true);
    expect(isTestModeEmail("anyone@example.com")).toBe(true);
    expect(isTestModeEmail("UPPER+CLERK_TEST@EXAMPLE.COM")).toBe(true);
    expect(isTestModeEmail("real.person@gmail.com")).toBe(false);
  });
});

describe("notifyCounterpartiesOfReset", () => {
  it("emails one grouped message per capable counterparty and skips the rest", async () => {
    await clearSentLog();
    const sent: EmailMessage[] = [];
    const outcomes = await notifyCounterpartiesOfReset({
      resetterId: R,
      send: recorder(sent),
    });

    const byId = new Map(outcomes.map((o) => [o.recipientId, o]));
    expect(byId.get(W)).toMatchObject({ outcome: "emailed", invoiceCount: 2 });
    expect(byId.get(T)).toMatchObject({ outcome: "test_address" });
    expect(byId.get(N)).toMatchObject({ outcome: "no_email" });
    // L lost their own copy too - pressing Re-share would be refused, so L
    // must not appear at all.
    expect(byId.has(L)).toBe(false);

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("notify-w@sealed-invoices-test.dev");
    expect(sent[0]!.subject).toContain("Notify Resetter");
    expect(sent[0]!.text).toContain("2 invoices need");
    expect(sent[0]!.text).toContain("go to your dashboard");
  });

  it("never emails the same recipient twice within a day, across resets", async () => {
    const sent: EmailMessage[] = [];
    const outcomes = await notifyCounterpartiesOfReset({
      resetterId: R,
      send: recorder(sent),
    });
    expect(outcomes.find((o) => o.recipientId === W)!.outcome).toBe(
      "rate_limited",
    );
    expect(sent).toHaveLength(0);
  });

  it("emails again once the last send is older than a day", async () => {
    const sent: EmailMessage[] = [];
    // Pretend "now" is 25 hours in the future instead of rewriting rows.
    const outcomes = await notifyCounterpartiesOfReset({
      resetterId: R,
      send: recorder(sent),
      now: new Date(Date.now() + 25 * 60 * 60 * 1000),
    });
    expect(outcomes.find((o) => o.recipientId === W)!.outcome).toBe("emailed");
    expect(sent).toHaveLength(1);
  });

  it("a failed send consumes no daily budget - the next attempt still emails", async () => {
    await clearSentLog();
    const failing = async () => {
      throw new Error("provider down");
    };
    const failed = await notifyCounterpartiesOfReset({
      resetterId: R,
      send: failing,
    });
    expect(failed.find((o) => o.recipientId === W)!.outcome).toBe("send_failed");

    const sent: EmailMessage[] = [];
    const retried = await notifyCounterpartiesOfReset({
      resetterId: R,
      send: recorder(sent),
    });
    expect(retried.find((o) => o.recipientId === W)!.outcome).toBe("emailed");
    expect(sent).toHaveLength(1);
  });

  it("two SIMULTANEOUS resets send at most one email per recipient", async () => {
    await clearSentLog();
    // A slow transport widens the race window: without the reservation-first
    // advisory lock, both calls would pass the 24h check and both would send.
    const sent: EmailMessage[] = [];
    const slowSend = async (msg: EmailMessage) => {
      await new Promise((r) => setTimeout(r, 150));
      sent.push(msg);
    };
    const [a, b] = await Promise.all([
      notifyCounterpartiesOfReset({ resetterId: R, send: slowSend }),
      notifyCounterpartiesOfReset({ resetterId: R, send: slowSend }),
    ]);
    const forW = [a, b].map(
      (outcomes) => outcomes.find((o) => o.recipientId === W)!.outcome,
    );
    expect(forW.sort()).toEqual(["emailed", "rate_limited"]);
    expect(sent).toHaveLength(1);
  });

  it("escapes hostile display names in the HTML body and subject line", async () => {
    await clearSentLog();
    await db
      .update(usersTable)
      .set({ displayName: '<img src=x onerror=alert(1)>\r\nBcc: victim@x.dev' })
      .where(eq(usersTable.id, R));
    try {
      const sent: EmailMessage[] = [];
      const outcomes = await notifyCounterpartiesOfReset({
        resetterId: R,
        send: recorder(sent),
      });
      expect(outcomes.find((o) => o.recipientId === W)!.outcome).toBe("emailed");
      expect(sent).toHaveLength(1);
      // No raw markup in the HTML, no newlines in the subject.
      expect(sent[0]!.html).not.toContain("<img");
      expect(sent[0]!.html).toContain("&lt;img");
      expect(sent[0]!.subject).not.toMatch(/[\r\n]/);
    } finally {
      await db
        .update(usersTable)
        .set({ displayName: "Notify Resetter" })
        .where(eq(usersTable.id, R));
    }
  });
});
