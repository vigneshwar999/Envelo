import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import {
  db,
  invoicesTable,
  pushTokensTable,
  usersTable,
  type InvoiceRow,
} from "@workspace/db";
import {
  notifyClientOfNewInvoice,
  type PushMessage,
  type PushTicket,
} from "./invoicePush";

// Runs against the real development Postgres (DATABASE_URL), like
// reshareNotify.test.ts: the point is to prove exactly which devices get a
// push when an invoice is created, what the notification says (honest "test
// USDC" labelling, deep-link payload), and that dead tokens are dropped
// while everything else survives. Every row created here is deleted in
// afterAll.

const F = "test_push_freelancer"; // sends the invoice
const C = "test_push_client"; // has TWO registered devices
const X = "test_push_nodevice"; // registered no device at all
const USER_IDS = [F, C, X];

const TOKEN_A = "ExponentPushToken[test-push-device-a]";
const TOKEN_B = "ExponentPushToken[test-push-device-b]";

const invoiceIds: string[] = [];

async function mkInvoice(clientId: string, overrides?: Partial<{ invoiceNumber: string }>): Promise<InvoiceRow> {
  const [row] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber: overrides?.invoiceNumber ?? `PSH-${Date.now()}-${invoiceIds.length}`,
      freelancerId: F,
      clientId,
      amountUsdc: "270.50",
      fingerprint: "ab".repeat(32),
      ciphertext: "dGVzdA==",
    })
    .returning();
  invoiceIds.push(row!.id);
  return row!;
}

/** A send function that records every message and answers "ok" per message. */
function recorder(sent: PushMessage[][]) {
  return async (messages: PushMessage[]): Promise<PushTicket[]> => {
    sent.push(messages);
    return messages.map(() => ({ status: "ok" as const }));
  };
}

async function registeredTokens(): Promise<string[]> {
  const rows = await db
    .select()
    .from(pushTokensTable)
    .where(inArray(pushTokensTable.token, [TOKEN_A, TOKEN_B]));
  return rows.map((row) => row.token).sort();
}

beforeAll(async () => {
  await db
    .insert(usersTable)
    .values(
      USER_IDS.map((id) => ({
        id,
        displayName: id === F ? "Asha Freelancer" : `User ${id}`,
        isTestPersona: true,
      })),
    )
    .onConflictDoNothing();
});

afterAll(async () => {
  await db
    .delete(pushTokensTable)
    .where(inArray(pushTokensTable.userId, USER_IDS));
  if (invoiceIds.length > 0) {
    await db.delete(invoicesTable).where(inArray(invoicesTable.id, invoiceIds));
  }
  await db.delete(usersTable).where(inArray(usersTable.id, USER_IDS));
});

describe("notifyClientOfNewInvoice", () => {
  it("sends one push per registered device of the client, with honest test-USDC copy and a deep link", async () => {
    await db
      .insert(pushTokensTable)
      .values([
        { token: TOKEN_A, userId: C, platform: "ios" },
        { token: TOKEN_B, userId: C, platform: "android" },
      ])
      .onConflictDoUpdate({
        target: pushTokensTable.token,
        set: { userId: C },
      });
    const invoice = await mkInvoice(C, { invoiceNumber: "INV-042" });

    const sent: PushMessage[][] = [];
    const result = await notifyClientOfNewInvoice(invoice, "Asha Freelancer", recorder(sent));

    expect(result.outcome).toBe("sent");
    expect(result.deviceCount).toBe(2);
    expect(sent).toHaveLength(1);
    const messages = sent[0]!;
    expect(messages.map((m) => m.to).sort()).toEqual([TOKEN_A, TOKEN_B]);
    for (const msg of messages) {
      expect(msg.title).toBe("Asha Freelancer sent you invoice INV-042");
      expect(msg.body).toContain("270.50 test USDC");
      // Honesty rule: "USDC" never appears without the "test " qualifier.
      expect(`${msg.title} ${msg.body}`).not.toMatch(/(?<!test )USDC/);
      expect(msg.data.url).toBe(`/invoice/${invoice.id}`);
      expect(msg.data.invoiceId).toBe(invoice.id);
      expect(msg.channelId).toBe("invoices");
    }
  });

  it("does nothing (and does not call the transport) when the client has no registered device", async () => {
    const invoice = await mkInvoice(X);
    const sent: PushMessage[][] = [];
    const result = await notifyClientOfNewInvoice(invoice, "Asha Freelancer", recorder(sent));
    expect(result).toEqual({ outcome: "no_device", deviceCount: 0, staleTokensDropped: 0 });
    expect(sent).toHaveLength(0);
  });

  it("strips control characters from names and invoice numbers before they reach a notification", async () => {
    const invoice = await mkInvoice(C, { invoiceNumber: "INV\n-\t043" });
    const sent: PushMessage[][] = [];
    await notifyClientOfNewInvoice(invoice, "Asha\r\nInjected", recorder(sent));
    const msg = sent[0]![0]!;
    expect(msg.title).toBe("Asha Injected sent you invoice INV - 043");
    expect(msg.title).not.toMatch(/[\r\n\t]/);
  });

  it("falls back to a neutral sender label when the creator has no usable name", async () => {
    const invoice = await mkInvoice(C, { invoiceNumber: "INV-044" });
    const sent: PushMessage[][] = [];
    await notifyClientOfNewInvoice(invoice, "\u0000\u0001", recorder(sent));
    expect(sent[0]![0]!.title).toBe("Someone you invoice with sent you invoice INV-044");
  });

  it("drops a token Expo reports as DeviceNotRegistered and keeps the healthy one", async () => {
    expect(await registeredTokens()).toEqual([TOKEN_A, TOKEN_B]);
    const invoice = await mkInvoice(C);
    const failFirst = async (messages: PushMessage[]): Promise<PushTicket[]> =>
      messages.map((msg) =>
        msg.to === TOKEN_A
          ? {
              status: "error" as const,
              message: "not registered",
              details: { error: "DeviceNotRegistered" },
            }
          : { status: "ok" as const },
      );

    const result = await notifyClientOfNewInvoice(invoice, "Asha Freelancer", failFirst);
    expect(result.outcome).toBe("sent");
    expect(result.staleTokensDropped).toBe(1);
    expect(await registeredTokens()).toEqual([TOKEN_B]);
  });

  it("reports send_failed and keeps all tokens when the transport itself blows up", async () => {
    const invoice = await mkInvoice(C);
    const result = await notifyClientOfNewInvoice(invoice, "Asha Freelancer", async () => {
      throw new Error("expo unreachable");
    });
    expect(result).toEqual({ outcome: "send_failed", deviceCount: 1, staleTokensDropped: 0 });
    expect(await registeredTokens()).toEqual([TOKEN_B]);
  });
});
