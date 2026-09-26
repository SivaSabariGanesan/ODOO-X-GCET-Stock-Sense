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
// internal_transfers
// ---------------------------------------------------------------------------
// Header entity for internal stock transfers between locations in a warehouse
// or between different warehouses (e.g. Rack A -> Rack B, Input -> Shelf 1).
//
// transfer_number is the unique human-readable tracking identifier (e.g. "INT/2026/00001").
// status lifecycle: DRAFT -> WAITING -> READY -> DONE | CANCELED
// ---------------------------------------------------------------------------

export const internalTransferStatusEnum = receiptStatusEnum;
export type InternalTransferStatus =
  (typeof internalTransferStatusEnum)[number];

export const internalTransfers = pgTable(
  "internal_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity / Reference
    transferNumber: varchar("transfer_number", { length: 100 })
      .notNull()
      .unique(),
    notes: text("notes"),

    // Locations
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    destinationLocationId: uuid("destination_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),

    // State
    status: varchar("status", { length: 50 }).notNull().default("DRAFT"),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    transferNumberIdx: index("internal_transfers_transfer_number_idx").on(
      t.transferNumber
    ),
    statusIdx: index("internal_transfers_status_idx").on(t.status),
    sourceLocationIdIdx: index(
      "internal_transfers_source_location_id_idx"
    ).on(t.sourceLocationId),
    destinationLocationIdIdx: index(
      "internal_transfers_destination_location_id_idx"
    ).on(t.destinationLocationId),
    createdByIdx: index("internal_transfers_created_by_idx").on(t.createdBy),
    createdAtIdx: index("internal_transfers_created_at_idx").on(t.createdAt),
  })
);

export type InternalTransfer = typeof internalTransfers.$inferSelect;
export type NewInternalTransfer = typeof internalTransfers.$inferInsert;
