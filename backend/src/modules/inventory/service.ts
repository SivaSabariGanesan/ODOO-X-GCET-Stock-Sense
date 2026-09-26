import { db } from "../../db/client";
import { stockBalances } from "../../db/schema/stock-balances";
import { stockMovements } from "../../db/schema/stock-movements";
import { products } from "../../db/schema/products";
import { locations } from "../../db/schema/locations";
import { eq, and, sql } from "drizzle-orm";
import { ReceiveStockInput, DeliverStockInput } from "./types";
import {
  ProductNotFoundError,
  LocationNotFoundError,
  InsufficientStockError,
  AppError,
} from "../../lib/errors";

export class InventoryService {
  /**
   * Authoritative Inventory Method: Receives stock into inventory.
   * Atomically updates stock balances (upsert) and logs immutable stock movement records.
   *
   * Accepts an optional transaction context `txContext` so callers can execute
   * inventory movements within their own outer database transaction.
   */
  static async receiveStock(
    input: ReceiveStockInput,
    txContext?: any
  ): Promise<void> {
    const executor = txContext ?? db;

    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided to receive into inventory", 400);
    }

    for (const item of input.items) {
      const qtyNum = parseFloat(item.quantity.toString());
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock receipt`, 400);
      }

      // 1. Verify Product existence
      const [prod] = await executor
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!prod) {
        throw new ProductNotFoundError(item.productId);
      }

      // 2. Verify Destination Location existence
      const [destLoc] = await executor
        .select()
        .from(locations)
        .where(eq(locations.id, item.destinationLocationId))
        .limit(1);

      if (!destLoc) {
        throw new LocationNotFoundError(item.destinationLocationId);
      }

      // 3. Upsert Stock Balance (atomic update if exists, insert if new)
      const [existingBalance] = await executor
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, item.productId),
            eq(stockBalances.locationId, item.destinationLocationId)
          )
        )
        .limit(1);

      if (existingBalance) {
        const currentQty = parseFloat(existingBalance.quantity);
        const updatedQty = (currentQty + qtyNum).toFixed(4);

        await executor
          .update(stockBalances)
          .set({
            quantity: updatedQty,
            lastMovedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(stockBalances.id, existingBalance.id));
      } else {
        await executor.insert(stockBalances).values({
          productId: item.productId,
          locationId: item.destinationLocationId,
          quantity: qtyNum.toFixed(4),
          reservedQuantity: "0.0000",
          lastMovedAt: new Date(),
        });
      }

      // 4. Log Immutable Stock Movement (Ledger Audit Record)
      await executor.insert(stockMovements).values({
        productId: item.productId,
        sourceLocationId: item.sourceLocationId ?? null,
        destinationLocationId: item.destinationLocationId,
        quantity: qtyNum.toFixed(4),
        movementType: input.movementType ?? "RECEIPT",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? null,
      });
    }
  }

  /**
   * Authoritative Inventory Method: Delivers / issues stock out of inventory.
   * Checks stock availability at source location, decreases stock balances,
   * and logs immutable stock movement records.
   * Throws InsufficientStockError if available stock < requested quantity.
   */
  static async deliverStock(
    input: DeliverStockInput,
    txContext?: any
  ): Promise<void> {
    const executor = txContext ?? db;

    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided to deliver from inventory", 400);
    }

    for (const item of input.items) {
      const qtyNum = parseFloat(item.quantity.toString());
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock delivery`, 400);
      }

      // 1. Verify Product existence
      const [prod] = await executor
        .select()
        .from(products)
        .where(eq(products.id, item.productId))
        .limit(1);

      if (!prod) {
        throw new ProductNotFoundError(item.productId);
      }

      // 2. Verify Source Location existence
      const [srcLoc] = await executor
        .select()
        .from(locations)
        .where(eq(locations.id, item.sourceLocationId))
        .limit(1);

      if (!srcLoc) {
        throw new LocationNotFoundError(item.sourceLocationId);
      }

      // 3. Fetch Stock Balance & Check Availability
      const [existingBalance] = await executor
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, item.productId),
            eq(stockBalances.locationId, item.sourceLocationId)
          )
        )
        .limit(1);

      const currentQty = existingBalance ? parseFloat(existingBalance.quantity) : 0;

      if (currentQty < qtyNum) {
        throw new InsufficientStockError(
          `Insufficient stock for product '${prod.name}' at location '${srcLoc.name}'. Available: ${currentQty}, Requested: ${qtyNum}`
        );
      }

      // 4. Decrease Stock Balance
      const updatedQty = (currentQty - qtyNum).toFixed(4);

      await executor
        .update(stockBalances)
        .set({
          quantity: updatedQty,
          lastMovedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockBalances.id, existingBalance.id));

      // 5. Log Immutable Stock Movement (Ledger Audit Record)
      await executor.insert(stockMovements).values({
        productId: item.productId,
        sourceLocationId: item.sourceLocationId,
        destinationLocationId: item.destinationLocationId ?? null,
        quantity: qtyNum.toFixed(4),
        movementType: input.movementType ?? "DELIVERY",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? null,
      });
    }
  }
}

