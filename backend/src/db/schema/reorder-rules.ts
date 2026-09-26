import {
  pgTable,
  uuid,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { locations } from "./locations";
import { users } from "./users";

export const reorderRules = pgTable(
  "reorder_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),

    minQuantity: numeric("min_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    maxQuantity: numeric("max_quantity", { precision: 15, scale: 4 }),
    reorderQty: numeric("reorder_qty", { precision: 15, scale: 4 })
      .notNull()
      .default("1"),

    isActive: boolean("is_active").notNull().default(true),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    productIdIdx: index("reorder_rules_product_id_idx").on(t.productId),
    locationIdIdx: index("reorder_rules_location_id_idx").on(t.locationId),
    isActiveIdx: index("reorder_rules_is_active_idx").on(t.isActive),
  })
);

export type ReorderRule = typeof reorderRules.$inferSelect;
export type NewReorderRule = typeof reorderRules.$inferInsert;
