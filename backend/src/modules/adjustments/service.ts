import { db } from "../../db/client";
import {
  inventoryAdjustments,
  InventoryAdjustment,
} from "../../db/schema/inventory-adjustments";
import {
  inventoryAdjustmentItems,
  InventoryAdjustmentItem,
} from "../../db/schema/inventory-adjustment-items";
import { locations } from "../../db/schema/locations";
import { products } from "../../db/schema/products";
import { InventoryService } from "../inventory/service";
import {
  CreateInventoryAdjustmentInput,
  UpdateInventoryAdjustmentInput,
  CreateInventoryAdjustmentItemInput,
  UpdateInventoryAdjustmentItemInput,
  ListInventoryAdjustmentsQuery,
  InventoryAdjustmentWithDetails,
  InventoryAdjustmentValidationResult,
  AdjustmentPreviewResult,
  AdjustmentItemPreview,
} from "./types";
import {
  AdjustmentNotFoundError,
  AdjustmentItemNotFoundError,
  AdjustmentLockedError,
  AdjustmentValidationError,
  LocationNotFoundError,
  ProductNotFoundError,
  AppError,
} from "../../lib/errors";
import { eq, and, sql, ilike, or, count, inArray } from "drizzle-orm";

/**
 * Generate human-readable adjustment tracking number
 * e.g., "ADJ/20260926/9182"
 */
function generateAdjustmentNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ADJ/${dateStr}/${randomSuffix}`;
}

export class AdjustmentService {
  /**
   * Create Inventory Adjustment document with optional initial line items
   */
  static async createAdjustment(
    input: CreateInventoryAdjustmentInput,
    createdByUserId?: string
  ): Promise<InventoryAdjustmentWithDetails> {
    const [loc] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, input.locationId))
      .limit(1);

    if (!loc) {
      throw new LocationNotFoundError(input.locationId);
    }

    const adjustmentNum = input.adjustmentNumber || generateAdjustmentNumber();
    let createdId = "";

    await db.transaction(async (tx) => {
      const [adjustment] = await tx
        .insert(inventoryAdjustments)
        .values({
          adjustmentNumber: adjustmentNum,
          reason: input.reason,
          locationId: input.locationId,
          status: "DRAFT",
          createdBy: createdByUserId,
        })
        .returning();

      createdId = adjustment.id;

      if (input.items && input.items.length > 0) {
        for (const itemInput of input.items) {
          const countedQtyNum =
            typeof itemInput.countedQuantity === "string"
              ? parseFloat(itemInput.countedQuantity)
              : itemInput.countedQuantity;

          if (isNaN(countedQtyNum) || countedQtyNum < 0) {
            throw new AppError(`Invalid counted quantity '${itemInput.countedQuantity}'`, 400);
          }

          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, itemInput.productId))
            .limit(1);

          if (!prod) {
            throw new ProductNotFoundError(itemInput.productId);
          }

          // Resolve current system stock for preview
          const systemQty = await InventoryService.getStockBalance(
            itemInput.productId,
            input.locationId,
            tx
          );
          const diff = countedQtyNum - systemQty;

          await tx.insert(inventoryAdjustmentItems).values({
            adjustmentId: adjustment.id,
            productId: itemInput.productId,
            systemQuantity: systemQty.toFixed(4),
            countedQuantity: countedQtyNum.toFixed(4),
            difference: diff.toFixed(4),
          });
        }
      }
    });

    return await this.getAdjustment(createdId);
  }

  /**
   * Get Inventory Adjustment by ID with items and location
   */
  static async getAdjustment(id: string): Promise<InventoryAdjustmentWithDetails> {
    const [adjustment] = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.id, id))
      .limit(1);

    if (!adjustment) {
      throw new AdjustmentNotFoundError(id);
    }

    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, adjustment.locationId))
      .limit(1);

    const itemsRows = await db
      .select({
        item: inventoryAdjustmentItems,
        product: products,
      })
      .from(inventoryAdjustmentItems)
      .leftJoin(products, eq(inventoryAdjustmentItems.productId, products.id))
      .where(eq(inventoryAdjustmentItems.adjustmentId, id));

    const items = itemsRows.map(({ item, product }) => ({
      ...item,
      product: product ?? undefined,
    }));

    return {
      ...adjustment,
      location: location ?? undefined,
      items,
    };
  }

  /**
   * List Inventory Adjustments with pagination and filters
   */
  static async listAdjustments(query: ListInventoryAdjustmentsQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(inventoryAdjustments.status, query.status));
    }
    if (query.locationId) {
      conditions.push(eq(inventoryAdjustments.locationId, query.locationId));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(inventoryAdjustments.adjustmentNumber, `%${query.search}%`),
          ilike(inventoryAdjustments.reason, `%${query.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count() })
      .from(inventoryAdjustments)
      .where(whereClause);

    const total = Number(countResult?.total ?? 0);

    const adjustmentRows = await db
      .select()
      .from(inventoryAdjustments)
      .where(whereClause)
      .orderBy(sql`${inventoryAdjustments.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const adjustmentIds = adjustmentRows.map((a) => a.id);

    let allItems: Record<string, any[]> = {};
    if (adjustmentIds.length > 0) {
      const itemsData = await db
        .select({
          item: inventoryAdjustmentItems,
          product: products,
        })
        .from(inventoryAdjustmentItems)
        .leftJoin(products, eq(inventoryAdjustmentItems.productId, products.id))
        .where(inArray(inventoryAdjustmentItems.adjustmentId, adjustmentIds));

      for (const { item, product } of itemsData) {
        if (!allItems[item.adjustmentId]) {
          allItems[item.adjustmentId] = [];
        }
        allItems[item.adjustmentId].push({
          ...item,
          product: product ?? undefined,
        });
      }
    }

    const data = adjustmentRows.map((adjustment) => ({
      ...adjustment,
      items: allItems[adjustment.id] ?? [],
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
   * Update Inventory Adjustment header
   */
  static async updateAdjustment(
    id: string,
    input: UpdateInventoryAdjustmentInput
  ): Promise<InventoryAdjustmentWithDetails> {
    const adjustment = await this.getAdjustment(id);

    if (adjustment.status === "DONE" || adjustment.status === "CANCELED") {
      throw new AdjustmentLockedError(adjustment.status);
    }

    if (input.locationId && input.locationId !== adjustment.locationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.locationId))
        .limit(1);

      if (!loc) throw new LocationNotFoundError(input.locationId);
    }

    await db
      .update(inventoryAdjustments)
      .set({
        reason: input.reason !== undefined ? input.reason : adjustment.reason,
        locationId: input.locationId ?? adjustment.locationId,
        updatedAt: new Date(),
      })
      .where(eq(inventoryAdjustments.id, id));

    return await this.getAdjustment(id);
  }

  /**
   * Cancel Inventory Adjustment
   */
  static async cancelAdjustment(
    id: string
  ): Promise<InventoryAdjustmentWithDetails> {
    const adjustment = await this.getAdjustment(id);

    if (adjustment.status === "DONE") {
      throw new AppError("Cannot cancel a completed inventory adjustment", 400);
    }
    if (adjustment.status === "CANCELED") {
      throw new AppError("Inventory adjustment is already cancelled", 400);
    }

    await db
      .update(inventoryAdjustments)
      .set({
        status: "CANCELED",
        updatedAt: new Date(),
      })
      .where(eq(inventoryAdjustments.id, id));

    return await this.getAdjustment(id);
  }

  /**
   * Add Item to Inventory Adjustment
   */
  static async addAdjustmentItem(
    adjustmentId: string,
    input: CreateInventoryAdjustmentItemInput
  ): Promise<InventoryAdjustmentItem> {
    const adjustment = await this.getAdjustment(adjustmentId);

    if (adjustment.status === "DONE" || adjustment.status === "CANCELED") {
      throw new AdjustmentLockedError(adjustment.status);
    }

    const countedQtyNum =
      typeof input.countedQuantity === "string"
        ? parseFloat(input.countedQuantity)
        : input.countedQuantity;

    if (isNaN(countedQtyNum) || countedQtyNum < 0) {
      throw new AppError(`Invalid counted quantity '${input.countedQuantity}'`, 400);
    }

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    // Resolve system stock
    const systemQty = await InventoryService.getStockBalance(
      input.productId,
      adjustment.locationId
    );
    const diff = countedQtyNum - systemQty;

    const [item] = await db
      .insert(inventoryAdjustmentItems)
      .values({
        adjustmentId: adjustmentId,
        productId: input.productId,
        systemQuantity: systemQty.toFixed(4),
        countedQuantity: countedQtyNum.toFixed(4),
        difference: diff.toFixed(4),
      })
      .returning();

    await db
      .update(inventoryAdjustments)
      .set({ updatedAt: new Date() })
      .where(eq(inventoryAdjustments.id, adjustmentId));

    return item;
  }

  /**
   * Update Inventory Adjustment Item
   */
  static async updateAdjustmentItem(
    adjustmentId: string,
    itemId: string,
    input: UpdateInventoryAdjustmentItemInput
  ): Promise<InventoryAdjustmentItem> {
    const adjustment = await this.getAdjustment(adjustmentId);

    if (adjustment.status === "DONE" || adjustment.status === "CANCELED") {
      throw new AdjustmentLockedError(adjustment.status);
    }

    const [item] = await db
      .select()
      .from(inventoryAdjustmentItems)
      .where(
        and(
          eq(inventoryAdjustmentItems.id, itemId),
          eq(inventoryAdjustmentItems.adjustmentId, adjustmentId)
        )
      )
      .limit(1);

    if (!item) {
      throw new AdjustmentItemNotFoundError(itemId);
    }

    const countedQtyNum =
      typeof input.countedQuantity === "string"
        ? parseFloat(input.countedQuantity)
        : input.countedQuantity;

    if (isNaN(countedQtyNum) || countedQtyNum < 0) {
      throw new AppError(`Invalid counted quantity '${input.countedQuantity}'`, 400);
    }

    const systemQty = await InventoryService.getStockBalance(
      item.productId,
      adjustment.locationId
    );
    const diff = countedQtyNum - systemQty;

    const [updatedItem] = await db
      .update(inventoryAdjustmentItems)
      .set({
        systemQuantity: systemQty.toFixed(4),
        countedQuantity: countedQtyNum.toFixed(4),
        difference: diff.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(inventoryAdjustmentItems.id, itemId))
      .returning();

    await db
      .update(inventoryAdjustments)
      .set({ updatedAt: new Date() })
      .where(eq(inventoryAdjustments.id, adjustmentId));

    return updatedItem;
  }

  /**
   * Remove Inventory Adjustment Item
   */
  static async removeAdjustmentItem(
    adjustmentId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const adjustment = await this.getAdjustment(adjustmentId);

    if (adjustment.status === "DONE" || adjustment.status === "CANCELED") {
      throw new AdjustmentLockedError(adjustment.status);
    }

    const [item] = await db
      .select()
      .from(inventoryAdjustmentItems)
      .where(
        and(
          eq(inventoryAdjustmentItems.id, itemId),
          eq(inventoryAdjustmentItems.adjustmentId, adjustmentId)
        )
      )
      .limit(1);

    if (!item) {
      throw new AdjustmentItemNotFoundError(itemId);
    }

    await db
      .delete(inventoryAdjustmentItems)
      .where(eq(inventoryAdjustmentItems.id, itemId));

    await db
      .update(inventoryAdjustments)
      .set({ updatedAt: new Date() })
      .where(eq(inventoryAdjustments.id, adjustmentId));

    return {
      success: true,
      message: `Item '${itemId}' removed from inventory adjustment successfully`,
    };
  }

  /**
   * Preview Inventory Adjustment Differences (Read-Only)
   */
  static async previewAdjustment(id: string): Promise<AdjustmentPreviewResult> {
    const adjustment = await this.getAdjustment(id);

    const itemsPreview: AdjustmentItemPreview[] = [];

    for (const item of adjustment.items) {
      const currentStock = await InventoryService.getStockBalance(
        item.productId,
        adjustment.locationId
      );
      const counted = parseFloat(item.countedQuantity);
      const diff = counted - currentStock;

      itemsPreview.push({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name,
        systemQuantity: currentStock,
        countedQuantity: counted,
        difference: diff,
      });
    }

    return {
      adjustmentId: adjustment.id,
      adjustmentNumber: adjustment.adjustmentNumber,
      locationId: adjustment.locationId,
      locationName: adjustment.location?.name,
      items: itemsPreview,
    };
  }

  /**
   * Validate Inventory Adjustment Document (Pure Validation)
   */
  static async validateAdjustment(
    id: string
  ): Promise<InventoryAdjustmentValidationResult> {
    const adjustment = await this.getAdjustment(id);
    const errors: string[] = [];

    if (adjustment.status === "DONE") {
      errors.push("Adjustment is already completed");
    }
    if (adjustment.status === "CANCELED") {
      errors.push("Adjustment is cancelled");
    }

    if (!adjustment.location) {
      errors.push(`Location '${adjustment.locationId}' does not exist`);
    }

    if (!adjustment.items || adjustment.items.length === 0) {
      errors.push("Adjustment must contain at least one line item before validation");
    } else {
      for (const item of adjustment.items) {
        const countedQty = parseFloat(item.countedQuantity);
        if (isNaN(countedQty) || countedQty < 0) {
          errors.push(`Item '${item.id}' has invalid counted quantity '${item.countedQuantity}'`);
        }
        if (!item.product) {
          errors.push(`Item '${item.id}' references a product '${item.productId}' that does not exist`);
        }
      }
    }

    const isValid = errors.length === 0;

    if (isValid && adjustment.status === "DRAFT") {
      // Refresh systemQuantity & difference for items
      for (const item of adjustment.items) {
        const currentStock = await InventoryService.getStockBalance(
          item.productId,
          adjustment.locationId
        );
        const counted = parseFloat(item.countedQuantity);
        const diff = counted - currentStock;

        await db
          .update(inventoryAdjustmentItems)
          .set({
            systemQuantity: currentStock.toFixed(4),
            difference: diff.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(inventoryAdjustmentItems.id, item.id));
      }

      await db
        .update(inventoryAdjustments)
        .set({
          status: "READY",
          updatedAt: new Date(),
        })
        .where(eq(inventoryAdjustments.id, id));

      adjustment.status = "READY";
    }

    if (!isValid) {
      throw new AdjustmentValidationError(
        `Adjustment validation failed with ${errors.length} error(s)`,
        errors
      );
    }

    return {
      valid: true,
      adjustment,
      errors: [],
    };
  }

  /**
   * Process Inventory Adjustment (Atomic Stock Operation via InventoryService)
   *
   * 1. Loads and locks adjustment record.
   * 2. Checks status (must NOT be DONE or CANCELED).
   * 3. Validates line items & location.
   * 4. Opens a database transaction:
   *    - For each item: resolves system stock via InventoryService.getStockBalance,
   *      updates item systemQuantity and difference.
   *    - Calls InventoryService.adjustStock() to update stock_balances and
   *      log immutable stock_movements (surplus: dest=loc, loss: src=loc).
   *    - Marks adjustment status = 'DONE'.
   * 5. Commits transaction or rolls back completely on any failure.
   */
  static async processAdjustment(
    id: string,
    processedByUserId?: string
  ): Promise<InventoryAdjustmentWithDetails> {
    await db.transaction(async (tx) => {
      // 1. Fetch & lock adjustment row
      const [adjustment] = await tx
        .select()
        .from(inventoryAdjustments)
        .where(eq(inventoryAdjustments.id, id))
        .for("update")
        .limit(1);

      if (!adjustment) {
        throw new AdjustmentNotFoundError(id);
      }

      // 2. Idempotency & Status Check
      if (adjustment.status === "DONE") {
        throw new AppError("Inventory adjustment has already been processed and is marked DONE", 409);
      }

      if (adjustment.status === "CANCELED") {
        throw new AdjustmentLockedError(adjustment.status);
      }

      // 3. Fetch items inside transaction
      const items = await tx
        .select()
        .from(inventoryAdjustmentItems)
        .where(eq(inventoryAdjustmentItems.adjustmentId, id));

      if (!items || items.length === 0) {
        throw new AdjustmentValidationError(
          "Adjustment validation failed: Adjustment must contain at least one line item before processing",
          ["Adjustment must contain at least one line item before processing"]
        );
      }

      // 4. Validate item quantities & resolve differences inside transaction
      const adjustmentStockItems = [];

      for (const item of items) {
        const countedQty = parseFloat(item.countedQuantity);
        if (isNaN(countedQty) || countedQty < 0) {
          throw new AdjustmentValidationError(
            `Adjustment validation failed: Item '${item.id}' has invalid counted quantity (${item.countedQuantity})`,
            [`Item '${item.id}' has invalid counted quantity`]
          );
        }

        const systemQty = await InventoryService.getStockBalance(
          item.productId,
          adjustment.locationId,
          tx
        );
        const diff = countedQty - systemQty;

        // Persist resolved systemQuantity and difference
        await tx
          .update(inventoryAdjustmentItems)
          .set({
            systemQuantity: systemQty.toFixed(4),
            difference: diff.toFixed(4),
            updatedAt: new Date(),
          })
          .where(eq(inventoryAdjustmentItems.id, item.id));

        adjustmentStockItems.push({
          productId: item.productId,
          locationId: adjustment.locationId,
          countedQuantity: countedQty,
        });
      }

      // 5. Delegate stock mutation and audit logging to InventoryService
      await InventoryService.adjustStock(
        {
          items: adjustmentStockItems,
          referenceType: "INVENTORY_ADJUSTMENT",
          referenceId: id,
          movementType: "ADJUSTMENT",
          createdBy: processedByUserId,
        },
        tx
      );

      // 6. Complete adjustment status -> DONE
      await tx
        .update(inventoryAdjustments)
        .set({
          status: "DONE",
          validatedAt: adjustment.validatedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(inventoryAdjustments.id, id));
    });

    // 7. Return complete updated adjustment details
    return await this.getAdjustment(id);
  }
}
