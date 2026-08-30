import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// One row per DEVICE that opted into push notifications, keyed by the Expo
// push token itself. The token identifies a physical device + app install,
// not a person - so whoever signed in last on that device owns the row (the
// register endpoint upserts by token). A shared phone therefore never keeps
// buzzing for the previous account.
export const pushTokensTable = pgTable(
  "push_tokens",
  {
    // "ExponentPushToken[...]" issued by expo-notifications on the device.
    token: text("token").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id),
    // ios | android - web browsers never get Expo push tokens.
    platform: text("platform").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    // The send path is "every device this user registered" - keep it an
    // index lookup as devices accumulate.
    index("push_tokens_user_idx").on(t.userId),
  ],
);

export type PushTokenRow = typeof pushTokensTable.$inferSelect;
