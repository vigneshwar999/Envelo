import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// Receipts of money moved OUT of a user's app-managed wallet to their own
// linked wallet. The transfer transaction is signed locally first, which
// makes its hash known BEFORE anything is sent; a row with that hash (status
// "sending") is then written durably, and only if that write succeeds is the
// transaction broadcast - money never moves without its receipt row already
// existing. The row flips to "confirmed" once the Arc testnet confirms (or
// "failed" if it never made it). Reads only ever show "confirmed" rows, so
// the list never claims money moved when it did not. Rows a crash or slow
// network leaves in "sending" are settled against the chain itself (the
// pre-known hash is the proof) the next time the owner loads their receipts.
//
// Provisioning: like every table here, dev gets it via `drizzle-kit push`
// (the post-merge script runs it) and production gets it from Replit's
// Publish-time schema diff - this project intentionally has no migration
// files (see replit.md, "Production database & publishing").
export const walletTransfersTable = pgTable("wallet_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id),
  // Exact amount in wei (test USDC has 18 decimals), stored as text so no
  // precision is ever lost; formatted for humans at read time.
  amountWei: text("amount_wei").notNull(),
  toAddress: text("to_address").notNull(),
  // One receipt per transaction, ever - retries and reconciliation stay
  // idempotent because the chain's own identifier is the key.
  txHash: text("tx_hash").notNull().unique(),
  // sending -> confirmed | failed. The default backfills rows written before
  // this column existed, all of which were confirmed-only by construction.
  status: text("status").notNull().default("confirmed"),
  // When the CURRENT attempt to broadcast this transaction started. Refreshed
  // when a retry of the same signed bytes revives the row, this doubles as a
  // version token: settlement updates only apply if the row still carries the
  // exact timestamp the observer read, so a stale chain observation can never
  // overwrite a newer attempt or a concurrent confirmation.
  // precision 3 (milliseconds): JS Dates carry milliseconds, so the value
  // must round-trip exactly for the compare-and-set to ever match.
  lastAttemptAt: timestamp("last_attempt_at", { precision: 3 })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WalletTransferRow = typeof walletTransfersTable.$inferSelect;
