import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { inventoryAdjustments } from "./inventory-adjustments";
import { products } from "./products";

// ---------------------------------------------------------------------------
// inventory_adjustment_items
// ---------------------------------------------------------------------------
// Line items contained within an inventory adjustment count.
// Tracks expected system_quantity, physical counted_quantity, and difference (delta).
// Note: difference can be positive (surplus) or negative (shrinkage/loss).
// ---------------------------------------------------------------------------

export const inventoryAdjustmentItems = pgTable(
  "inventory_adjustment_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent Adjustment
    adjustmentId: uuid("adjustment_id")
      .notNull()
      .references(() => inventoryAdjustments.id, { onDelete: "cascade" }),

    // Item details
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Quantities
    systemQuantity: numeric("system_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    countedQuantity: numeric("counted_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    difference: numeric("difference", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    adjustmentIdIdx: index(
      "inventory_adjustment_items_adjustment_id_idx"
    ).on(t.adjustmentId),
    productIdIdx: index("inventory_adjustment_items_product_id_idx").on(
      t.productId
    ),
  })
);

export type InventoryAdjustmentItem =
  typeof inventoryAdjustmentItems.$inferSelect;
export type NewInventoryAdjustmentItem =
  typeof inventoryAdjustmentItems.$inferInsert;
