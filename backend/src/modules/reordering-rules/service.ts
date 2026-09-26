import { db } from "../../db/client.js";
import { reorderRules, type ReorderRule } from "../../db/schema/reorder-rules.js";
import { products } from "../../db/schema/products.js";
import { locations } from "../../db/schema/locations.js";
import { warehouses } from "../../db/schema/warehouses.js";
import { eq, and, or, ilike, count, ne, asc, desc } from "drizzle-orm";
import {
  ReorderRuleNotFoundError,
  ProductNotFoundError,
  LocationNotFoundError,
  DuplicateReorderRuleError,
  InvalidReorderQuantityError,
} from "../../lib/errors.js";
import type {
  CreateReorderRuleInput,
  UpdateReorderRuleInput,
  ListReorderRulesQuery,
  ReorderRuleDetails,
  PaginatedReorderRulesResponse,
} from "./types.js";

export class ReorderRuleService {
  /**
   * Helper to validate min <= max and non-negative quantities
   */
  private static validateQuantities(
    minQuantity: number,
    maxQuantity: number | null,
    reorderQty: number
  ): void {
    if (isNaN(minQuantity) || minQuantity < 0) {
      throw new InvalidReorderQuantityError("Minimum quantity cannot be negative");
    }

    if (isNaN(reorderQty) || reorderQty <= 0) {
      throw new InvalidReorderQuantityError("Reorder quantity must be greater than 0");
    }

    if (maxQuantity !== null && maxQuantity !== undefined) {
      if (isNaN(maxQuantity) || maxQuantity < 0) {
        throw new InvalidReorderQuantityError("Maximum quantity cannot be negative");
      }
      if (maxQuantity < minQuantity) {
        throw new InvalidReorderQuantityError(
          "Minimum quantity cannot be greater than maximum quantity"
        );
      }
    }
  }

  /**
   * Create a new reordering rule
   */
  public static async createReorderRule(
    input: CreateReorderRuleInput,
    userId?: string
  ): Promise<ReorderRule> {
    // 1. Verify Product exists
    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    // 2. Verify Location exists
    const [location] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(eq(locations.id, input.locationId))
      .limit(1);

    if (!location) {
      throw new LocationNotFoundError(input.locationId);
    }

    // 3. Validate Quantities
    const minQty = Number(input.minQuantity ?? 0);
    const maxQty = input.maxQuantity != null ? Number(input.maxQuantity) : null;
    const reorderQty = Number(input.reorderQty ?? 1);

    ReorderRuleService.validateQuantities(minQty, maxQty, reorderQty);

    // 4. Check for duplicate rule on (productId, locationId)
    const [duplicate] = await db
      .select({ id: reorderRules.id })
      .from(reorderRules)
      .where(
        and(
          eq(reorderRules.productId, input.productId),
          eq(reorderRules.locationId, input.locationId)
        )
      )
      .limit(1);

    if (duplicate) {
      throw new DuplicateReorderRuleError();
    }

    // 5. Insert into DB
    const [rule] = await db
      .insert(reorderRules)
      .values({
        productId: input.productId,
        locationId: input.locationId,
        minQuantity: String(minQty),
        maxQuantity: maxQty != null ? String(maxQty) : null,
        reorderQty: String(reorderQty),
        isActive: input.isActive ?? true,
        createdBy: userId || null,
        updatedBy: userId || null,
      })
      .returning();

    return rule;
  }

