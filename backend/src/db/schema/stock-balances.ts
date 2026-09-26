import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { locations } from "./locations";

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    quantity: numeric("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),

    lastMovedAt: timestamp("last_moved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    productLocationUniq: uniqueIndex(
      "stock_balances_product_location_uniq"
    ).on(t.productId, t.locationId),

    productIdIdx: index("stock_balances_product_id_idx").on(t.productId),
    locationIdIdx: index("stock_balances_location_id_idx").on(t.locationId),

    locationProductIdx: index("stock_balances_location_product_idx").on(
      t.locationId,
      t.productId
    ),
  })
);

export type StockBalance = typeof stockBalances.$inferSelect;
export type NewStockBalance = typeof stockBalances.$inferInsert;
