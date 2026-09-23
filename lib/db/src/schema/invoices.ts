import {
  bigint,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
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
  // Which Arc network this invoice lives on, fixed at creation: 5042002 is
  // the testnet sandbox (test USDC, custodial wallets), 5042 is mainnet
  // (real USDC, anchored by Envelo's operator wallet, paid from the client's
  // own wallet). Every chain read for this invoice uses this network.
  chainId: integer("chain_id").notNull().default(5042002),
  // pending | anchored | unavailable - honest view of the onchain state.
  anchorStatus: text("anchor_status").notNull().default("pending"),
  anchorTxHash: text("anchor_tx_hash"),
  // The registry contract this anchor lives on, pinned at anchor time. Older
  // invoices keep verifying against the contract that recorded them even
  // after the app deploys a newer registry version. Null = not anchored yet.
  contractAddress: text("contract_address"),
  // Registry version behind contract_address, pinned with it. Null on rows
  // anchored before this column existed, which were all v3.
  registryVersion: integer("registry_version"),
  // Block that holds the anchor, so payment logs can be searched from there.
  anchorBlock: bigint("anchor_block", { mode: "bigint" }),
  // Payment terms committed on-chain by a v4 anchor: the address that must
  // receive the money and the random salt behind the commitment hash. Fixed
  // once anchored - a later payout-wallet change does not move this invoice.
  payeeAddress: text("payee_address"),
  paymentSalt: text("payment_salt"),
  payTxHash: text("pay_tx_hash"),
  // Who paid, straight from the InvoicePaid event (null until confirmed).
  payerAddress: text("payer_address"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InvoiceRow = typeof invoicesTable.$inferSelect;
