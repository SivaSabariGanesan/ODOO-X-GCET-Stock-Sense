import { db } from "../../db/client";
import { receipts } from "../../db/schema/receipts";
import { receiptItems } from "../../db/schema/receipt-items";
import { ReceiptCoreService } from "./service";
import { InventoryService } from "../inventory/service";
import { EventBus } from "../websocket/event-bus";
import { ReceiptWithDetails } from "./types";
import {
  ReceiptNotFoundError,
  ReceiptLockedError,
  ReceiptValidationError,
  AppError,
} from "../../lib/errors";
import { eq, and } from "drizzle-orm";

export class ReceiptProcessingService {
  /**
   * Process Receipt (Stock Operation Layer)
   *
   * 1. Loads and locks receipt record.
   * 2. Verifies status (must be DRAFT, WAITING, or READY, NOT DONE or CANCELED).
   * 3. Validates receipt line items.
   * 4. Opens a database transaction:
   *    - Calls InventoryService.receiveStock() to update stock_balances & insert stock_movements.
   *    - Marks receipt status = 'DONE'.
   * 5. Commits transaction or rolls back completely on any failure.
   */
  static async processReceipt(
    receiptId: string,
    processedByUserId?: string
  ): Promise<ReceiptWithDetails> {
    // Execute full processing inside an atomic database transaction
    await db.transaction(async (tx) => {
      // 1. Fetch & lock receipt row to prevent concurrent processing attempts
      const [receipt] = await tx
        .select()
        .from(receipts)
        .where(eq(receipts.id, receiptId))
        .for("update")
        .limit(1);

      if (!receipt) {
        throw new ReceiptNotFoundError(receiptId);
      }

      // 2. Idempotency & Status Check
      if (receipt.status === "DONE") {
        throw new AppError("Receipt has already been processed and is marked DONE", 409);
      }

      if (receipt.status === "CANCELED") {
        throw new ReceiptLockedError(receipt.status);
      }

      // 3. Fetch receipt items inside transaction
      const items = await tx
        .select()
        .from(receiptItems)
        .where(eq(receiptItems.receiptId, receiptId));

      if (!items || items.length === 0) {
        throw new ReceiptValidationError(
          "Receipt validation failed: Receipt must contain at least one line item before processing",
          ["Receipt must contain at least one line item before processing"]
        );
      }

      // 4. Validate items details
      for (const item of items) {
        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          throw new ReceiptValidationError(
            `Receipt validation failed: Line item '${item.id}' has invalid quantity (${item.quantity})`,
            [`Line item '${item.id}' has invalid quantity`]
          );
        }

        if (!item.destinationLocationId) {
          throw new ReceiptValidationError(
            `Receipt validation failed: Line item '${item.id}' is missing a destination location`,
            [`Line item '${item.id}' is missing a destination location`]
          );
        }
      }

      // 5. Delegate stock mutation and ledger audit logging to authoritative InventoryService
      await InventoryService.receiveStock(
        {
          items: items.map((item) => ({
            productId: item.productId,
            destinationLocationId: item.destinationLocationId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
          })),
          referenceType: "RECEIPT",
          referenceId: receiptId,
          movementType: "RECEIPT",
          createdBy: processedByUserId,
        },
        tx
      );

      // 6. Complete receipt status -> DONE
      await tx
        .update(receipts)
        .set({
          status: "DONE",
          validatedAt: receipt.validatedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, receiptId));
    });

    // 7. Post-Commit WebSocket Event Publishing
    try {
      const updatedReceipt = await ReceiptCoreService.getReceipt(receiptId);

      EventBus.publish("stock.received", {
        receiptId,
        receiptNumber: updatedReceipt.receiptNumber,
        warehouseId: updatedReceipt.warehouseId,
        items: updatedReceipt.items.map((i) => ({
          productId: i.productId,
          destinationLocationId: i.destinationLocationId!,
          quantity: i.quantity,
        })),
        processedBy: processedByUserId,
        timestamp: new Date().toISOString(),
      });

      EventBus.publish("inventory.updated", {
        operationType: "RECEIPT",
        operationId: receiptId,
        warehouseId: updatedReceipt.warehouseId,
        timestamp: new Date().toISOString(),
      });

      return updatedReceipt;
    } catch (err) {
      // Broadcast error cannot roll back committed receipt transaction
      console.error(`[WebSocket] Post-commit receipt broadcast error:`, err);
      return await ReceiptCoreService.getReceipt(receiptId);
    }
  }
}
