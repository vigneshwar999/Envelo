import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { invoicesTable } from "./invoices";
import { usersTable } from "./users";

// One AES envelope key per invoice, wrapped (encrypted) separately for each
// user that is allowed in from day one: the freelancer and the client.
// Anyone else gets access later through time-limited grants instead.
export const wrappedKeysTable = pgTable(
  "wrapped_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoicesTable.id),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    wrappedKey: text("wrapped_key").notNull(), // base64, RSA-OAEP wrapped
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [unique().on(t.invoiceId, t.userId)],
);

export type WrappedKeyRow = typeof wrappedKeysTable.$inferSelect;
