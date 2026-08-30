import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// One row per signed-in person. The id is the Clerk user id, so the session
// identity and the database identity can never drift apart. The public
// encryption key is generated in the user's browser on first sign-in; the
// matching private key never leaves that browser.
export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  displayName: text("display_name").notNull(),
  email: text("email"),
  publicKeyJwk: text("public_key_jwk"), // RSA-OAEP public key as a JWK JSON string
  // Guard counter for graceful key rotations. Every rotation request echoes
  // the value it was prepared against; the crash-recovery check bumps it
  // (under the same row lock rotations take) so a possibly still in-flight
  // rotation from a dead page can never commit AFTER recovery decided it
  // didn't. Successful rotations do not bump it - only recovery does.
  rotationFence: integer("rotation_fence").notNull().default(0),
  // Optional self-owned wallet: when set, payments to this user land here
  // instead of their app-managed custodial wallet.
  payoutAddress: text("payout_address"),
  // Accounts used by automated checks (Ava Auditor, Bella Backup, ...).
  // They sign in and own invoices like anyone else, but the user directory
  // hides them so demo pickers stay clean. Set via SQL after the persona's
  // first sign-in creates its row.
  isTestPersona: boolean("is_test_persona").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserRow = typeof usersTable.$inferSelect;
