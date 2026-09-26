import { db } from "../../db/client";
import {
  internalTransfers,
  InternalTransfer,
} from "../../db/schema/internal-transfers";
import {
  internalTransferItems,
  InternalTransferItem,
} from "../../db/schema/internal-transfer-items";
import { locations } from "../../db/schema/locations";
import { products } from "../../db/schema/products";
import { InventoryService } from "../inventory/service";
import { EventBus } from "../websocket/event-bus";
import {
  CreateInternalTransferInput,
  UpdateInternalTransferInput,
  CreateInternalTransferItemInput,
  UpdateInternalTransferItemInput,
  ListInternalTransfersQuery,
  InternalTransferWithDetails,
  InternalTransferValidationResult,
} from "./types";
import {
  TransferNotFoundError,
  TransferItemNotFoundError,
  TransferLockedError,
  TransferValidationError,
  LocationNotFoundError,
  ProductNotFoundError,
  AppError,
} from "../../lib/errors";
import { eq, and, sql, ilike, or, count, inArray } from "drizzle-orm";

/**
 * Generate human-readable internal transfer tracking number
 * e.g., "INT/20260926/8391"
 */
function generateTransferNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INT/${dateStr}/${randomSuffix}`;
}

export class TransferService {
  /**
   * Create Internal Transfer document with optional initial line items (transactional)
   */
  static async createTransfer(
    input: CreateInternalTransferInput,
    createdByUserId?: string
  ): Promise<InternalTransferWithDetails> {
    if (input.sourceLocationId === input.destinationLocationId) {
      throw new AppError("Source location and destination location must be different", 400);
    }

    // 1. Verify Source Location
    const [srcLoc] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, input.sourceLocationId))
      .limit(1);

    if (!srcLoc) {
      throw new LocationNotFoundError(input.sourceLocationId);
    }

    // 2. Verify Destination Location
    const [destLoc] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, input.destinationLocationId))
      .limit(1);

    if (!destLoc) {
      throw new LocationNotFoundError(input.destinationLocationId);
    }

    const transferNum = input.transferNumber || generateTransferNumber();

    let createdId = "";

    await db.transaction(async (tx) => {
      const [transfer] = await tx
        .insert(internalTransfers)
        .values({
          transferNumber: transferNum,
          notes: input.notes,
          sourceLocationId: input.sourceLocationId,
          destinationLocationId: input.destinationLocationId,
          status: "DRAFT",
          createdBy: createdByUserId,
        })
        .returning();

      createdId = transfer.id;

      if (input.items && input.items.length > 0) {
        for (const itemInput of input.items) {
          const qtyNum = typeof itemInput.quantity === "string" ? parseFloat(itemInput.quantity) : itemInput.quantity;
          if (isNaN(qtyNum) || qtyNum <= 0) {
            throw new AppError(`Invalid item quantity '${itemInput.quantity}'`, 400);
          }

          const [prod] = await tx
            .select()
            .from(products)
            .where(eq(products.id, itemInput.productId))
            .limit(1);

          if (!prod) {
            throw new ProductNotFoundError(itemInput.productId);
          }

          await tx.insert(internalTransferItems).values({
            transferId: transfer.id,
            productId: itemInput.productId,
            quantity: qtyNum.toFixed(4),
          });
        }
      }
    });

    return await this.getTransfer(createdId);
  }

  /**
   * Get Internal Transfer by ID with line items and locations
   */
  static async getTransfer(id: string): Promise<InternalTransferWithDetails> {
    const [transfer] = await db
      .select()
      .from(internalTransfers)
      .where(eq(internalTransfers.id, id))
      .limit(1);

    if (!transfer) {
      throw new TransferNotFoundError(id);
    }

    const [sourceLocation] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, transfer.sourceLocationId))
      .limit(1);

    const [destinationLocation] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, transfer.destinationLocationId))
      .limit(1);

    const itemsRows = await db
      .select({
        item: internalTransferItems,
        product: products,
      })
      .from(internalTransferItems)
      .leftJoin(products, eq(internalTransferItems.productId, products.id))
      .where(eq(internalTransferItems.transferId, id));

    const items = itemsRows.map(({ item, product }) => ({
      ...item,
      product: product ?? undefined,
    }));

    return {
      ...transfer,
      sourceLocation: sourceLocation ?? undefined,
      destinationLocation: destinationLocation ?? undefined,
      items,
    };
  }

  /**
   * List Internal Transfers with pagination and filters
   */
  static async listTransfers(query: ListInternalTransfersQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.status) {
      conditions.push(eq(internalTransfers.status, query.status));
    }
    if (query.sourceLocationId) {
      conditions.push(eq(internalTransfers.sourceLocationId, query.sourceLocationId));
    }
    if (query.destinationLocationId) {
      conditions.push(eq(internalTransfers.destinationLocationId, query.destinationLocationId));
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(internalTransfers.transferNumber, `%${query.search}%`),
          ilike(internalTransfers.notes, `%${query.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ total: count() })
      .from(internalTransfers)
      .where(whereClause);

    const total = Number(countResult?.total ?? 0);

    const transferRows = await db
      .select()
      .from(internalTransfers)
      .where(whereClause)
      .orderBy(sql`${internalTransfers.createdAt} DESC`)
      .limit(limit)
      .offset(offset);

    const transferIds = transferRows.map((t) => t.id);

    let allItems: Record<string, any[]> = {};
    if (transferIds.length > 0) {
      const itemsData = await db
        .select({
          item: internalTransferItems,
          product: products,
        })
        .from(internalTransferItems)
        .leftJoin(products, eq(internalTransferItems.productId, products.id))
        .where(inArray(internalTransferItems.transferId, transferIds));

      for (const { item, product } of itemsData) {
        if (!allItems[item.transferId]) {
          allItems[item.transferId] = [];
        }
        allItems[item.transferId].push({
          ...item,
          product: product ?? undefined,
        });
      }
    }

    const data = transferRows.map((transfer) => ({
      ...transfer,
      items: allItems[transfer.id] ?? [],
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
   * Update Internal Transfer header
   */
  static async updateTransfer(
    id: string,
    input: UpdateInternalTransferInput
  ): Promise<InternalTransferWithDetails> {
    const transfer = await this.getTransfer(id);

    if (transfer.status === "DONE" || transfer.status === "CANCELED") {
      throw new TransferLockedError(transfer.status);
    }

    const newSource = input.sourceLocationId ?? transfer.sourceLocationId;
    const newDest = input.destinationLocationId ?? transfer.destinationLocationId;

    if (newSource === newDest) {
      throw new AppError("Source location and destination location must be different", 400);
    }

    if (input.sourceLocationId) {
      const [srcLoc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.sourceLocationId))
        .limit(1);
      if (!srcLoc) throw new LocationNotFoundError(input.sourceLocationId);
    }

    if (input.destinationLocationId) {
      const [destLoc] = await db
        .select()
        .from(locations)
        .where(eq(locations.id, input.destinationLocationId))
        .limit(1);
      if (!destLoc) throw new LocationNotFoundError(input.destinationLocationId);
    }

    await db
      .update(internalTransfers)
      .set({
        notes: input.notes !== undefined ? input.notes : transfer.notes,
        sourceLocationId: newSource,
        destinationLocationId: newDest,
        updatedAt: new Date(),
      })
      .where(eq(internalTransfers.id, id));

    return await this.getTransfer(id);
  }

  /**
   * Cancel Internal Transfer
   */
  static async cancelTransfer(id: string): Promise<InternalTransferWithDetails> {
    const transfer = await this.getTransfer(id);

    if (transfer.status === "DONE") {
      throw new AppError("Cannot cancel a completed internal transfer", 400);
    }
    if (transfer.status === "CANCELED") {
      throw new AppError("Internal transfer is already cancelled", 400);
    }

    await db
      .update(internalTransfers)
      .set({
        status: "CANCELED",
        updatedAt: new Date(),
      })
      .where(eq(internalTransfers.id, id));

    return await this.getTransfer(id);
  }

  /**
   * Add Item to Internal Transfer
   */
  static async addTransferItem(
    transferId: string,
    input: CreateInternalTransferItemInput
  ): Promise<InternalTransferItem> {
    const transfer = await this.getTransfer(transferId);

    if (transfer.status === "DONE" || transfer.status === "CANCELED") {
      throw new TransferLockedError(transfer.status);
    }

    const qtyNum = typeof input.quantity === "string" ? parseFloat(input.quantity) : input.quantity;
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError(`Invalid item quantity '${input.quantity}'`, 400);
    }

    const [prod] = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1);

    if (!prod) {
      throw new ProductNotFoundError(input.productId);
    }

    const [item] = await db
      .insert(internalTransferItems)
      .values({
        transferId: transferId,
        productId: input.productId,
        quantity: qtyNum.toFixed(4),
      })
      .returning();

    await db
      .update(internalTransfers)
      .set({ updatedAt: new Date() })
      .where(eq(internalTransfers.id, transferId));

    return item;
  }

  /**
   * Update Internal Transfer Item
   */
  static async updateTransferItem(
    transferId: string,
    itemId: string,
    input: UpdateInternalTransferItemInput
  ): Promise<InternalTransferItem> {
    const transfer = await this.getTransfer(transferId);

    if (transfer.status === "DONE" || transfer.status === "CANCELED") {
      throw new TransferLockedError(transfer.status);
    }

    const [item] = await db
      .select()
      .from(internalTransferItems)
      .where(
        and(
          eq(internalTransferItems.id, itemId),
          eq(internalTransferItems.transferId, transferId)
        )
      )
      .limit(1);

    if (!item) {
      throw new TransferItemNotFoundError(itemId);
    }

    const qtyNum = typeof input.quantity === "string" ? parseFloat(input.quantity) : input.quantity;
    if (isNaN(qtyNum) || qtyNum <= 0) {
      throw new AppError(`Invalid item quantity '${input.quantity}'`, 400);
    }

    const [updatedItem] = await db
      .update(internalTransferItems)
      .set({
        quantity: qtyNum.toFixed(4),
        updatedAt: new Date(),
      })
      .where(eq(internalTransferItems.id, itemId))
      .returning();

    await db
      .update(internalTransfers)
      .set({ updatedAt: new Date() })
      .where(eq(internalTransfers.id, transferId));

    return updatedItem;
  }

  /**
   * Remove Internal Transfer Item
   */
  static async removeTransferItem(
    transferId: string,
    itemId: string
  ): Promise<{ success: boolean; message: string }> {
    const transfer = await this.getTransfer(transferId);

    if (transfer.status === "DONE" || transfer.status === "CANCELED") {
      throw new TransferLockedError(transfer.status);
    }

    const [item] = await db
      .select()
      .from(internalTransferItems)
      .where(
        and(
          eq(internalTransferItems.id, itemId),
          eq(internalTransferItems.transferId, transferId)
        )
      )
      .limit(1);

    if (!item) {
      throw new TransferItemNotFoundError(itemId);
    }

    await db
      .delete(internalTransferItems)
      .where(eq(internalTransferItems.id, itemId));

    await db
      .update(internalTransfers)
      .set({ updatedAt: new Date() })
      .where(eq(internalTransfers.id, transferId));

    return {
      success: true,
      message: `Item '${itemId}' removed from internal transfer successfully`,
    };
  }

  /**
   * Validate Internal Transfer Document (Pure Validation)
   */
  static async validateTransfer(
    id: string
  ): Promise<InternalTransferValidationResult> {
    const transfer = await this.getTransfer(id);
    const errors: string[] = [];

    if (transfer.status === "DONE") {
      errors.push("Transfer is already completed");
    }
    if (transfer.status === "CANCELED") {
      errors.push("Transfer is cancelled");
    }

    if (transfer.sourceLocationId === transfer.destinationLocationId) {
      errors.push("Source location and destination location must be different");
    }

    if (!transfer.sourceLocation) {
      errors.push(`Source location '${transfer.sourceLocationId}' does not exist`);
    }

    if (!transfer.destinationLocation) {
      errors.push(`Destination location '${transfer.destinationLocationId}' does not exist`);
    }

    if (!transfer.items || transfer.items.length === 0) {
      errors.push("Transfer must contain at least one line item before validation");
    } else {
      for (const item of transfer.items) {
        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          errors.push(`Item '${item.id}' has invalid quantity '${item.quantity}'`);
        }
        if (!item.product) {
          errors.push(`Item '${item.id}' references a product '${item.productId}' that does not exist`);
        }
      }
    }

    const isValid = errors.length === 0;

    if (isValid && transfer.status === "DRAFT") {
      await db
        .update(internalTransfers)
        .set({
          status: "READY",
          updatedAt: new Date(),
        })
        .where(eq(internalTransfers.id, id));

      transfer.status = "READY";
    }

    if (!isValid) {
      throw new TransferValidationError(
        `Transfer validation failed with ${errors.length} error(s)`,
        errors
      );
    }

    return {
      valid: true,
      transfer,
      errors: [],
    };
  }

  /**
   * Process Internal Transfer (Atomic Stock Operation via InventoryService)
   *
   * 1. Loads and locks transfer record.
   * 2. Checks status (must NOT be DONE or CANCELED).
   * 3. Validates line items & locations.
   * 4. Opens a database transaction:
   *    - Calls InventoryService.transferStock() to check source stock, decrease source,
   *      increase destination, and log immutable stock_movements.
   *    - Marks transfer status = 'DONE'.
   * 5. Commits transaction or rolls back completely on any failure.
   */
  static async processTransfer(
    id: string,
    processedByUserId?: string
  ): Promise<InternalTransferWithDetails> {
    await db.transaction(async (tx) => {
      // 1. Fetch & lock transfer row to prevent concurrent processing
      const [transfer] = await tx
        .select()
        .from(internalTransfers)
        .where(eq(internalTransfers.id, id))
        .for("update")
        .limit(1);

      if (!transfer) {
        throw new TransferNotFoundError(id);
      }

      // 2. Idempotency & Status Check
      if (transfer.status === "DONE") {
        throw new AppError("Internal transfer has already been processed and is marked DONE", 409);
      }

      if (transfer.status === "CANCELED") {
        throw new TransferLockedError(transfer.status);
      }

      if (transfer.sourceLocationId === transfer.destinationLocationId) {
        throw new AppError("Source location and destination location must be different", 400);
      }

      // 3. Fetch items inside transaction
      const items = await tx
        .select()
        .from(internalTransferItems)
        .where(eq(internalTransferItems.transferId, id));

      if (!items || items.length === 0) {
        throw new TransferValidationError(
          "Transfer validation failed: Transfer must contain at least one line item before processing",
          ["Transfer must contain at least one line item before processing"]
        );
      }

      // 4. Validate item quantities
      for (const item of items) {
        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          throw new TransferValidationError(
            `Transfer validation failed: Line item '${item.id}' has invalid quantity (${item.quantity})`,
            [`Line item '${item.id}' has invalid quantity`]
          );
        }
      }

      // 5. Delegate stock transfer, availability check, and ledger movement to InventoryService
      await InventoryService.transferStock(
        {
          items: items.map((item) => ({
            productId: item.productId,
            sourceLocationId: transfer.sourceLocationId,
            destinationLocationId: transfer.destinationLocationId,
            quantity: item.quantity,
          })),
          referenceType: "INTERNAL_TRANSFER",
          referenceId: id,
          movementType: "TRANSFER",
          createdBy: processedByUserId,
        },
        tx
      );

      // 6. Complete transfer status -> DONE
      await tx
        .update(internalTransfers)
        .set({
          status: "DONE",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(internalTransfers.id, id));
    });

    // 7. Post-Commit WebSocket Event Publishing
    try {
      const updatedTransfer = await this.getTransfer(id);

      EventBus.publish("stock.transferred", {
        transferId: id,
        transferNumber: updatedTransfer.transferNumber,
        sourceLocationId: updatedTransfer.sourceLocationId,
        destinationLocationId: updatedTransfer.destinationLocationId,
        items: updatedTransfer.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        processedBy: processedByUserId,
        timestamp: new Date().toISOString(),
      });

      EventBus.publish("inventory.updated", {
        operationType: "TRANSFER",
        operationId: id,
        timestamp: new Date().toISOString(),
      });

      return updatedTransfer;
    } catch (err) {
      console.error(`[WebSocket] Post-commit transfer broadcast error:`, err);
      return await this.getTransfer(id);
    }
  }
}
