import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const warehouses = pgTable(
  "warehouses",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity
    name: varchar("name", { length: 255 }).notNull().unique(),
    shortCode: varchar("short_code", { length: 10 }).notNull().unique(),
    description: text("description"),

    // Address
    address: text("address"),

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
    nameIdx: index("warehouses_name_idx").on(t.name),
    shortCodeIdx: index("warehouses_short_code_idx").on(t.shortCode),
    isActiveIdx: index("warehouses_is_active_idx").on(t.isActive),
  })
);

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
