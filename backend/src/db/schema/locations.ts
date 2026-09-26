import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { warehouses } from "./warehouses.js";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// locations
// ---------------------------------------------------------------------------
// A location is a named place inside a warehouse where stock can be stored.
// Locations are hierarchical via the self-referential parent_id, supporting
// structures like:
//
//   Main Warehouse (warehouse root)
//     └── Rack A           (parent_id → Main Warehouse)
//           └── Shelf A-1  (parent_id → Rack A)
//     └── Production Floor (parent_id → Main Warehouse)
//
// location_type distinguishes storage zones from virtual/operational zones
// that Odoo uses for internal accounting (input, quality, etc.). Person 2
// will use this when routing transfers.
//
// full_path is a denormalised display path (e.g. "MWH/Rack A/Shelf A-1")
// maintained by the application layer on write — it avoids expensive
// recursive CTE queries on every UI render.
// ---------------------------------------------------------------------------

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Warehouse ownership (every location ultimately belongs to one warehouse)
    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),

    // Self-referential hierarchy — null means this is a root/top-level
    // location inside the warehouse.
    parentId: uuid("parent_id"), // FK added via SQL in migration (Drizzle
    // doesn't support self-ref inline without a forward-reference workaround)

    // Identity
    name: varchar("name", { length: 255 }).notNull(),

    // Denormalised display path — kept in sync by the service layer
    // e.g. "MWH / Rack A / Shelf A-1"
    fullPath: text("full_path").notNull(),

    // Location category — determines how operations treat this location.
    // Values: 'internal' | 'input' | 'output' | 'quality_control' | 'virtual'
    // Stored as varchar (not pg enum) so new types don't require a DDL change.
    locationType: varchar("location_type", { length: 50 })
      .notNull()
      .default("internal"),

    // State
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    warehouseIdIdx: index("locations_warehouse_id_idx").on(t.warehouseId),
    parentIdIdx: index("locations_parent_id_idx").on(t.parentId),
    locationTypeIdx: index("locations_location_type_idx").on(t.locationType),
    isActiveIdx: index("locations_is_active_idx").on(t.isActive),
    // Composite index for the most common query: active internal locations
    // within a warehouse
    warehouseActiveIdx: index("locations_warehouse_active_idx").on(
      t.warehouseId,
      t.isActive
    ),
  })
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
