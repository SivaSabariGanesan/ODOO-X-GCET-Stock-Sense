import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const passwordResetOtps = pgTable(
  "password_reset_otps",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    otpHash: text("otp_hash").notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isUsed: boolean("is_used").notNull().default(false),

    attemptCount: integer("attempt_count").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => ({
    userIdIdx: index("password_reset_otps_user_id_idx").on(t.userId),
    expiresAtIdx: index("password_reset_otps_expires_at_idx").on(t.expiresAt),
  })
);

export type PasswordResetOtp = typeof passwordResetOtps.$inferSelect;
export type NewPasswordResetOtp = typeof passwordResetOtps.$inferInsert;
