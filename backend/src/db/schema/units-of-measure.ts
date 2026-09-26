import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// units_of_measure  (UoM)
// ---------------------------------------------------------------------------
// Defines measurement units for products (kg, pcs, litre, box, etc.).
//
// uom_type groups units for potential conversion support in the future
// (Odoo uses: 'reference' | 'smaller' | 'bigger'). Stored as a freeform
// varchar now so Person 2 can layer conversion logic without a migration.
// ---------------------------------------------------------------------------

export const unitsOfMeasure = pgTable(
  "units_of_measure",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity
    name: varchar("name", { length: 100 }).notNull().unique(),
    abbreviation: varchar("abbreviation", { length: 20 }).notNull().unique(),
    description: text("description"),

    // Category of measurement (e.g. "weight", "volume", "unit", "length")
    // Used for grouping in UI dropdowns, not enforced as a DB enum so it
    // stays flexible without requiring a migration for new measurement types.
    measureType: varchar("measure_type", { length: 50 }),

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
    nameIdx: index("uom_name_idx").on(t.name),
    abbreviationIdx: index("uom_abbreviation_idx").on(t.abbreviation),
    isActiveIdx: index("uom_is_active_idx").on(t.isActive),
  })
);

export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
