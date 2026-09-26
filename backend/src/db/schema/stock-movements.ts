import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { locations } from "./locations";
import { users } from "./users";

// ---------------------------------------------------------------------------
// stock_movements
// ---------------------------------------------------------------------------
// Immutable ledger / audit log of physical inventory movements.
// Every stock balance change (Receipt, Delivery, Internal Transfer, Adjustment)
// appends a movement record here for full traceability.
//
// reference_id is POLYMORPHIC (refers to receipts.id, deliveries.id,
// internal_transfers.id, or inventory_adjustments.id based on reference_type).
// INTENTIONALLY NO FK CONSTRAINT ON reference_id.
// ---------------------------------------------------------------------------

export const movementTypes = [
  "RECEIPT",
  "DELIVERY",
  "TRANSFER",
  "ADJUSTMENT",
] as const;

export type MovementType = (typeof movementTypes)[number];

export const referenceTypes = [
  "RECEIPT",
  "DELIVERY",
  "INTERNAL_TRANSFER",
  "INVENTORY_ADJUSTMENT",
] as const;

export type ReferenceType = (typeof referenceTypes)[number];

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Product
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Locations (nullable to support single-ended operations like receipts/deliveries)
    sourceLocationId: uuid("source_location_id").references(
      () => locations.id,
      { onDelete: "restrict" }
    ),
    destinationLocationId: uuid("destination_location_id").references(
      () => locations.id,
      { onDelete: "restrict" }
    ),

    // Quantity moved
    quantity: numeric("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),

    // Movement Classification
    movementType: varchar("movement_type", { length: 50 }).notNull(),

    // Polymorphic Reference (No FK constraint on reference_id)
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    referenceId: uuid("reference_id").notNull(),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamp
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    productIdIdx: index("stock_movements_product_id_idx").on(t.productId),
    sourceLocationIdIdx: index("stock_movements_source_location_id_idx").on(
      t.sourceLocationId
    ),
    destinationLocationIdIdx: index(
      "stock_movements_destination_location_id_idx"
    ).on(t.destinationLocationId),
    movementTypeIdx: index("stock_movements_movement_type_idx").on(
      t.movementType
    ),
    referenceTypeIdx: index("stock_movements_reference_type_idx").on(
      t.referenceType
    ),
    referenceIdIdx: index("stock_movements_reference_id_idx").on(
      t.referenceId
    ),
    createdAtIdx: index("stock_movements_created_at_idx").on(t.createdAt),

    // Composite indexes for common query patterns (audit lookup by source doc, timeline by product)
    referenceCompositeIdx: index("stock_movements_reference_idx").on(
      t.referenceType,
      t.referenceId
    ),
    productCreatedAtIdx: index("stock_movements_product_created_idx").on(
      t.productId,
      t.createdAt
    ),
  })
);

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
