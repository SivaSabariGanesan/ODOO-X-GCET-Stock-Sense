import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { users } from "./users";
import { receiptStatusEnum } from "./receipts";

// ---------------------------------------------------------------------------
// inventory_adjustments
// ---------------------------------------------------------------------------
// Header entity for physical inventory stock counts and inventory adjustments.
// Used to correct system stock balances to match physical stock counts.
//
// adjustment_number is the unique human-readable tracking identifier (e.g. "ADJ/2026/00001").
// status lifecycle: DRAFT -> WAITING -> READY -> DONE | CANCELED
// ---------------------------------------------------------------------------

export const inventoryAdjustmentStatusEnum = receiptStatusEnum;
export type InventoryAdjustmentStatus =
  (typeof inventoryAdjustmentStatusEnum)[number];

export const inventoryAdjustments = pgTable(
  "inventory_adjustments",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity / Reference
    adjustmentNumber: varchar("adjustment_number", { length: 100 })
      .notNull()
      .unique(),
    reason: text("reason"),

    // Location
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    // State
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    adjustmentNumberIdx: index(
      "inventory_adjustments_adjustment_number_idx"
    ).on(t.adjustmentNumber),
    statusIdx: index("inventory_adjustments_status_idx").on(t.status),
    locationIdIdx: index("inventory_adjustments_location_id_idx").on(
      t.locationId
    ),
    createdByIdx: index("inventory_adjustments_created_by_idx").on(
      t.createdBy
    ),
    createdAtIdx: index("inventory_adjustments_created_at_idx").on(
      t.createdAt
    ),
  })
);

export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type NewInventoryAdjustment = typeof inventoryAdjustments.$inferInsert;
