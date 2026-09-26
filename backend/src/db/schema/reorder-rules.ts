import {
  pgTable,
  uuid,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { products } from "./products.js";
import { locations } from "./locations.js";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// reorder_rules
// ---------------------------------------------------------------------------
// Defines automated reorder thresholds for a specific product at a specific
// location. One rule per (product, location) pair — enforced by unique index.
//
// Quantity semantics:
//   min_quantity   — trigger a reorder when stock falls to/below this level
//   max_quantity   — target quantity to replenish to (optional ceiling)
//   reorder_qty    — fixed quantity to order per replenishment run
//                    (used when max_quantity is null)
//
// Person 2's purchase/receipt operations will read these rules to generate
// replenishment suggestions.
// ---------------------------------------------------------------------------

export const reorderRules = pgTable(
  "reorder_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Scope
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    // Thresholds — numeric(15,4) matches stock_balances precision
    minQuantity: numeric("min_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    maxQuantity: numeric("max_quantity", { precision: 15, scale: 4 }), // null = no ceiling
    reorderQty: numeric("reorder_qty", { precision: 15, scale: 4 })
      .notNull()
      .default("1"),
    // CHECK constraints (qty >= 0, reorder_qty > 0) enforced in migration SQL

    // State
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
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
    // Core business rule: one rule per product+location
    productLocationUniq: uniqueIndex("reorder_rules_product_location_uniq").on(
      t.productId,
      t.locationId
    ),
    productIdIdx: index("reorder_rules_product_id_idx").on(t.productId),
    locationIdIdx: index("reorder_rules_location_id_idx").on(t.locationId),
    isActiveIdx: index("reorder_rules_is_active_idx").on(t.isActive),
  })
);

export type ReorderRule = typeof reorderRules.$inferSelect;
export type NewReorderRule = typeof reorderRules.$inferInsert;
