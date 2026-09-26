import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { warehouses } from "./warehouses";
import { users } from "./users";

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, { onDelete: "cascade" }),

    parentId: uuid("parent_id"),

    name: varchar("name", { length: 255 }).notNull(),
    fullPath: text("full_path").notNull(),

    locationType: varchar("location_type", { length: 50 })
      .notNull()
      .default("internal"),

    isActive: boolean("is_active").notNull().default(true),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),

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
    warehouseActiveIdx: index("locations_warehouse_active_idx").on(
      t.warehouseId,
      t.isActive
    ),
  })
);

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
