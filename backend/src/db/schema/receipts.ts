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

// ---------------------------------------------------------------------------
// receipts
// ---------------------------------------------------------------------------
// Header entity for incoming inventory receipts (Purchase Orders, vendor
// deliveries, stock returns).
//
// receipt_number is the unique human-readable tracking identifier (e.g. "REC/2026/00001").
// status lifecycle: DRAFT -> WAITING -> READY -> DONE | CANCELED
// ---------------------------------------------------------------------------

export const receiptStatusEnum = [
  "DRAFT",
  "WAITING",
  "READY",
  "DONE",
  "CANCELED",
] as const;

export type ReceiptStatus = (typeof receiptStatusEnum)[number];

export const receipts = pgTable(
  "receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity / Reference
    receiptNumber: varchar("receipt_number", { length: 100 })
      .notNull()
      .unique(),
    supplierName: varchar("supplier_name", { length: 255 }),
    supplierReference: varchar("supplier_reference", { length: 255 }),
    notes: text("notes"),

    // Scope & Destination
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "restrict" }),
    defaultLocationId: uuid("default_location_id").references(
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
    receiptNumberIdx: index("receipts_receipt_number_idx").on(t.receiptNumber),
    warehouseIdIdx: index("receipts_warehouse_id_idx").on(t.warehouseId),
    statusIdx: index("receipts_status_idx").on(t.status),
    createdByIdx: index("receipts_created_by_idx").on(t.createdBy),
    createdAtIdx: index("receipts_created_at_idx").on(t.createdAt),
  })
);

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
