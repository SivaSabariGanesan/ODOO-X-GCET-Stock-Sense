import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { warehouses } from "./warehouses.js";
import { locations } from "./locations.js";
import { users } from "./users.js";
import { receiptStatusEnum } from "./receipts.js";

// ---------------------------------------------------------------------------
// deliveries
// ---------------------------------------------------------------------------
// Header entity for outgoing inventory delivery orders (Sales Orders, customer
// shipments, stock dispatches).
//
// delivery_number is the unique human-readable tracking identifier (e.g. "DEL/2026/00001").
// status lifecycle: DRAFT -> WAITING -> READY -> DONE | CANCELED
// ---------------------------------------------------------------------------

export const deliveryStatusEnum = receiptStatusEnum;
export type DeliveryStatus = (typeof deliveryStatusEnum)[number];

export const deliveries = pgTable(
  "deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity / Reference
    deliveryNumber: varchar("delivery_number", { length: 100 })
      .notNull()
      .unique(),
    customerName: varchar("customer_name", { length: 255 }),
    customerReference: varchar("customer_reference", { length: 255 }),
    notes: text("notes"),

    // Scope & Source
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    defaultSourceLocationId: uuid("default_source_location_id").references(
      () => locations.id,
      { onDelete: "restrict" }
    ),

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
    deliveryNumberIdx: index("deliveries_delivery_number_idx").on(
      t.deliveryNumber
    ),
    warehouseIdIdx: index("deliveries_warehouse_id_idx").on(t.warehouseId),
    statusIdx: index("deliveries_status_idx").on(t.status),
    createdByIdx: index("deliveries_created_by_idx").on(t.createdBy),
    createdAtIdx: index("deliveries_created_at_idx").on(t.createdAt),
  })
);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
