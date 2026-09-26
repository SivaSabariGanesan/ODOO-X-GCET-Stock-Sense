import {
  pgTable,
  uuid,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { products } from "./products.js";
import { locations } from "./locations.js";

// ---------------------------------------------------------------------------
// stock_balances
// ---------------------------------------------------------------------------
// The single source of truth for CURRENT stock levels.
//
// Each row represents: "how many units of product X are at location Y right
// now". Person 2's inventory-operation domain is the ONLY writer to this
// table — receipts, deliveries, transfers, and adjustments all resolve to
// delta updates here.
//
// This schema intentionally contains NO business logic; it is a pure ledger
// position table.
//
// Quantity fields use numeric(15,4) to support fractional units (e.g. 1.5 kg)
// and large warehouses without floating-point rounding errors.
//
// reserved_quantity tracks stock committed to outgoing operations (deliveries,
// transfers) so the available quantity can be computed as:
//   available = quantity - reserved_quantity
// ---------------------------------------------------------------------------

export const stockBalances = pgTable(
  "stock_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Scope — the unique key
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    // Current quantities
    quantity: numeric("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),
    // CHECK quantity >= 0 and reserved_quantity >= 0 enforced in migration SQL
    // CHECK reserved_quantity <= quantity enforced in migration SQL

    // Timestamp of last stock-affecting write (not a general updated_at —
    // this tracks the inventory event time for audit trail purposes)
    lastMovedAt: timestamp("last_moved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Standard row timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Primary lookup constraint: one balance row per product+location
    productLocationUniq: uniqueIndex(
      "stock_balances_product_location_uniq"
    ).on(t.productId, t.locationId),

    productIdIdx: index("stock_balances_product_id_idx").on(t.productId),
    locationIdIdx: index("stock_balances_location_id_idx").on(t.locationId),

    // Composite index for the most common dashboard query:
    // "all stock at a given location, ordered by product"
    locationProductIdx: index("stock_balances_location_product_idx").on(
      t.locationId,
      t.productId
    ),
  })
);

export type StockBalance = typeof stockBalances.$inferSelect;
export type NewStockBalance = typeof stockBalances.$inferInsert;
