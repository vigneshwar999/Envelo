import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { usersTable } from "./users";

// Time-limited, revocable view access. The AES key is re-wrapped for the
// grantee in the grantor's browser - the server still never sees plaintext.
export const grantsTable = pgTable("grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoicesTable.id),
  grantorId: text("grantor_id")
    .notNull()
    .references(() => usersTable.id),
  granteeId: text("grantee_id")
    .notNull()
    .references(() => usersTable.id),
  // AES key re-wrapped for the grantee, produced in the grantor's browser.
  wrappedKey: text("wrapped_key").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GrantRow = typeof grantsTable.$inferSelect;
