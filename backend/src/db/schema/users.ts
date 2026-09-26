import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
// Core authentication entity. Referenced by audit fields across the domain.
// Passwords are hashed (bcrypt) by the auth service — never stored raw here.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),

    // Authentication — bcrypt hash, never the raw password
    passwordHash: text("password_hash").notNull(),

    // Role — kept as a simple enum string; extend to a roles table if RBAC
    // grows beyond these three values in a future iteration.
    role: varchar("role", { length: 50 }).notNull().default("staff"),
    // CHECK constraint is enforced in the migration SQL

    // State
    isActive: boolean("is_active").notNull().default(true),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
    roleIdx: index("users_role_idx").on(t.role),
    isActiveIdx: index("users_is_active_idx").on(t.isActive),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
