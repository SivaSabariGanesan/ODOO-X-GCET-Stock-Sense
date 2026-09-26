import { db } from "../../db/client";
import { stockBalances } from "../../db/schema/stock-balances";
import { stockMovements } from "../../db/schema/stock-movements";
import { products } from "../../db/schema/products";
import { locations } from "../../db/schema/locations";
import { eq, and, sql } from "drizzle-orm";
import { ReceiveStockInput, DeliverStockInput, TransferStockInput, AdjustStockInput } from "./types";
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

  /**
   * Authoritative Inventory Method: Transfers stock between internal locations.
   * Decreases stock balance at source location, increases stock balance at
   * destination location (upsert), and logs an immutable stock movement record.
   * Throws InsufficientStockError if source stock < requested quantity.
   */
  static async transferStock(
    input: TransferStockInput,
    txContext?: any
  ): Promise<void> {
    const executor = txContext ?? db;

    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided for internal transfer", 400);
    }

    for (const item of input.items) {
      const qtyNum = parseFloat(item.quantity.toString());
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock transfer`, 400);
      }

      if (item.sourceLocationId === item.destinationLocationId) {
        throw new AppError("Source location and destination location must be different", 400);
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

      // 3. Verify Destination Location existence
      const [destLoc] = await executor
        .select()
        .from(locations)
        .where(eq(locations.id, item.destinationLocationId))
        .limit(1);

      if (!destLoc) {
        throw new LocationNotFoundError(item.destinationLocationId);
      }

      // 4. Fetch Source Stock Balance & Check Availability
      const [sourceBalance] = await executor
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, item.productId),
            eq(stockBalances.locationId, item.sourceLocationId)
          )
        )
        .limit(1);

      const currentSourceQty = sourceBalance ? parseFloat(sourceBalance.quantity) : 0;

      if (currentSourceQty < qtyNum) {
        throw new InsufficientStockError(
          `Insufficient stock for product '${prod.name}' at location '${srcLoc.name}'. Available: ${currentSourceQty}, Requested: ${qtyNum}`
        );
      }

      // 5. Decrease Source Stock Balance
      const updatedSourceQty = (currentSourceQty - qtyNum).toFixed(4);

      await executor
        .update(stockBalances)
        .set({
          quantity: updatedSourceQty,
          lastMovedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockBalances.id, sourceBalance.id));

      // 6. Increase Destination Stock Balance (Upsert)
      const [destBalance] = await executor
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, item.productId),
            eq(stockBalances.locationId, item.destinationLocationId)
          )
        )
        .limit(1);

      if (destBalance) {
        const currentDestQty = parseFloat(destBalance.quantity);
        const updatedDestQty = (currentDestQty + qtyNum).toFixed(4);

        await executor
          .update(stockBalances)
          .set({
            quantity: updatedDestQty,
            lastMovedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(stockBalances.id, destBalance.id));
      } else {
        await executor.insert(stockBalances).values({
          productId: item.productId,
          locationId: item.destinationLocationId,
          quantity: qtyNum.toFixed(4),
          reservedQuantity: "0.0000",
          lastMovedAt: new Date(),
        });
      }

      // 7. Log Immutable Stock Movement (Ledger Audit Record)
      await executor.insert(stockMovements).values({
        productId: item.productId,
        sourceLocationId: item.sourceLocationId,
        destinationLocationId: item.destinationLocationId,
        quantity: qtyNum.toFixed(4),
        movementType: input.movementType ?? "TRANSFER",
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: input.createdBy ?? null,
      });
    }
  }

  /**
   * Authoritative Inventory Method: Resolves current system stock balance for a product at a location.
   */
  static async getStockBalance(
    productId: string,
    locationId: string,
    txContext?: any
  ): Promise<number> {
    const executor = txContext ?? db;
    const [balance] = await executor
      .select()
      .from(stockBalances)
      .where(
        and(
          eq(stockBalances.productId, productId),
          eq(stockBalances.locationId, locationId)
        )
      )
      .limit(1);

    return balance ? parseFloat(balance.quantity) : 0;
  }

  /**
   * Authoritative Inventory Method: Adjusts stock balance to match physical count.
   * Calculates difference (countedQuantity - currentStock), updates stock balance,
   * and logs immutable audit record in stock_movements.
   */
  static async adjustStock(
    input: AdjustStockInput,
    txContext?: any
  ): Promise<void> {
    const executor = txContext ?? db;

    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided for inventory adjustment", 400);
    }

    for (const item of input.items) {
      const countedQtyNum = parseFloat(item.countedQuantity.toString());
      if (isNaN(countedQtyNum) || countedQtyNum < 0) {
        throw new AppError(`Invalid counted quantity '${item.countedQuantity}' for stock adjustment`, 400);
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

      // 2. Verify Location existence
      const [loc] = await executor
        .select()
        .from(locations)
        .where(eq(locations.id, item.locationId))
        .limit(1);

      if (!loc) {
        throw new LocationNotFoundError(item.locationId);
      }

      // 3. Fetch current stock balance (with row lock if within transaction)
      const query = executor
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, item.productId),
            eq(stockBalances.locationId, item.locationId)
          )
        );

      const balanceQuery = txContext ? query.for("update").limit(1) : query.limit(1);
      const [existingBalance] = await balanceQuery;

      const currentQty = existingBalance ? parseFloat(existingBalance.quantity) : 0;
      const difference = countedQtyNum - currentQty;

      // 4. Update / Upsert Stock Balance to match physical counted quantity
      if (existingBalance) {
        await executor
          .update(stockBalances)
          .set({
            quantity: countedQtyNum.toFixed(4),
            lastMovedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(stockBalances.id, existingBalance.id));
      } else {
        await executor.insert(stockBalances).values({
          productId: item.productId,
          locationId: item.locationId,
          quantity: countedQtyNum.toFixed(4),
          reservedQuantity: "0.0000",
          lastMovedAt: new Date(),
        });
      }

      // 5. Log Immutable Stock Movement (Ledger Audit Record) if non-zero quantity was adjusted
      if (Math.abs(difference) > 0) {
        let srcLocId: string | null = null;
        let destLocId: string | null = null;
        let moveQty = Math.abs(difference).toFixed(4);

        if (difference > 0) {
          destLocId = item.locationId;
        } else {
          srcLocId = item.locationId;
        }

        await executor.insert(stockMovements).values({
          productId: item.productId,
          sourceLocationId: srcLocId,
          destinationLocationId: destLocId,
          quantity: moveQty,
          movementType: input.movementType ?? "ADJUSTMENT",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          createdBy: input.createdBy ?? null,
        });
      }
    }
  }

}



