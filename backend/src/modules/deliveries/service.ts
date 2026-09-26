import { db } from "../../db/client.js";
import { deliveries, DeliveryStatus } from "../../db/schema/deliveries.js";
import { deliveryItems } from "../../db/schema/delivery-items.js";
import { warehouses } from "../../db/schema/warehouses.js";
import { locations } from "../../db/schema/locations.js";
import { products } from "../../db/schema/products.js";
import { users } from "../../db/schema/users.js";
import { eq, and, ilike, or, count, desc } from "drizzle-orm";
import {
  CreateDeliveryInput,
  UpdateDeliveryInput,
  CreateDeliveryItemInput,
  UpdateDeliveryItemInput,
  ListDeliveriesQuery,
  DeliveryWithDetails,
  DeliveryItemWithRelations,
  DeliveryValidationResult,
} from "./types.js";
import {
  DeliveryNotFoundError,
  DeliveryItemNotFoundError,
  WarehouseNotFoundError,
  LocationNotFoundError,
  ProductNotFoundError,
  DeliveryLockedError,
  InvalidStatusTransitionError,
  DeliveryValidationError,
  AppError,
} from "../../lib/errors.js";

/**
 * Generate human-readable tracking delivery number
 * e.g., "DEL/20260926/4897"
 */
function generateDeliveryNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DEL/${dateStr}/${randomSuffix}`;
}

export class DeliveryCoreService {
  /**
   * Create Delivery Document with optional initial line items inside a transaction
   */
  static async createDelivery(
    input: CreateDeliveryInput,
    createdByUserId?: string
  ): Promise<DeliveryWithDetails> {
    // 1. Validate warehouse
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, input.warehouseId))
      .limit(1);

    if (!warehouse) {
      throw new WarehouseNotFoundError(input.warehouseId);
    }

    // 2. Validate default source location if provided
    if (input.defaultSourceLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.defaultSourceLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.defaultSourceLocationId);
      }
    }

    const deliveryNum = input.deliveryNumber?.trim() || generateDeliveryNumber();

    // 3. Transaction: Create Delivery Header + initial items
    const newDeliveryId = await db.transaction(async (tx) => {
      const [insertedDelivery] = await tx
        .insert(deliveries)
        .values({
          deliveryNumber: deliveryNum,
          customerName: input.customerName?.trim() ?? null,
          customerReference: input.customerReference?.trim() ?? null,
          notes: input.notes?.trim() ?? null,
          warehouseId: input.warehouseId,
          defaultSourceLocationId: input.defaultSourceLocationId ?? null,
          status: "DRAFT",
          createdBy: createdByUserId ?? null,
        })
        .returning();

      if (!insertedDelivery) {
        throw new Error("Failed to insert delivery record");
      }

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          // Validate product
          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, item.productId))
            .limit(1);

          if (!prod) {
            throw new ProductNotFoundError(item.productId);
          }

          // Resolve source location
          let srcLocId = item.sourceLocationId || input.defaultSourceLocationId;
          if (!srcLocId) {
            const [whLoc] = await tx
              .select()
              .from(locations)
              .where(eq(locations.warehouseId, input.warehouseId))
              .limit(1);

            if (whLoc) {
              srcLocId = whLoc.id;
            } else {
              const [newLoc] = await tx
                .insert(locations)
                .values({
                  warehouseId: input.warehouseId,
                  name: "Stock",
                  fullPath: "WH/Stock",
                  locationType: "internal",
                })
                .returning();
              srcLocId = newLoc.id;
            }
          } else {
            const [srcLoc] = await tx
              .select()
              .from(locations)
              .where(eq(locations.id, srcLocId))
              .limit(1);

            if (!srcLoc) {
              throw new LocationNotFoundError(srcLocId);
            }
          }

          const qtyNum = parseFloat(item.quantity.toString());
          if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new Error(`Quantity for product ${prod.name} must be greater than zero`);
          }

          await tx.insert(deliveryItems).values({
            deliveryId: insertedDelivery.id,
            productId: item.productId,
            sourceLocationId: srcLocId,
            quantity: qtyNum.toString(),
            unitPrice: item.unitPrice ? item.unitPrice.toString() : null,
            notes: item.notes?.trim() ?? null,
          });
        }
      }

      return insertedDelivery.id;
    });

    return await this.getDelivery(newDeliveryId);
  }

  /**
   * Fetch complete Delivery document by ID with joined relations
   */
  static async getDelivery(id: string): Promise<DeliveryWithDetails> {
    const [row] = await db
      .select({
        delivery: deliveries,
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          shortCode: warehouses.shortCode,
        },
        defaultSourceLocation: {
          id: locations.id,
          name: locations.name,
          fullPath: locations.fullPath,
        },
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(deliveries)
      .leftJoin(warehouses, eq(deliveries.warehouseId, warehouses.id))
      .leftJoin(
        locations,
        eq(deliveries.defaultSourceLocationId, locations.id)
      )
      .leftJoin(users, eq(deliveries.createdBy, users.id))
      .where(eq(deliveries.id, id))
      .limit(1);

    if (!row) {
      throw new DeliveryNotFoundError(id);
    }

    const itemsRaw = await db
      .select({
        item: deliveryItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        sourceLocation: {
          id: locations.id,
          name: locations.name,
          fullPath: locations.fullPath,
        },
      })
      .from(deliveryItems)
      .leftJoin(products, eq(deliveryItems.productId, products.id))
      .leftJoin(locations, eq(deliveryItems.sourceLocationId, locations.id))
      .where(eq(deliveryItems.deliveryId, id));

    const items: DeliveryItemWithRelations[] = itemsRaw.map((i) => ({
      ...i.item,
      product: i.product?.id ? i.product : undefined,
      sourceLocation: i.sourceLocation?.id ? i.sourceLocation : undefined,
    }));

    return {
      ...row.delivery,
      warehouse: row.warehouse?.id ? row.warehouse : undefined,
      defaultSourceLocation: row.defaultSourceLocation?.id
        ? row.defaultSourceLocation
        : undefined,
      creator: row.creator?.id ? row.creator : undefined,
      items,
    };
  }

  /**
   * List deliveries with pagination and filtering
   */
  static async listDeliveries(query: ListDeliveriesQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(deliveries.status, query.status));
    }

    if (query.warehouseId) {
      conditions.push(eq(deliveries.warehouseId, query.warehouseId));
    }

    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(deliveries.deliveryNumber, searchPattern),
          ilike(deliveries.customerName, searchPattern),
          ilike(deliveries.customerReference, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(deliveries)
      .where(whereClause);

    const rows = await db
      .select({
        delivery: deliveries,
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          shortCode: warehouses.shortCode,
        },
        defaultSourceLocation: {
          id: locations.id,
          name: locations.name,
          fullPath: locations.fullPath,
        },
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(deliveries)
      .leftJoin(warehouses, eq(deliveries.warehouseId, warehouses.id))
      .leftJoin(
        locations,
        eq(deliveries.defaultSourceLocationId, locations.id)
      )
      .leftJoin(users, eq(deliveries.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(deliveries.createdAt))
      .limit(limit)
      .offset(offset);

    const data: DeliveryWithDetails[] = await Promise.all(
      rows.map(async (row) => {
        const itemsRaw = await db
          .select({
            item: deliveryItems,
            product: {
              id: products.id,
              name: products.name,
              sku: products.sku,
            },
            sourceLocation: {
              id: locations.id,
              name: locations.name,
              fullPath: locations.fullPath,
            },
          })
          .from(deliveryItems)
          .leftJoin(products, eq(deliveryItems.productId, products.id))
          .leftJoin(locations, eq(deliveryItems.sourceLocationId, locations.id))
          .where(eq(deliveryItems.deliveryId, row.delivery.id));

        return {
          ...row.delivery,
          warehouse: row.warehouse?.id ? row.warehouse : undefined,
          defaultSourceLocation: row.defaultSourceLocation?.id
            ? row.defaultSourceLocation
            : undefined,
          creator: row.creator?.id ? row.creator : undefined,
          items: itemsRaw.map((i) => ({
            ...i.item,
            product: i.product?.id ? i.product : undefined,
            sourceLocation: i.sourceLocation?.id ? i.sourceLocation : undefined,
          })),
        };
      })
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
      },
    };
  }

  /**
   * Update Delivery Header
   */
  static async updateDelivery(
    id: string,
    input: UpdateDeliveryInput
  ): Promise<DeliveryWithDetails> {
    const existing = await this.getDelivery(id);

    if (existing.status === "DONE" || existing.status === "CANCELED") {
      throw new DeliveryLockedError(existing.status);
    }

    if (input.warehouseId) {
      const [wh] = await db
        .select()
        .from(warehouses)
        .where(eq(warehouses.id, input.warehouseId))
        .limit(1);

      if (!wh) {
        throw new WarehouseNotFoundError(input.warehouseId);
      }
    }

    if (input.defaultSourceLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.defaultSourceLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.defaultSourceLocationId);
      }
    }

    await db
      .update(deliveries)
      .set({
        customerName:
          input.customerName !== undefined
            ? input.customerName.trim() || null
            : existing.customerName,
        customerReference:
          input.customerReference !== undefined
            ? input.customerReference.trim() || null
            : existing.customerReference,
        notes:
          input.notes !== undefined
            ? input.notes.trim() || null
            : existing.notes,
        warehouseId: input.warehouseId ?? existing.warehouseId,
        defaultSourceLocationId:
          input.defaultSourceLocationId !== undefined
            ? input.defaultSourceLocationId
            : existing.defaultSourceLocationId,
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id));

    return await this.getDelivery(id);
  }

  /**
   * Cancel Delivery
   */
  static async cancelDelivery(id: string): Promise<DeliveryWithDetails> {
    const existing = await this.getDelivery(id);

    if (existing.status === "DONE") {
      throw new AppError("Cannot cancel completed delivery", 400);
    }

    if (existing.status === "CANCELED") {
      return existing;
    }

    await db
      .update(deliveries)
      .set({
        status: "CANCELED",
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, id));

    return await this.getDelivery(id);
  }

  /**
   * Add Item to Delivery
   */
  static async addDeliveryItem(
    deliveryId: string,
    input: CreateDeliveryItemInput
  ): Promise<any> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === "DONE" || delivery.status === "CANCELED") {
      throw new DeliveryLockedError(delivery.status);
    }

    // Validate product
    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    // Resolve location
    let srcLocId = input.sourceLocationId || delivery.defaultSourceLocationId;
    if (!srcLocId) {
      const [whLoc] = await db
        .select()
        .from(locations)
        .where(eq(locations.warehouseId, delivery.warehouseId))
        .limit(1);

      if (whLoc) {
        srcLocId = whLoc.id;
      } else {
        const [newLoc] = await db
          .insert(locations)
          .values({
            warehouseId: delivery.warehouseId,
            name: "Stock",
            fullPath: "WH/Stock",
            locationType: "internal",
          })
          .returning();
        srcLocId = newLoc.id;
      }
    } else {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, srcLocId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(srcLocId);
      }
    }

    const qtyNum = parseFloat(input.quantity.toString());
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new Error("Quantity must be a valid number greater than zero");
    }

    const [insertedItem] = await db
      .insert(deliveryItems)
      .values({
        deliveryId,
        productId: input.productId,
        sourceLocationId: srcLocId,
        quantity: qtyNum.toString(),
        unitPrice: input.unitPrice ? input.unitPrice.toString() : null,
        notes: input.notes?.trim() ?? null,
      })
      .returning();

    await db
      .update(deliveries)
      .set({ updatedAt: new Date() })
      .where(eq(deliveries.id, deliveryId));

    return insertedItem;
  }

  /**
   * Update Delivery Item
   */
  static async updateDeliveryItem(
    deliveryId: string,
    itemId: string,
    input: UpdateDeliveryItemInput
  ): Promise<any> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === "DONE" || delivery.status === "CANCELED") {
      throw new DeliveryLockedError(delivery.status);
    }

    const [item] = await db
      .select()
      .from(deliveryItems)
      .where(
        and(
          eq(deliveryItems.id, itemId),
          eq(deliveryItems.deliveryId, deliveryId)
        )
      )
      .limit(1);

    if (!item) {
      throw new DeliveryItemNotFoundError(itemId);
    }

    if (input.sourceLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.sourceLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.sourceLocationId);
      }
    }

    let qtyStr = item.quantity;
    if (input.quantity !== undefined) {
      const qtyNum = parseFloat(input.quantity.toString());
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new Error("Quantity must be a valid number greater than zero");
      }
      qtyStr = qtyNum.toString();
    }

    const [updatedItem] = await db
      .update(deliveryItems)
      .set({
        sourceLocationId:
          input.sourceLocationId ?? item.sourceLocationId,
        quantity: qtyStr,
        unitPrice:
          input.unitPrice !== undefined
            ? input.unitPrice
              ? input.unitPrice.toString()
              : null
            : item.unitPrice,
        notes: input.notes !== undefined ? input.notes : item.notes,
        updatedAt: new Date(),
      })
      .where(eq(deliveryItems.id, itemId))
      .returning();

    await db
      .update(deliveries)
      .set({ updatedAt: new Date() })
      .where(eq(deliveries.id, deliveryId));

    return updatedItem;
  }

  /**
   * Remove Delivery Item
   */
  static async removeDeliveryItem(
    deliveryId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === "DONE" || delivery.status === "CANCELED") {
      throw new DeliveryLockedError(delivery.status);
    }

    const [item] = await db
      .select()
      .from(deliveryItems)
      .where(
        and(
          eq(deliveryItems.id, itemId),
          eq(deliveryItems.deliveryId, deliveryId)
        )
      )
      .limit(1);

    if (!item) {
      throw new DeliveryItemNotFoundError(itemId);
    }

    await db.delete(deliveryItems).where(eq(deliveryItems.id, itemId));

    await db
      .update(deliveries)
      .set({ updatedAt: new Date() })
      .where(eq(deliveries.id, deliveryId));

    return { success: true, message: "Delivery item removed successfully" };
  }

  /**
   * Pick Delivery (Transitions status from DRAFT -> WAITING). NO stock mutation.
   */
  static async pickDelivery(deliveryId: string): Promise<DeliveryWithDetails> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === "DONE" || delivery.status === "CANCELED") {
      throw new DeliveryLockedError(delivery.status);
    }

    if (!delivery.items || delivery.items.length === 0) {
      throw new DeliveryValidationError(
        "Cannot pick empty delivery. Delivery must contain at least one item.",
        ["Delivery must contain at least one line item"]
      );
    }

    if (delivery.status !== "DRAFT" && delivery.status !== "WAITING") {
      throw new InvalidStatusTransitionError(delivery.status, "WAITING");
    }

    await db
      .update(deliveries)
      .set({
        status: "WAITING",
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    return await this.getDelivery(deliveryId);
  }

  /**
   * Pack Delivery (Transitions status to READY). NO stock mutation.
   */
  static async packDelivery(deliveryId: string): Promise<DeliveryWithDetails> {
    const delivery = await this.getDelivery(deliveryId);

    if (delivery.status === "DONE" || delivery.status === "CANCELED") {
      throw new DeliveryLockedError(delivery.status);
    }

    if (!delivery.items || delivery.items.length === 0) {
      throw new DeliveryValidationError(
        "Cannot pack empty delivery. Delivery must contain at least one item.",
        ["Delivery must contain at least one line item"]
      );
    }

    await db
      .update(deliveries)
      .set({
        status: "READY",
        updatedAt: new Date(),
      })
      .where(eq(deliveries.id, deliveryId));

    return await this.getDelivery(deliveryId);
  }

  /**
   * Validate Delivery Document for Readiness (Pure validation, NO stock mutation)
   */
  static async validateDelivery(
    deliveryId: string
  ): Promise<DeliveryValidationResult> {
    const delivery = await this.getDelivery(deliveryId);
    const errors: string[] = [];

    if (delivery.status === "DONE") {
      errors.push("Delivery has already been completed");
    } else if (delivery.status === "CANCELED") {
      errors.push("Cancelled deliveries cannot be validated or processed");
    }

    if (!delivery.items || delivery.items.length === 0) {
      errors.push(
        "Delivery must contain at least one line item before validation"
      );
    } else {
      for (const item of delivery.items) {
        if (!item.product) {
          errors.push(`Line item '${item.id}' references an invalid product`);
        }

        if (!item.sourceLocation) {
          errors.push(
            `Line item '${item.id}' references an invalid source location`
          );
        }

        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          errors.push(
            `Line item '${item.id}' has an invalid quantity (${item.quantity})`
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new DeliveryValidationError(
        `Delivery validation failed: ${errors.join("; ")}`,
        errors
      );
    }

    if (delivery.status === "DRAFT" || delivery.status === "WAITING") {
      await db
        .update(deliveries)
        .set({
          status: "READY",
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));
    }

    const updatedDelivery = await this.getDelivery(deliveryId);

    return {
      isValid: true,
      errors: [],
      delivery: updatedDelivery,
      items: updatedDelivery.items,
    };
  }
}
