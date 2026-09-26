import { StockBalanceService } from "../stock-balances/service";
import { StockLedgerService } from "../stock-movements/service";
import {
  ReceiveStockInput,
  DeliverStockInput,
  TransferStockInput,
  AdjustStockInput,
} from "./types";
import { AppError } from "../../lib/errors";

export class InventoryService {
  /**
   * Orchestrates stock receipts:
   * 1. Calls StockBalanceService.increaseStock for each item.
   * 2. Calls StockLedgerService.recordMovement for each item.
   * Runs atomically within caller's transaction context `txContext`.
   */
  static async receiveStock(
    input: ReceiveStockInput,
    txContext?: any
  ): Promise<void> {
    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided to receive into inventory", 400);
    }

    for (const item of input.items) {
      const qtyNum = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock receipt`, 400);
      }

      // 1. Mutate Stock Balance via StockBalanceService
      await StockBalanceService.increaseStock(
        {
          productId: item.productId,
          locationId: item.destinationLocationId,
          quantity: item.quantity,
        },
        txContext
      );

      // 2. Record Immutable Movement via StockLedgerService
      await StockLedgerService.recordMovement(
        {
          productId: item.productId,
          sourceLocationId: item.sourceLocationId ?? null,
          destinationLocationId: item.destinationLocationId,
          quantity: item.quantity,
          movementType: input.movementType ?? "RECEIPT",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          createdBy: input.createdBy ?? null,
        },
        txContext
      );
    }
  }

  /**
   * Orchestrates stock deliveries:
   * 1. Calls StockBalanceService.decreaseStock for each item (enforces stock availability).
   * 2. Calls StockLedgerService.recordMovement for each item.
   * Runs atomically within caller's transaction context `txContext`.
   */
  static async deliverStock(
    input: DeliverStockInput,
    txContext?: any
  ): Promise<void> {
    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided to deliver from inventory", 400);
    }

    for (const item of input.items) {
      const qtyNum = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock delivery`, 400);
      }

      // 1. Decrease Stock Balance via StockBalanceService
      await StockBalanceService.decreaseStock(
        {
          productId: item.productId,
          locationId: item.sourceLocationId,
          quantity: item.quantity,
        },
        txContext
      );

      // 2. Record Immutable Movement via StockLedgerService
      await StockLedgerService.recordMovement(
        {
          productId: item.productId,
          sourceLocationId: item.sourceLocationId,
          destinationLocationId: item.destinationLocationId ?? null,
          quantity: item.quantity,
          movementType: input.movementType ?? "DELIVERY",
          referenceType: input.referenceType,
          referenceId: input.referenceId,
          createdBy: input.createdBy ?? null,
        },
        txContext
      );
    }
  }

  /**
   * Orchestrates internal stock transfers:
   * 1. Calls StockBalanceService.transferStockPrimitive (decrements source, increments destination).
   * 2. Calls StockLedgerService.recordTransferMovements.
   * Runs atomically within caller's transaction context `txContext`.
   */
  static async transferStock(
    input: TransferStockInput,
    txContext?: any
  ): Promise<void> {
    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided for internal transfer", 400);
    }

    for (const item of input.items) {
      const qtyNum = typeof item.quantity === "number" ? item.quantity : parseFloat(item.quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        throw new AppError(`Invalid quantity '${item.quantity}' for stock transfer`, 400);
      }

      if (item.sourceLocationId === item.destinationLocationId) {
        throw new AppError("Source location and destination location must be different", 400);
      }

      // 1. Execute Stock Transfer Primitive via StockBalanceService
      await StockBalanceService.transferStockPrimitive(
        {
          productId: item.productId,
          sourceLocationId: item.sourceLocationId,
          destinationLocationId: item.destinationLocationId,
          quantity: item.quantity,
        },
        txContext
      );

      // 2. Record Transfer Movements via StockLedgerService
      await StockLedgerService.recordTransferMovements(
        {
          productId: item.productId,
          sourceLocationId: item.sourceLocationId,
          destinationLocationId: item.destinationLocationId,
          quantity: item.quantity,
          referenceType: input.referenceType ?? "INTERNAL_TRANSFER",
          referenceId: input.referenceId,
          createdBy: input.createdBy ?? null,
        },
        txContext
      );
    }
  }

  /**
   * Orchestrates physical stock adjustments:
   * 1. Resolves current stock balance via StockBalanceService.getBalance.
   * 2. Calculates difference (countedQuantity - systemQuantity).
   * 3. Calls StockBalanceService.setStock to update balance to physical count.
   * 4. Calls StockLedgerService.recordMovement if non-zero difference exists.
   * Runs atomically within caller's transaction context `txContext`.
   */
  static async adjustStock(
    input: AdjustStockInput,
    txContext?: any
  ): Promise<void> {
    if (!input.items || input.items.length === 0) {
      throw new AppError("No stock items provided for inventory adjustment", 400);
    }

    for (const item of input.items) {
      const countedQtyNum = typeof item.countedQuantity === "number" ? item.countedQuantity : parseFloat(item.countedQuantity);
      if (isNaN(countedQtyNum) || countedQtyNum < 0) {
        throw new AppError(`Invalid counted quantity '${item.countedQuantity}' for stock adjustment`, 400);
      }

      // 1. Get current balance via StockBalanceService
      const currentBalance = await StockBalanceService.getBalance(
        item.productId,
        item.locationId,
        txContext
      );
      const currentQtyNum = parseFloat(currentBalance.quantity);
      const difference = countedQtyNum - currentQtyNum;

      // 2. Set absolute balance via StockBalanceService
      await StockBalanceService.setStock(
        {
          productId: item.productId,
          locationId: item.locationId,
          quantity: countedQtyNum,
        },
        txContext
      );

      // 3. Record Stock Movement via StockLedgerService if non-zero adjustment
      if (Math.abs(difference) > 0.00001) {
        let srcLocId: string | null = null;
        let destLocId: string | null = null;
        const moveQty = Math.abs(difference).toFixed(4);

        if (difference > 0) {
          destLocId = item.locationId;
        } else {
          srcLocId = item.locationId;
        }

        await StockLedgerService.recordMovement(
          {
            productId: item.productId,
            sourceLocationId: srcLocId,
            destinationLocationId: destLocId,
            quantity: moveQty,
            movementType: input.movementType ?? "ADJUSTMENT",
            referenceType: input.referenceType,
            referenceId: input.referenceId,
            createdBy: input.createdBy ?? null,
          },
          txContext
        );
      }
    }
  }

  /**
   * Delegates current stock query to authoritative StockBalanceService
   */
  static async getStockBalance(
    productId: string,
    locationId: string,
    txContext?: any
  ): Promise<number> {
    const balance = await StockBalanceService.getBalance(productId, locationId, txContext);
    return parseFloat(balance.quantity);
  }
}
