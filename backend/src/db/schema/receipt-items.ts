import {
  pgTable,
  uuid,
  numeric,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { receipts } from "./receipts";
import { products } from "./products";
import { locations } from "./locations";

export const receiptItems = pgTable(
  "receipt_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent Receipt
    receiptId: uuid("receipt_id")
      .notNull()
      .references(() => receipts.id, { onDelete: "cascade" }),

    // Item details
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    destinationLocationId: uuid("destination_location_id")
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
    receiptIdIdx: index("receipt_items_receipt_id_idx").on(t.receiptId),
    productIdIdx: index("receipt_items_product_id_idx").on(t.productId),
    destinationLocationIdIdx: index(
      "receipt_items_destination_location_id_idx"
    ).on(t.destinationLocationId),
  })
);

export type ReceiptItem = typeof receiptItems.$inferSelect;
export type NewReceiptItem = typeof receiptItems.$inferInsert;
