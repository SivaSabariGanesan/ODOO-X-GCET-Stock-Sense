import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// password_reset_otps
// ---------------------------------------------------------------------------
// Stores hashed one-time passwords for the password-reset flow.
//
// Security properties:
//   • Raw OTP is NEVER stored — only a bcrypt/argon2 hash.
//   • Each token has a hard expiry (expires_at).
//   • is_used prevents replay after a successful verification.
//   • attempt_count lets the auth service enforce brute-force limits
//     (e.g. invalidate the token after N failed attempts) without needing
//     a second table.
// ---------------------------------------------------------------------------

export const passwordResetOtps = pgTable(
  "password_reset_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Owner
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Security — store the hash, never the raw OTP
    otpHash: text("otp_hash").notNull(),

    // Lifecycle
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").notNull().default(false),

    // Brute-force guard — incremented on each failed verification attempt
    attemptCount: integer("attempt_count").notNull().default(0),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp("used_at", { withTimezone: true }), // null until redeemed
  },
  (t) => ({
    userIdIdx: index("password_reset_otps_user_id_idx").on(t.userId),
    expiresAtIdx: index("password_reset_otps_expires_at_idx").on(t.expiresAt),
    // Note: the partial index (WHERE is_used = FALSE) for active tokens
    // cannot be expressed in Drizzle's index builder — it is defined in
    // the migration SQL as password_reset_otps_active_idx.
  })
);

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;
