import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Custodial testnet wallets. The row id IS the owner: the string "operator"
// for the app's own wallet, or a user id for a signed-in person's wallet.
// Storing private keys in the database is a deliberate, disclosed tradeoff
// for this testnet demo - it only ever holds valueless test USDC.
export const chainWalletsTable = pgTable("chain_wallets", {
  id: text("id").primaryKey(), // "operator" or a user id
  address: text("address").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChainWalletRow = typeof chainWalletsTable.$inferSelect;

// Tiny key/value store for chain facts we must not lose (contract address).
export const chainStateTable = pgTable("chain_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChainStateRow = typeof chainStateTable.$inferSelect;