  /**
   * Get detailed reordering rule by ID
   */
  public static async getReorderRuleById(id: string): Promise<ReorderRuleDetails> {
    const [record] = await db
      .select({
        rule: reorderRules,
        productName: products.name,
        productSku: products.sku,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(reorderRules)
      .innerJoin(products, eq(reorderRules.productId, products.id))
      .innerJoin(locations, eq(reorderRules.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .where(eq(reorderRules.id, id))
      .limit(1);

    if (!record) {
      throw new ReorderRuleNotFoundError(id);
    }

    return {
      ...record.rule,
      productName: record.productName,
      productSku: record.productSku,
      locationName: record.locationName,
      locationFullPath: record.locationFullPath,
      warehouseId: record.warehouseId,
      warehouseName: record.warehouseName,
      warehouseShortCode: record.warehouseShortCode,
    };
  }

  /**
   * List reordering rules with pagination and filters
   */
  public static async listReorderRules(
    query: ListReorderRulesQuery
  ): Promise<PaginatedReorderRulesResponse> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 10));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.productId) {
      conditions.push(eq(reorderRules.productId, query.productId));
    }

    if (query.locationId) {
      conditions.push(eq(reorderRules.locationId, query.locationId));
    }

    if (query.warehouseId) {
      conditions.push(eq(locations.warehouseId, query.warehouseId));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(reorderRules.isActive, query.isActive));
    }

    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.sku, term),
          ilike(locations.name, term),
          ilike(locations.fullPath, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count matching criteria
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(reorderRules)
      .innerJoin(products, eq(reorderRules.productId, products.id))
      .innerJoin(locations, eq(reorderRules.locationId, locations.id))
      .where(whereClause);

    const total = Number(totalCount || 0);

    // Sorting column mapping
    let sortColumn = reorderRules.createdAt;
    if (query.sortBy === "minQuantity") sortColumn = reorderRules.minQuantity as any;
    if (query.sortBy === "maxQuantity") sortColumn = reorderRules.maxQuantity as any;
    if (query.sortBy === "reorderQty") sortColumn = reorderRules.reorderQty as any;

    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const rows = await db
      .select({
        rule: reorderRules,
        productName: products.name,
        productSku: products.sku,
        locationName: locations.name,
        locationFullPath: locations.fullPath,
        warehouseId: warehouses.id,
        warehouseName: warehouses.name,
        warehouseShortCode: warehouses.shortCode,
      })
      .from(reorderRules)
      .innerJoin(products, eq(reorderRules.productId, products.id))
      .innerJoin(locations, eq(reorderRules.locationId, locations.id))
      .innerJoin(warehouses, eq(locations.warehouseId, warehouses.id))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const data: ReorderRuleDetails[] = rows.map((r) => ({
      ...r.rule,
      productName: r.productName,
      productSku: r.productSku,
      locationName: r.locationName,
      locationFullPath: r.locationFullPath,
      warehouseId: r.warehouseId,
      warehouseName: r.warehouseName,
      warehouseShortCode: r.warehouseShortCode,
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update reordering rule fields
   */
  public static async updateReorderRule(
    id: string,
    input: UpdateReorderRuleInput,
    userId?: string
  ): Promise<ReorderRule> {
    // 1. Fetch existing rule
    const [existing] = await db
      .select()
      .from(reorderRules)
      .where(eq(reorderRules.id, id))
      .limit(1);

    if (!existing) {
      throw new ReorderRuleNotFoundError(id);
    }

    const targetProductId = input.productId ?? existing.productId;
    const targetLocationId = input.locationId ?? existing.locationId;

    // 2. Validate product if changing
    if (input.productId && input.productId !== existing.productId) {
      const [product] = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!product) {
        throw new ProductNotFoundError(input.productId);
      }
    }

    // 3. Validate location if changing
    if (input.locationId && input.locationId !== existing.locationId) {
      const [location] = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.id, input.locationId))
        .limit(1);

      if (!location) {
        throw new LocationNotFoundError(input.locationId);
      }
    }

    // 4. Validate unique constraint if product or location changed
    if (
      (input.productId && input.productId !== existing.productId) ||
      (input.locationId && input.locationId !== existing.locationId)
    ) {
      const [duplicate] = await db
        .select({ id: reorderRules.id })
        .from(reorderRules)
        .where(
          and(
            eq(reorderRules.productId, targetProductId),
            eq(reorderRules.locationId, targetLocationId),
            ne(reorderRules.id, id)
          )
        )
        .limit(1);

      if (duplicate) {
        throw new DuplicateReorderRuleError();
      }
    }

    // 5. Validate numeric quantities
    const minQty =
      input.minQuantity !== undefined
        ? Number(input.minQuantity)
        : Number(existing.minQuantity);

    const maxQty =
      input.maxQuantity !== undefined
        ? input.maxQuantity != null
          ? Number(input.maxQuantity)
          : null
        : existing.maxQuantity != null
        ? Number(existing.maxQuantity)
        : null;

    const reorderQty =
      input.reorderQty !== undefined
        ? Number(input.reorderQty)
        : Number(existing.reorderQty);

    ReorderRuleService.validateQuantities(minQty, maxQty, reorderQty);

    // 6. Update database record
    const [updatedRule] = await db
      .update(reorderRules)
      .set({
        productId: targetProductId,
        locationId: targetLocationId,
        minQuantity: String(minQty),
        maxQuantity: maxQty != null ? String(maxQty) : null,
        reorderQty: String(reorderQty),
        isActive: input.isActive ?? existing.isActive,
        updatedBy: userId || null,
        updatedAt: new Date(),
      })
      .where(eq(reorderRules.id, id))
      .returning();

    return updatedRule;
  }

  /**
   * Delete a reordering rule
   */
  public static async deleteReorderRule(
    id: string
  ): Promise<{ success: boolean; message: string; mode: "deleted" }> {
    const [existing] = await db
      .select({ id: reorderRules.id })
      .from(reorderRules)
      .where(eq(reorderRules.id, id))
      .limit(1);

    if (!existing) {
      throw new ReorderRuleNotFoundError(id);
    }

    await db.delete(reorderRules).where(eq(reorderRules.id, id));

    return {
      success: true,
      message: "Reordering rule deleted successfully",
      mode: "deleted",
    };
  }
}
