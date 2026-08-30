import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// One row per re-share heads-up EMAIL actually sent (skipped or failed sends
// never land here). Doubles as the rate limiter: before emailing someone,
// the notifier checks for a row in the last 24 hours - one email per
// recipient per day, across all resets, no exceptions. The dashboard banner
// stays the always-on in-app signal.
export const reshareNotificationsTable = pgTable(
  "reshare_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => usersTable.id),
    resetterUserId: text("resetter_user_id")
      .notNull()
      .references(() => usersTable.id),
    // How many of the recipient's invoices were waiting when the email went out.
    invoiceCount: integer("invoice_count").notNull(),
    sentAt: timestamp("sent_at").defaultNow().notNull(),
  },
  (t) => [
    // The rate-limit check is "any row for this recipient in the last 24h" -
    // keep it an index lookup as the log grows.
    index("reshare_notifications_recipient_sent_idx").on(
      t.recipientUserId,
      t.sentAt,
    ),
  ],
);

export type ReshareNotificationRow = typeof reshareNotificationsTable.$inferSelect;
