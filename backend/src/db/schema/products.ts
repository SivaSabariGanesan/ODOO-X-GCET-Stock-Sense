import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { categories } from "./categories.js";
import { unitsOfMeasure } from "./units-of-measure.js";
import { users } from "./users.js";

// ---------------------------------------------------------------------------
// products
// ---------------------------------------------------------------------------
// Core product master. Intentionally lean — only data that belongs to the
// product itself, not to any operation (receipt, delivery, transfer).
//
// Stock quantity is NOT stored here. It lives in stock_balances
// (product + location → quantity) and is maintained exclusively by the
// inventory-operation domain (Person 2).
//
// SKU (stock-keeping unit) is the canonical human-readable unique identifier.
// ---------------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Identity
    name: varchar("name", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    description: text("description"),

    // Classification
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict", // Don't silently orphan products
    }),
    uomId: uuid("uom_id")
      .notNull()
      .references(() => unitsOfMeasure.id, {
        onDelete: "restrict",
      }),

    // Physical / display attributes (optional metadata for picking/packing)
    barcode: varchar("barcode", { length: 100 }).unique(),
    imageUrl: text("image_url"),

    // State — inactive products cannot be used in new operations
    isActive: boolean("is_active").notNull().default(true),

    // Audit
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
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
