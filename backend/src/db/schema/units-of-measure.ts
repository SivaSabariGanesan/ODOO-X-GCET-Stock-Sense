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

export const unitsOfMeasure = pgTable(
  "units_of_measure",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 100 }).notNull(),
    abbreviation: varchar("abbreviation", { length: 20 }).notNull(),
    description: text("description"),

    measureType: varchar("measure_type", { length: 50 }),

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
    nameIdx: index("uom_name_idx").on(t.name),
    abbreviationIdx: index("uom_abbreviation_idx").on(t.abbreviation),
    isActiveIdx: index("uom_is_active_idx").on(t.isActive),
  })
);

export type UnitOfMeasure = typeof unitsOfMeasure.$inferSelect;
export type NewUnitOfMeasure = typeof unitsOfMeasure.$inferInsert;
