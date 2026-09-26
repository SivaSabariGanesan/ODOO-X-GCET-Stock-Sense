import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { unitsOfMeasure } from "./units-of-measure";
import { users } from "./users";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    description: text("description"),

    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
    }),
    uomId: uuid("uom_id")
      .notNull()
      .references(() => unitsOfMeasure.id, {
        onDelete: "restrict",
      }),

    barcode: varchar("barcode", { length: 100 }).unique(),
    imageUrl: text("image_url"),

    isActive: boolean("is_active").notNull().default(true),

    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
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
    skuIdx: index("products_sku_idx").on(t.sku),
    nameIdx: index("products_name_idx").on(t.name),
    categoryIdIdx: index("products_category_id_idx").on(t.categoryId),
    uomIdIdx: index("products_uom_id_idx").on(t.uomId),
    isActiveIdx: index("products_is_active_idx").on(t.isActive),
    barcodeIdx: index("products_barcode_idx").on(t.barcode),
  })
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
