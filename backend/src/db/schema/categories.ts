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

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    color: varchar("color", { length: 7 }),

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
    nameIdx: index("categories_name_idx").on(t.name),
    isActiveIdx: index("categories_is_active_idx").on(t.isActive),
  })
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
