import { and, eq, gt, inArray, or, sql } from "drizzle-orm";
import {
  db,
  invoicesTable,
  reshareNotificationsTable,
  usersTable,
} from "@workspace/db";
import { wrappedKeyHolders } from "./keyReset";
import { sendEmail, type SendEmailFn } from "./email";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Clerk test-mode addresses (persona accounts) are undeliverable by design;
 * emailing them would only burn quota and bounce. The e2e drills reset keys
 * on every run, so this filter is what keeps them from sending anything.
 */
export function isTestModeEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.includes("+clerk_test@") || lower.endsWith("@example.com");
}

/** Display names are user-controlled; escape them before HTML interpolation. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Names also land in the subject line: strip control characters (header
 * injection) and cap the length so a hostile display name cannot deform
 * the email envelope.
 */
function cleanName(s: string | null | undefined): string {
  const cleaned = (s ?? "").replace(/[\r\n\t\v\f\u0000-\u001f]+/g, " ").trim().slice(0, 80);
  return cleaned || "Someone you invoice with";
}

export interface ResetNotificationOutcome {
  recipientId: string;
  invoiceCount: number;
  outcome: "emailed" | "no_email" | "test_address" | "rate_limited" | "send_failed";
}

/**
 * After a key reset, email every counterparty who can now unblock the
 * resetter by pressing Re-share. Grouped (one email per counterparty, however
 * many shared invoices are locked) and rate limited (never more than one
 * email per recipient per day, across ALL resets - a second reset the same
 * day stays silent; the dashboard banner still shows it).
 *
 * Only counterparties who still HOLD their own wrapped copy are emailed:
 * anyone who also reset cannot re-share (the server would refuse with
 * caller_locked), and nudging them toward a dead button would be a lie.
 *
 * Rate limiting is reservation-first so the once-per-day promise holds under
 * concurrency and crashes: inside a transaction that takes a per-recipient
 * advisory lock, we check the 24h window and insert the log row BEFORE
 * sending. Two simultaneous resets therefore cannot both pass the check, and
 * a crash after a successful send cannot cause a re-send (the row is already
 * there). Only a cleanly FAILED send deletes its reservation - erring, when
 * we must, toward fewer emails, never more. The dashboard banner is the
 * always-on fallback either way.
 *
 * Delivery is deliberately best-effort: the caller runs this fire-and-forget
 * after the reset response, so a process shutdown can abandon unsent emails.
 */
export async function notifyCounterpartiesOfReset(opts: {
  resetterId: string;
  /** Injectable for tests; defaults to the real transport. */
  send?: SendEmailFn;
  /** Injectable for tests; defaults to now. */
  now?: Date;
}): Promise<ResetNotificationOutcome[]> {
  const { resetterId } = opts;
  const send = opts.send ?? sendEmail;
  const now = opts.now ?? new Date();

  // Every invoice the resetter is a party to...
  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(
      or(
        eq(invoicesTable.freelancerId, resetterId),
        eq(invoicesTable.clientId, resetterId),
      ),
    );
  if (invoices.length === 0) return [];

  // ...whose OTHER party still holds a working wrapped copy.
  const holders = await wrappedKeyHolders(invoices.map((inv) => inv.id));
  const countByCounterparty = new Map<string, number>();
  for (const inv of invoices) {
    const otherId = inv.freelancerId === resetterId ? inv.clientId : inv.freelancerId;
    if (otherId === resetterId) continue;
    if (!holders.get(inv.id)?.has(otherId)) continue;
    countByCounterparty.set(otherId, (countByCounterparty.get(otherId) ?? 0) + 1);
  }
  if (countByCounterparty.size === 0) return [];

  const recipientIds = [...countByCounterparty.keys()];
  const users = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.id, recipientIds));
  const userById = new Map(users.map((u) => [u.id, u]));
  const [resetter] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, resetterId));
  const resetterName = cleanName(resetter?.displayName);
  const since = new Date(now.getTime() - ONE_DAY_MS);

  const outcomes: ResetNotificationOutcome[] = [];
  for (const [recipientId, invoiceCount] of countByCounterparty) {
    const email = userById.get(recipientId)?.email ?? null;
    if (!email) {
      outcomes.push({ recipientId, invoiceCount, outcome: "no_email" });
      continue;
    }
    if (isTestModeEmail(email)) {
      outcomes.push({ recipientId, invoiceCount, outcome: "test_address" });
      continue;
    }

    // Reserve the daily budget atomically (see doc comment above).
    const reserved = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${"reshare-email:" + recipientId}))`,
      );
      const recent = await tx
        .select({ id: reshareNotificationsTable.id })
        .from(reshareNotificationsTable)
        .where(
          and(
            eq(reshareNotificationsTable.recipientUserId, recipientId),
            gt(reshareNotificationsTable.sentAt, since),
          ),
        )
        .limit(1);
      if (recent.length > 0) return null;
      const [row] = await tx
        .insert(reshareNotificationsTable)
        .values({
          recipientUserId: recipientId,
          resetterUserId: resetterId,
          invoiceCount,
        })
        .returning({ id: reshareNotificationsTable.id });
      return row ?? null;
    });
    if (!reserved) {
      outcomes.push({ recipientId, invoiceCount, outcome: "rate_limited" });
      continue;
    }

    // No URL on purpose: a request-derived origin is attacker-influencable,
    // and no canonical app URL is configured yet. Plain instructions until a
    // provider (and with it a configured base URL) is wired into email.ts.
    const needs =
      invoiceCount === 1 ? "1 invoice needs" : `${invoiceCount} invoices need`;
    const subject = `${resetterName} is waiting on your re-share - Sealed Invoices`;
    const text = [
      `${resetterName} lost access to their envelope key and reset it. Their copies of ${needs} your re-share before they can read them again.`,
      `Your own copy still works. Open the Sealed Invoices app and go to your dashboard, look for the amber "waiting on your re-share" note, and press Re-share on each invoice - one click per invoice.`,
      `Why you got this: you are the other party on sealed invoices with ${resetterName}. Envelopes are end-to-end encrypted, so only your working key can re-open their copies - the app itself cannot. You will get at most one of these emails per day.`,
    ].join("\n\n");
    const safeName = escapeHtml(resetterName);
    const html = [
      `<p><strong>${safeName}</strong> lost access to their envelope key and reset it. Their copies of <strong>${needs}</strong> your re-share before they can read them again.</p>`,
      `<p>Your own copy still works. Open the Sealed Invoices app and go to your dashboard, look for the amber "waiting on your re-share" note, and press <strong>Re-share</strong> on each invoice - one click per invoice.</p>`,
      `<p style="color:#666;font-size:12px">Why you got this: you are the other party on sealed invoices with ${safeName}. Envelopes are end-to-end encrypted, so only your working key can re-open their copies - the app itself cannot. You will get at most one of these emails per day.</p>`,
    ].join("\n");

    try {
      await send({ to: email, subject, text, html });
    } catch {
      // A cleanly failed send frees its reservation so the daily budget is
      // not burned on nothing. (If we crash before this delete runs, the
      // budget stays consumed - fewer emails, never more.)
      await db
        .delete(reshareNotificationsTable)
        .where(eq(reshareNotificationsTable.id, reserved.id));
      outcomes.push({ recipientId, invoiceCount, outcome: "send_failed" });
      continue;
    }
    outcomes.push({ recipientId, invoiceCount, outcome: "emailed" });
  }
  return outcomes;
}
