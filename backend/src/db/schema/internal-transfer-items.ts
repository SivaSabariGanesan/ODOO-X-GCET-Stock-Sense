import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { internalTransfers } from "./internal-transfers";
import { products } from "./products";

// ---------------------------------------------------------------------------
// internal_transfer_items
// ---------------------------------------------------------------------------
// Line items contained within an internal stock transfer.
// Specifies product and quantity to move from source to destination location.
// ---------------------------------------------------------------------------

export const internalTransferItems = pgTable(
  "internal_transfer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Parent Transfer
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => internalTransfers.id, { onDelete: "cascade" }),

    // Item details
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Quantity
    quantity: numeric("quantity", { precision: 15, scale: 4 })
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
    transferIdIdx: index("internal_transfer_items_transfer_id_idx").on(
      t.transferId
    ),
    productIdIdx: index("internal_transfer_items_product_id_idx").on(
      t.productId
    ),
  })
);

export type InternalTransferItem = typeof internalTransferItems.$inferSelect;
export type NewInternalTransferItem =
  typeof internalTransferItems.$inferInsert;
