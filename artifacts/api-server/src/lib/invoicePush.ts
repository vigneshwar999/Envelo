import { eq, inArray } from "drizzle-orm";
import { db, pushTokensTable, type InvoiceRow } from "@workspace/db";
import { fmt2 } from "./serializers";

/**
 * Push notifications for freshly created invoices, sent through Expo's push
 * service (exp.host). Tokens land in push_tokens when the mobile app
 * registers a device; this module is the only place that reads them.
 *
 * Everything here is metadata the server already stores in plaintext
 * (sender name, invoice number, amount) - the sealed document itself never
 * appears in a notification, consistent with the envelope model.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export interface PushMessage {
  /** An Expo push token, e.g. "ExponentPushToken[...]". */
  to: string;
  title: string;
  body: string;
  /** Read by the app when the notification is tapped - drives the deep link. */
  data: { url: string; invoiceId: string };
  sound: "default";
  /** Android notification channel; the app creates "invoices" on startup. */
  channelId: string;
}

/** One entry per message, same order, straight from Expo's response. */
export interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export type SendPushFn = (messages: PushMessage[]) => Promise<PushTicket[]>;

/** The real transport. Expo's push API needs no credentials for this use. */
export const sendExpoPush: SendPushFn = async (messages) => {
  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo push API answered ${res.status}`);
  }
  const parsed = (await res.json()) as { data?: PushTicket[] };
  return Array.isArray(parsed.data) ? parsed.data : [];
};

/**
 * Names and invoice numbers are user-controlled and land in an OS
 * notification: strip control characters and cap the length so nothing can
 * deform or overflow it.
 */
function cleanLine(s: string | null | undefined, max: number): string {
  return (s ?? "")
    .replace(/[\r\n\t\v\f\u0000-\u001f]+/g, " ")
    .trim()
    .slice(0, max);
}

export interface InvoicePushOutcome {
  outcome: "sent" | "no_device" | "send_failed";
  deviceCount: number;
  staleTokensDropped: number;
}

/**
 * Tell the client's phone(s) that a new sealed invoice arrived. Called
 * fire-and-forget from invoice creation: a push failure must never fail (or
 * slow) the invoice itself. One message per registered device; a
 * DeviceNotRegistered ticket means Expo declared that token dead forever
 * (app uninstalled, permissions revoked), so its row is dropped to keep
 * future sends clean.
 */
export async function notifyClientOfNewInvoice(
  invoice: InvoiceRow,
  creatorName: string | null | undefined,
  send: SendPushFn = sendExpoPush,
): Promise<InvoicePushOutcome> {
  const devices = await db
    .select()
    .from(pushTokensTable)
    .where(eq(pushTokensTable.userId, invoice.clientId));
  if (devices.length === 0) {
    return { outcome: "no_device", deviceCount: 0, staleTokensDropped: 0 };
  }

  const from = cleanLine(creatorName, 80) || "Someone you invoice with";
  const number = cleanLine(invoice.invoiceNumber, 40);
  const messages: PushMessage[] = devices.map((device) => ({
    to: device.token,
    title: number ? `${from} sent you invoice ${number}` : `${from} sent you a new invoice`,
    // Honest labelling: these are test USDC on the Arc testnet, never real money.
    body: `${fmt2(invoice.amountUsdc)} test USDC — tap to open the sealed invoice.`,
    data: { url: `/invoice/${invoice.id}`, invoiceId: invoice.id },
    sound: "default",
    channelId: "invoices",
  }));

  let tickets: PushTicket[];
  try {
    tickets = await send(messages);
  } catch {
    return {
      outcome: "send_failed",
      deviceCount: devices.length,
      staleTokensDropped: 0,
    };
  }

  const staleTokens: string[] = [];
  tickets.forEach((ticket, i) => {
    if (ticket?.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      const token = devices[i]?.token;
      if (token) staleTokens.push(token);
    }
  });
  if (staleTokens.length > 0) {
    await db
      .delete(pushTokensTable)
      .where(inArray(pushTokensTable.token, staleTokens));
  }
  return {
    outcome: "sent",
    deviceCount: devices.length,
    staleTokensDropped: staleTokens.length,
  };
}
