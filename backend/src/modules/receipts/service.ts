import { eq, and, ilike, or, count, desc } from "drizzle-orm";
import { db } from "../../db/client";
import { receipts, Receipt, ReceiptStatus } from "../../db/schema/receipts";
import { receiptItems, ReceiptItem } from "../../db/schema/receipt-items";
import { products } from "../../db/schema/products";
import { warehouses } from "../../db/schema/warehouses";
import { locations } from "../../db/schema/locations";
import { users } from "../../db/schema/users";
import {
  CreateReceiptInput,
  UpdateReceiptInput,
  CreateReceiptItemInput,
  UpdateReceiptItemInput,
  ListReceiptsQuery,
  ReceiptWithDetails,
  ValidationResult,
} from "./types";
import {
  ReceiptNotFoundError,
  ReceiptItemNotFoundError,
  WarehouseNotFoundError,
  LocationNotFoundError,
  ProductNotFoundError,
  ReceiptLockedError,
  InvalidStatusTransitionError,
  ReceiptValidationError,
} from "../../lib/errors";

// ---------------------------------------------------------------------------
// Helper: Generate a unique receipt tracking number (REC/YYYYMMDD/XXXX)
// ---------------------------------------------------------------------------
function generateReceiptNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REC/${dateStr}/${randomSuffix}`;
}

export class ReceiptCoreService {
  /**
   * Create a new receipt document with optional line items
   */
  static async createReceipt(
    input: CreateReceiptInput,
    createdByUserId?: string
  ): Promise<ReceiptWithDetails> {
    // 1. Validate warehouse existence
    const [warehouse] = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.id, input.warehouseId))
      .limit(1);

    if (!warehouse) {
      throw new WarehouseNotFoundError(input.warehouseId);
    }

    // 2. Validate default location if provided
    if (input.defaultLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.defaultLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.defaultLocationId);
      }
    }

    const receiptNum = input.receiptNumber?.trim() || generateReceiptNumber();

    // 3. Database transaction: insert receipt header + initial line items
    const newReceiptId = await db.transaction(async (tx) => {
      const [insertedReceipt] = await tx
        .insert(receipts)
        .values({
          receiptNumber: receiptNum,
          supplierName: input.supplierName?.trim() ?? null,
          supplierReference: input.supplierReference?.trim() ?? null,
          notes: input.notes?.trim() ?? null,
          warehouseId: input.warehouseId,
          defaultLocationId: input.defaultLocationId ?? null,
          status: "DRAFT",
          createdBy: createdByUserId ?? null,
        })
        .returning();

      if (!insertedReceipt) {
        throw new Error("Failed to insert receipt record");
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

          // Resolve location
          let destLocId = item.destinationLocationId || input.defaultLocationId;
          if (!destLocId) {
            const [whLoc] = await tx
              .select()
              .from(locations)
              .where(eq(locations.warehouseId, input.warehouseId))
              .limit(1);

            if (whLoc) {
              destLocId = whLoc.id;
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
              destLocId = newLoc.id;
            }
          } else {
            const [destLoc] = await tx
              .select()
              .from(locations)
              .where(eq(locations.id, destLocId))
              .limit(1);

            if (!destLoc) {
              throw new LocationNotFoundError(destLocId);
            }
          }

          const qtyNum = parseFloat(item.quantity.toString());
          if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new Error(`Quantity for product ${prod.name} must be greater than zero`);
          }

          await tx.insert(receiptItems).values({
            receiptId: insertedReceipt.id,
            productId: item.productId,
            destinationLocationId: destLocId,
            quantity: qtyNum.toString(),
            unitPrice: item.unitPrice ? item.unitPrice.toString() : null,
            notes: item.notes?.trim() ?? null,
          });
        }
      }

      return insertedReceipt.id;
    });

    return await this.getReceipt(newReceiptId);
  }

  /**
   * Fetch receipt by ID with relations and line items
   */
  static async getReceipt(receiptId: string): Promise<ReceiptWithDetails> {
    const [rec] = await db
      .select({
        receipt: receipts,
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          shortCode: warehouses.shortCode,
        },
        defaultLocation: {
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
      .from(receipts)
      .leftJoin(warehouses, eq(receipts.warehouseId, warehouses.id))
      .leftJoin(locations, eq(receipts.defaultLocationId, locations.id))
      .leftJoin(users, eq(receipts.createdBy, users.id))
      .where(eq(receipts.id, receiptId))
      .limit(1);

    if (!rec) {
      throw new ReceiptNotFoundError(receiptId);
    }

    // Fetch items for receipt
    const itemsRaw = await db
      .select({
        item: receiptItems,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        destinationLocation: {
          id: locations.id,
          name: locations.name,
          fullPath: locations.fullPath,
        },
      })
      .from(receiptItems)
      .leftJoin(products, eq(receiptItems.productId, products.id))
      .leftJoin(locations, eq(receiptItems.destinationLocationId, locations.id))
      .where(eq(receiptItems.receiptId, receiptId));

    const formattedItems = itemsRaw.map((r) => ({
      ...r.item,
      product: r.product?.id ? r.product : undefined,
      destinationLocation: r.destinationLocation?.id ? r.destinationLocation : undefined,
    }));

    return {
      ...rec.receipt,
      warehouse: rec.warehouse?.id ? rec.warehouse : undefined,
      defaultLocation: rec.defaultLocation?.id ? rec.defaultLocation : undefined,
      creator: rec.creator?.id ? rec.creator : undefined,
      items: formattedItems,
    };
  }

  /**
   * List receipts with search, filter, and pagination
   */
  static async listReceipts(query: ListReceiptsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(receipts.status, query.status));
    }

    if (query.warehouseId) {
      conditions.push(eq(receipts.warehouseId, query.warehouseId));
    }

    if (query.search?.trim()) {
      const searchPattern = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(receipts.receiptNumber, searchPattern),
          ilike(receipts.supplierName, searchPattern),
          ilike(receipts.supplierReference, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total rows
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(receipts)
      .where(whereClause);

    // Fetch data rows
    const rows = await db
      .select({
        receipt: receipts,
        warehouse: {
          id: warehouses.id,
          name: warehouses.name,
          shortCode: warehouses.shortCode,
        },
        defaultLocation: {
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
      .from(receipts)
      .leftJoin(warehouses, eq(receipts.warehouseId, warehouses.id))
      .leftJoin(locations, eq(receipts.defaultLocationId, locations.id))
      .leftJoin(users, eq(receipts.createdBy, users.id))
      .where(whereClause)
      .orderBy(desc(receipts.createdAt))
      .limit(limit)
      .offset(offset);

    const data: ReceiptWithDetails[] = await Promise.all(
      rows.map(async (row) => {
        const itemsRaw = await db
          .select({
            item: receiptItems,
            product: {
              id: products.id,
              name: products.name,
              sku: products.sku,
            },
            destinationLocation: {
              id: locations.id,
              name: locations.name,
              fullPath: locations.fullPath,
            },
          })
          .from(receiptItems)
          .leftJoin(products, eq(receiptItems.productId, products.id))
          .leftJoin(locations, eq(receiptItems.destinationLocationId, locations.id))
          .where(eq(receiptItems.receiptId, row.receipt.id));

        return {
          ...row.receipt,
          warehouse: row.warehouse?.id ? row.warehouse : undefined,
          defaultLocation: row.defaultLocation?.id ? row.defaultLocation : undefined,
          creator: row.creator?.id ? row.creator : undefined,
          items: itemsRaw.map((i) => ({
            ...i.item,
            product: i.product?.id ? i.product : undefined,
            destinationLocation: i.destinationLocation?.id
              ? i.destinationLocation
              : undefined,
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
   * Update receipt header
   */
  static async updateReceipt(
    receiptId: string,
    input: UpdateReceiptInput
  ): Promise<ReceiptWithDetails> {
    const existing = await this.getReceipt(receiptId);

    if (existing.status === "DONE" || existing.status === "CANCELED") {
      throw new ReceiptLockedError(existing.status);
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

    if (input.defaultLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.defaultLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.defaultLocationId);
      }
    }

    await db
      .update(receipts)
      .set({
        supplierName: input.supplierName !== undefined ? input.supplierName.trim() : existing.supplierName,
        supplierReference: input.supplierReference !== undefined ? input.supplierReference.trim() : existing.supplierReference,
        notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
        warehouseId: input.warehouseId ?? existing.warehouseId,
        defaultLocationId: input.defaultLocationId ?? existing.defaultLocationId,
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, receiptId));

    return await this.getReceipt(receiptId);
  }

  /**
   * Cancel receipt
   */
  static async cancelReceipt(receiptId: string): Promise<ReceiptWithDetails> {
    const existing = await this.getReceipt(receiptId);

    if (existing.status === "DONE") {
      throw new InvalidStatusTransitionError("DONE", "CANCELED");
    }

    if (existing.status === "CANCELED") {
      return existing;
    }

    await db
      .update(receipts)
      .set({
        status: "CANCELED",
        updatedAt: new Date(),
      })
      .where(eq(receipts.id, receiptId));

    return await this.getReceipt(receiptId);
  }

  /**
   * Add item to receipt
   */
  static async addReceiptItem(
    receiptId: string,
    input: CreateReceiptItemInput
  ): Promise<ReceiptWithDetails> {
    const receipt = await this.getReceipt(receiptId);

    if (receipt.status === "DONE" || receipt.status === "CANCELED") {
      throw new ReceiptLockedError(receipt.status);
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
    let destLocId = input.destinationLocationId || receipt.defaultLocationId;
    if (!destLocId) {
      const [whLoc] = await db
        .select()
        .from(locations)
        .where(eq(locations.warehouseId, receipt.warehouseId))
        .limit(1);

      if (whLoc) {
        destLocId = whLoc.id;
      } else {
        const [newLoc] = await db
          .insert(locations)
          .values({
            warehouseId: receipt.warehouseId,
            name: "Stock",
            fullPath: "WH/Stock",
            locationType: "internal",
          })
          .returning();
        destLocId = newLoc.id;
      }
    } else {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, destLocId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(destLocId);
      }
    }

    const qtyNum = parseFloat(input.quantity.toString());
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new Error("Quantity must be a valid number greater than zero");
    }

    const [insertedItem] = await db
      .insert(receiptItems)
      .values({
        receiptId,
        productId: input.productId,
        destinationLocationId: destLocId,
        quantity: qtyNum.toString(),
        unitPrice: input.unitPrice ? input.unitPrice.toString() : null,
        notes: input.notes?.trim() ?? null,
      })
      .returning();

    await db
      .update(receipts)
      .set({ updatedAt: new Date() })
      .where(eq(receipts.id, receiptId));

    return insertedItem;
  }

  /**
   * Update item on receipt
   */
  static async updateReceiptItem(
    receiptId: string,
    itemId: string,
    input: UpdateReceiptItemInput
  ): Promise<any> {
    const receipt = await this.getReceipt(receiptId);

    if (receipt.status === "DONE" || receipt.status === "CANCELED") {
      throw new ReceiptLockedError(receipt.status);
    }

    const [item] = await db
      .select()
      .from(receiptItems)
      .where(and(eq(receiptItems.id, itemId), eq(receiptItems.receiptId, receiptId)))
      .limit(1);

    if (!item) {
      throw new ReceiptItemNotFoundError(itemId);
    }

    if (input.destinationLocationId) {
      const [loc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.destinationLocationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(input.destinationLocationId);
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
      .update(receiptItems)
      .set({
        destinationLocationId: input.destinationLocationId ?? item.destinationLocationId,
        quantity: qtyStr,
        unitPrice: input.unitPrice !== undefined ? (input.unitPrice ? input.unitPrice.toString() : null) : item.unitPrice,
        notes: input.notes !== undefined ? input.notes : item.notes,
        updatedAt: new Date(),
      })
      .where(eq(receiptItems.id, itemId))
      .returning();

    await db
      .update(receipts)
      .set({ updatedAt: new Date() })
      .where(eq(receipts.id, receiptId));

    return updatedItem;
  }

  /**
   * Remove item from receipt
   */
  static async removeReceiptItem(
    receiptId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const receipt = await this.getReceipt(receiptId);

    if (receipt.status === "DONE" || receipt.status === "CANCELED") {
      throw new ReceiptLockedError(receipt.status);
    }

    const [item] = await db
      .select()
      .from(receiptItems)
      .where(and(eq(receiptItems.id, itemId), eq(receiptItems.receiptId, receiptId)))
      .limit(1);

    if (!item) {
      throw new ReceiptItemNotFoundError(itemId);
    }

    await db.delete(receiptItems).where(eq(receiptItems.id, itemId));

    await db
      .update(receipts)
      .set({ updatedAt: new Date() })
      .where(eq(receipts.id, receiptId));

    return { success: true, message: "Receipt item removed successfully" };
  }

  /**
   * Validate Receipt Document for Processing (Pure validation, NO stock mutation)
   *
   * Checks document structure, active statuses, product validity, and quantities.
   * If valid, transitions receipt status to 'READY' and returns validated data
   * for the separate Receipt Processing module to consume.
   */
  static async validateReceipt(receiptId: string): Promise<ValidationResult> {
    const receipt = await this.getReceipt(receiptId);
    const errors: string[] = [];

    // 1. Check processable state
    if (receipt.status === "DONE") {
      errors.push("Receipt has already been completed");
    } else if (receipt.status === "CANCELED") {
      errors.push("Cancelled receipts cannot be validated or processed");
    }

    // 2. Check items existence
    if (!receipt.items || receipt.items.length === 0) {
      errors.push("Receipt must contain at least one line item before validation");
    } else {
      // 3. Validate each item
      for (const item of receipt.items) {
        if (!item.product) {
          errors.push(`Line item '${item.id}' references an invalid product`);
        }

        if (!item.destinationLocation) {
          errors.push(`Line item '${item.id}' references an invalid destination location`);
        }

        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          errors.push(`Line item '${item.id}' has an invalid quantity (${item.quantity})`);
        }
      }
    }

    if (errors.length > 0) {
      throw new ReceiptValidationError(
        `Receipt validation failed: ${errors.join("; ")}`,
        errors
      );
    }

    // Transition receipt to READY state if currently DRAFT or WAITING
    if (receipt.status === "DRAFT" || receipt.status === "WAITING") {
      await db
        .update(receipts)
        .set({
          status: "READY",
          validatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, receiptId));
    }

    const updatedReceipt = await this.getReceipt(receiptId);

    return {
      isValid: true,
      errors: [],
      receipt: updatedReceipt,
      items: updatedReceipt.items,
    };
  }
}
