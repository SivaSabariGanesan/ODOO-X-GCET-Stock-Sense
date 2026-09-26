import { db } from "../../db/client";
import { products } from "../../db/schema/products";
import { categories } from "../../db/schema/categories";
import { unitsOfMeasure } from "../../db/schema/units-of-measure";
import { stockBalances } from "../../db/schema/stock-balances";
import { stockMovements } from "../../db/schema/stock-movements";
import { receiptItems } from "../../db/schema/receipt-items";
import { deliveryItems } from "../../db/schema/delivery-items";
import { internalTransferItems } from "../../db/schema/internal-transfer-items";
import { inventoryAdjustmentItems } from "../../db/schema/inventory-adjustment-items";
import {
  CreateProductInput,
  UpdateProductInput,
  ListProductsQuery,
  ProductWithDetails,
} from "./types";
import {
  ProductNotFoundError,
  CategoryNotFoundError,
  UomNotFoundError,
  DuplicateSkuError,
  ProductReferencedError,
  AppError,
} from "../../lib/errors";
import { eq, and, or, count, ilike } from "drizzle-orm";

export class ProductService {
  /**
   * Create a new Product master record.
   * Validates Category, UOM, and SKU uniqueness.
   */
  static async createProduct(
    input: CreateProductInput,
    userId?: string
  ): Promise<ProductWithDetails> {
    // 1. Verify Category exists if categoryId is provided
    if (input.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      if (!cat) {
        throw new CategoryNotFoundError(input.categoryId);
      }
    }

    // 2. Verify UOM exists
    const [uom] = await db
      .select({ id: unitsOfMeasure.id })
      .from(unitsOfMeasure)
      .where(eq(unitsOfMeasure.id, input.uomId))
      .limit(1);

    if (!uom) {
      throw new UomNotFoundError(input.uomId);
    }

    // 3. Check SKU uniqueness
    const [existingSku] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.sku, input.sku))
      .limit(1);

    if (existingSku) {
      throw new DuplicateSkuError(input.sku);
    }

    try {
      const [newProduct] = await db
        .insert(products)
        .values({
          name: input.name,
          sku: input.sku,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          uomId: input.uomId,
          barcode: input.barcode ?? null,
          imageUrl: input.imageUrl ?? null,
          isActive: input.isActive ?? true,
          createdBy: userId ?? null,
          updatedBy: userId ?? null,
        })
        .returning();

      return await this.getProductById(newProduct.id);
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("unique constraint") || error?.message?.includes("products_sku")) {
        throw new DuplicateSkuError(input.sku);
      }
      throw error;
    }
  }

  /**
   * Get Product details by ID with Category and UOM relations
   */
  static async getProductById(id: string): Promise<ProductWithDetails> {
    const [row] = await db
      .select({
        product: products,
        category: categories,
        uom: unitsOfMeasure,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!row) {
      throw new ProductNotFoundError(id);
    }

    return {
      ...row.product,
      category: row.category ?? undefined,
      uom: row.uom ?? undefined,
    };
  }

  /**
   * List Products with database-level filtering, search, and pagination
   */
  static async listProducts(query: ListProductsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.sku) {
      conditions.push(eq(products.sku, query.sku));
    }

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }

    if (query.uomId) {
      conditions.push(eq(products.uomId, query.uomId));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(products.isActive, query.isActive));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern),
          ilike(products.barcode, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Execute count query for pagination
    const countQuery = db.select({ total: count() }).from(products);
    if (whereClause) {
      countQuery.where(whereClause);
    }

    const [countResult] = await countQuery;
    const total = Number(countResult?.total ?? 0);

    // Execute paginated selection query
    const selectQuery = db
      .select({
        product: products,
        category: categories,
        uom: unitsOfMeasure,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(unitsOfMeasure, eq(products.uomId, unitsOfMeasure.id));

    if (whereClause) {
      selectQuery.where(whereClause);
    }

    const rows = await selectQuery
      .orderBy(products.name)
      .limit(limit)
      .offset(offset);

    const data: ProductWithDetails[] = rows.map((row) => ({
      ...row.product,
      category: row.category ?? undefined,
      uom: row.uom ?? undefined,
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update Product master data by ID
   */
  static async updateProduct(
    id: string,
    input: UpdateProductInput,
    userId?: string
  ): Promise<ProductWithDetails> {
    const existing = await this.getProductById(id);

    // 1. Verify category if updating categoryId
    if (input.categoryId !== undefined && input.categoryId !== null) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, input.categoryId))
        .limit(1);

      if (!cat) {
        throw new CategoryNotFoundError(input.categoryId);
      }
    }

    // 2. Verify UOM if updating uomId
    if (input.uomId !== undefined) {
      const [uom] = await db
        .select({ id: unitsOfMeasure.id })
        .from(unitsOfMeasure)
        .where(eq(unitsOfMeasure.id, input.uomId))
        .limit(1);

      if (!uom) {
        throw new UomNotFoundError(input.uomId);
      }
    }

    // 3. Verify SKU uniqueness if changing SKU
    if (input.sku !== undefined && input.sku !== existing.sku) {
      const [duplicate] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, input.sku))
        .limit(1);

      if (duplicate) {
        throw new DuplicateSkuError(input.sku);
      }
    }

    try {
      const updateData: Partial<typeof products.$inferInsert> = {
        updatedAt: new Date(),
        updatedBy: userId ?? null,
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
      if (input.uomId !== undefined) updateData.uomId = input.uomId;
      if (input.barcode !== undefined) updateData.barcode = input.barcode;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id));

      return await this.getProductById(id);
    } catch (error: any) {
      if (error?.code === "23505" || error?.message?.includes("unique constraint") || error?.message?.includes("products_sku")) {
        throw new DuplicateSkuError(input.sku ?? "");
      }
      throw error;
    }
  }

  /**
   * Delete or deactivate Product according to inventory reference safety rules
   */
  static async deleteProduct(id: string): Promise<{ success: boolean; message: string; mode: "deleted" | "deactivated" }> {
    // 1. Verify product exists
    const product = await this.getProductById(id);

    // 2. Check references in inventory domain tables
    const [balanceRef] = await db.select({ id: stockBalances.id }).from(stockBalances).where(eq(stockBalances.productId, id)).limit(1);
    const [movementRef] = await db.select({ id: stockMovements.id }).from(stockMovements).where(eq(stockMovements.productId, id)).limit(1);
    const [receiptRef] = await db.select({ id: receiptItems.id }).from(receiptItems).where(eq(receiptItems.productId, id)).limit(1);
    const [deliveryRef] = await db.select({ id: deliveryItems.id }).from(deliveryItems).where(eq(deliveryItems.productId, id)).limit(1);
    const [transferRef] = await db.select({ id: internalTransferItems.id }).from(internalTransferItems).where(eq(internalTransferItems.productId, id)).limit(1);
    const [adjustmentRef] = await db.select({ id: inventoryAdjustmentItems.id }).from(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.productId, id)).limit(1);

    const isReferenced = Boolean(
      balanceRef || movementRef || receiptRef || deliveryRef || transferRef || adjustmentRef
    );

    if (isReferenced) {
      // Product is referenced in inventory operations: deactivate instead of hard-deleting to preserve historical integrity
      await db
        .update(products)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(products.id, id));

      return {
        success: true,
        message: `Product '${product.sku}' is referenced in inventory operations and was deactivated to preserve historical audit data.`,
        mode: "deactivated",
      };
    }

    // Unreferenced product: safe to hard delete
    await db.delete(products).where(eq(products.id, id));

    return {
      success: true,
      message: `Product '${product.sku}' deleted successfully.`,
      mode: "deleted",
    };
  }
}
