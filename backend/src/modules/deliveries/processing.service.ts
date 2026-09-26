import { db } from "../../db/client";
import { deliveries } from "../../db/schema/deliveries";
import { deliveryItems } from "../../db/schema/delivery-items";
import { DeliveryCoreService } from "./service";
import { InventoryService } from "../inventory/service";
import { DeliveryWithDetails } from "./types";
import {
  DeliveryNotFoundError,
  DeliveryLockedError,
  DeliveryValidationError,
  AppError,
} from "../../lib/errors";
import { eq } from "drizzle-orm";

export class DeliveryProcessingService {
  /**
   * Process Delivery (Stock Operation Layer)
   *
   * 1. Loads and locks delivery record.
   * 2. Verifies status (must NOT be DONE or CANCELED).
   * 3. Validates delivery line items.
   * 4. Opens a database transaction:
   *    - Calls InventoryService.deliverStock() to check stock availability,
   *      decrease stock_balances, and log immutable stock_movements.
   *    - Marks delivery status = 'DONE'.
   * 5. Commits transaction or rolls back completely on any failure (insufficient stock, invalid item, DB crash).
   */
  static async processDelivery(
    deliveryId: string,
    processedByUserId?: string
  ): Promise<DeliveryWithDetails> {
    // Execute full processing inside an atomic database transaction
    await db.transaction(async (tx) => {
      // 1. Fetch & lock delivery row to prevent concurrent processing attempts
      const [delivery] = await tx
        .select()
        .from(deliveries)
        .where(eq(deliveries.id, deliveryId))
        .for("update")
        .limit(1);

      if (!delivery) {
        throw new DeliveryNotFoundError(deliveryId);
      }

      // 2. Idempotency & Status Check
      if (delivery.status === "DONE") {
        throw new AppError("Delivery has already been processed and is marked DONE", 409);
      }

      if (delivery.status === "CANCELED") {
        throw new DeliveryLockedError(delivery.status);
      }

      // 3. Fetch delivery items inside transaction
      const items = await tx
        .select()
        .from(deliveryItems)
        .where(eq(deliveryItems.deliveryId, deliveryId));

      if (!items || items.length === 0) {
        throw new DeliveryValidationError(
          "Delivery validation failed: Delivery must contain at least one line item before processing",
          ["Delivery must contain at least one line item before processing"]
        );
      }

      // 4. Validate items details
      for (const item of items) {
        const qtyNum = parseFloat(item.quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
          throw new DeliveryValidationError(
            `Delivery validation failed: Line item '${item.id}' has invalid quantity (${item.quantity})`,
            [`Line item '${item.id}' has invalid quantity`]
          );
        }

        const sourceLocId = item.sourceLocationId || delivery.defaultSourceLocationId;
        if (!sourceLocId) {
          throw new DeliveryValidationError(
            `Delivery validation failed: Line item '${item.id}' is missing a source location`,
            [`Line item '${item.id}' is missing a source location`]
          );
        }
      }

      // 5. Delegate stock availability checking, stock balance decrease, and movement logging to InventoryService
      await InventoryService.deliverStock(
        {
          items: items.map((item) => ({
            productId: item.productId,
            sourceLocationId: item.sourceLocationId || delivery.defaultSourceLocationId!,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            notes: item.notes,
          })),
          referenceType: "DELIVERY",
          referenceId: deliveryId,
          movementType: "DELIVERY",
          createdBy: processedByUserId,
        },
        tx
      );

      // 6. Complete delivery status -> DONE
      await tx
        .update(deliveries)
        .set({
          status: "DONE",
          validatedAt: delivery.validatedAt ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deliveries.id, deliveryId));
    });

    // 7. Return complete updated delivery details
    return await DeliveryCoreService.getDelivery(deliveryId);
  }
}
