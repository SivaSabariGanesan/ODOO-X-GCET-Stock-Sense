import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { deliveries } from "./deliveries.js";
import { products } from "./products.js";
import { locations } from "./locations.js";

// ---------------------------------------------------------------------------
// delivery_items
// ---------------------------------------------------------------------------
// Line items contained within an outgoing delivery order.
// Specifies product, source location inside the warehouse, and quantity.
// ---------------------------------------------------------------------------

export const deliveryItems = pgTable(
  "delivery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent Delivery
    deliveryId: uuid("delivery_id")
      .notNull()
      .references(() => deliveries.id, { onDelete: "cascade" }),

    // Item details
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    // Quantity & Pricing
    quantity: numeric("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    unitPrice: numeric("unit_price", { precision: 15, scale: 4 }),
    notes: text("notes"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    deliveryIdIdx: index("delivery_items_delivery_id_idx").on(t.deliveryId),
    productIdIdx: index("delivery_items_product_id_idx").on(t.productId),
    sourceLocationIdIdx: index(
      "delivery_items_source_location_id_idx"
    ).on(t.sourceLocationId),
  })
);

export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type NewDeliveryItem = typeof deliveryItems.$inferInsert;
