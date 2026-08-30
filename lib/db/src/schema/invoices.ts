import { numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Public metadata only. The invoice contents live in `ciphertext`, sealed in
// the freelancer's browser before upload - the server never sees plaintext.
export const invoicesTable = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceNumber: text("invoice_number").notNull(),
  freelancerId: text("freelancer_id")
    .notNull()
    .references(() => usersTable.id),
  clientId: text("client_id")
    .notNull()
    .references(() => usersTable.id),
  amountUsdc: numeric("amount_usdc", { precision: 20, scale: 2 }).notNull(),
  dueDate: text("due_date"),
  // awaiting_payment | paid
  status: text("status").notNull().default("awaiting_payment"),
  // SHA-256 hex of the canonical plaintext, computed in the browser.
  fingerprint: text("fingerprint").notNull(),
  // Base64 AES-GCM envelope.
  ciphertext: text("ciphertext").notNull(),
  // pending | anchored | unavailable - honest view of the onchain state.
  anchorStatus: text("anchor_status").notNull().default("pending"),
  anchorTxHash: text("anchor_tx_hash"),
  // The registry contract this anchor lives on, pinned at anchor time. Older
  // invoices keep verifying against the contract that recorded them even
  // after the app deploys a newer registry version. Null = not anchored yet.
  contractAddress: text("contract_address"),
  payTxHash: text("pay_tx_hash"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoiceRow = typeof invoicesTable.$inferSelect;
