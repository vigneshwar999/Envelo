import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";

// Plain-language audit trail per invoice.
export const invoiceEventsTable = pgTable("invoice_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoicesTable.id),
  // created | anchored | paid | grant_issued | grant_revoked | envelope_opened | verified
  kind: text("kind").notNull(),
  // Null for system events (like automatic anchoring).
  actorId: text("actor_id"),
  detail: text("detail").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoiceEventRow = typeof invoiceEventsTable.$inferSelect;
