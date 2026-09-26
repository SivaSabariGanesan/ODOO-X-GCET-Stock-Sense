import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------
// Product categories. Flat list (no hierarchy needed at the category level —
// Odoo keeps category hierarchy on the product.pos_category side, which is
// outside this domain).
//
// Soft-delete via is_active so existing product references remain valid after
// a category is retired.
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),

    // Display — optional hex color for UI badges (matches Odoo kanban palette)
    color: varchar("color", { length: 7 }), // e.g. "#71639e"

    // State
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    nameIdx: index("categories_name_idx").on(t.name),
    isActiveIdx: index("categories_is_active_idx").on(t.isActive),
  })
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
