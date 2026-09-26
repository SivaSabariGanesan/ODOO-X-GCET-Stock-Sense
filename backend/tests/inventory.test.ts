import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { receipts } from "../src/db/schema/receipts.js";
import { receiptItems } from "../src/db/schema/receipt-items.js";
import { deliveries } from "../src/db/schema/deliveries.js";
import { deliveryItems } from "../src/db/schema/delivery-items.js";
import { internalTransfers } from "../src/db/schema/internal-transfers.js";
import { internalTransferItems } from "../src/db/schema/internal-transfer-items.js";
import { inventoryAdjustments } from "../src/db/schema/inventory-adjustments.js";
import { inventoryAdjustmentItems } from "../src/db/schema/inventory-adjustment-items.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { InventoryService } from "../src/modules/inventory/service.js";
import { StockBalanceService } from "../src/modules/stock-balances/service.js";
import { StockLedgerService } from "../src/modules/stock-movements/service.js";
import { InsufficientStockError, AppError } from "../src/lib/errors.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `inv_tester_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationAId = "";
let locationBId = "";
let uomId = "";
let productId = "";

describe("StockSense InventoryService Integration & Orchestration Module", () => {
  beforeAll(async () => {
    // 1. Setup test user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Inventory Orchestrator Tester",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: "manager",
      }),
    });
    const regData = await regRes.json();
    userId = regData.user.id;

    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;

    // 2. Setup domain prerequisites
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Inv Warehouse ${TEST_TIMESTAMP}`,
        shortCode: `WHI${TEST_TIMESTAMP}`,
      })
      .returning();
    warehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Inv Loc A ${TEST_TIMESTAMP}`,
        fullPath: `WHI${TEST_TIMESTAMP}/LocA`,
        locationType: "internal",
      })
      .returning();
    locationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Inv Loc B ${TEST_TIMESTAMP}`,
        fullPath: `WHI${TEST_TIMESTAMP}/LocB`,
        locationType: "internal",
      })
      .returning();
    locationBId = locB.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Unit ${TEST_TIMESTAMP}`,
        abbreviation: `u${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        sku: `INVPROD${TEST_TIMESTAMP}`,
        name: `Inventory Test Item ${TEST_TIMESTAMP}`,
        uomId,
      })
      .returning();
    productId = prod.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await db.delete(stockMovements).where(eq(stockMovements.productId, productId));
    await db.delete(stockBalances).where(eq(stockBalances.productId, productId));
    await db.delete(receiptItems).where(eq(receiptItems.productId, productId));
    await db.delete(receipts).where(eq(receipts.warehouseId, warehouseId));
    await db.delete(deliveryItems).where(eq(deliveryItems.productId, productId));
    await db.delete(deliveries).where(eq(deliveries.warehouseId, warehouseId));
    await db.delete(internalTransferItems).where(eq(internalTransferItems.productId, productId));
    await db.delete(internalTransfers).where(inArray(internalTransfers.sourceLocationId, [locationAId, locationBId]));
    await db.delete(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.productId, productId));
    await db.delete(inventoryAdjustments).where(inArray(inventoryAdjustments.locationId, [locationAId, locationBId]));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    await db.delete(locations).where(inArray(locations.id, [locationAId, locationBId]));
    await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Receive Stock Orchestration
  // -------------------------------------------------------------------------
  it("orchestrates receiveStock: updates StockBalance and records StockLedger within transaction", async () => {
    const testRefId = "00000000-1111-4000-8000-000000000001";
    await db.transaction(async (tx) => {
      await InventoryService.receiveStock(
        {
          items: [
            {
              productId,
              destinationLocationId: locationAId,
              quantity: 200,
            },
          ],
          referenceType: "RECEIPT",
          referenceId: testRefId,
          createdBy: userId,
        },
        tx
      );
    });

    // Verify StockBalance updated
    const balance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(balance.quantity)).toBe(200);

    // Verify StockLedger entry recorded
    const movements = await StockLedgerService.getMovementsByReference("RECEIPT", testRefId);
    expect(movements.length).toBe(1);
    expect(movements[0].productId).toBe(productId);
    expect(parseFloat(movements[0].quantity)).toBe(200);
  });

  // -------------------------------------------------------------------------
  // 2. Deliver Stock Orchestration
  // -------------------------------------------------------------------------
  it("orchestrates deliverStock: decreases StockBalance and records StockLedger within transaction", async () => {
    const testRefId = "00000000-2222-4000-8000-000000000002";
    await db.transaction(async (tx) => {
      await InventoryService.deliverStock(
        {
          items: [
            {
              productId,
              sourceLocationId: locationAId,
              quantity: 50,
            },
          ],
          referenceType: "DELIVERY",
          referenceId: testRefId,
          createdBy: userId,
        },
        tx
      );
    });

    // Verify StockBalance decreased (200 - 50 = 150)
    const balance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(balance.quantity)).toBe(150);

    // Verify StockLedger entry recorded
    const movements = await StockLedgerService.getMovementsByReference("DELIVERY", testRefId);
    expect(movements.length).toBe(1);
    expect(parseFloat(movements[0].quantity)).toBe(50);
  });

  it("rejects deliverStock when requested quantity exceeds available stock", async () => {
    const testRefId = "00000000-2222-4000-8000-000000000003";
    let thrownError: any = null;

    try {
      await db.transaction(async (tx) => {
        await InventoryService.deliverStock(
          {
            items: [
              {
                productId,
                sourceLocationId: locationAId,
                quantity: 9999, // Exceeds available 150
              },
            ],
            referenceType: "DELIVERY",
            referenceId: testRefId,
          },
          tx
        );
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(InsufficientStockError);

    // Verify StockBalance remains unchanged (150)
    const balance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(balance.quantity)).toBe(150);

    // Verify no ledger entry created
    const movements = await StockLedgerService.getMovementsByReference("DELIVERY", testRefId);
    expect(movements.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. Internal Transfer Orchestration
  // -------------------------------------------------------------------------
  it("orchestrates transferStock: updates source & destination StockBalance and records StockLedger", async () => {
    const testRefId = "00000000-3333-4000-8000-000000000004";
    await db.transaction(async (tx) => {
      await InventoryService.transferStock(
        {
          items: [
            {
              productId,
              sourceLocationId: locationAId,
              destinationLocationId: locationBId,
              quantity: 40,
            },
          ],
          referenceType: "INTERNAL_TRANSFER",
          referenceId: testRefId,
          createdBy: userId,
        },
        tx
      );
    });

    // Verify Source Balance (150 - 40 = 110)
    const srcBalance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(srcBalance.quantity)).toBe(110);

    // Verify Destination Balance (0 + 40 = 40)
    const destBalance = await StockBalanceService.getBalance(productId, locationBId);
    expect(parseFloat(destBalance.quantity)).toBe(40);

    // Verify StockLedger entry recorded
    const movements = await StockLedgerService.getMovementsByReference("INTERNAL_TRANSFER", testRefId);
    expect(movements.length).toBe(1);
    expect(movements[0].sourceLocationId).toBe(locationAId);
    expect(movements[0].destinationLocationId).toBe(locationBId);
  });

  it("rejects transferStock when source location equals destination location", async () => {
    let thrownError: any = null;
    try {
      await InventoryService.transferStock({
        items: [
          {
            productId,
            sourceLocationId: locationAId,
            destinationLocationId: locationAId,
            quantity: 10,
          },
        ],
        referenceType: "INTERNAL_TRANSFER",
        referenceId: "00000000-3333-4000-8000-000000000005",
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(AppError);
  });

  // -------------------------------------------------------------------------
  // 4. Inventory Adjustment Orchestration
  // -------------------------------------------------------------------------
  it("orchestrates adjustStock: sets StockBalance to physical count and records StockLedger difference", async () => {
    const testRefId = "00000000-4444-4000-8000-000000000006";
    // System = 110, physical count = 125 (difference = +15)
    await db.transaction(async (tx) => {
      await InventoryService.adjustStock(
        {
          items: [
            {
              productId,
              locationId: locationAId,
              countedQuantity: 125,
            },
          ],
          referenceType: "INVENTORY_ADJUSTMENT",
          referenceId: testRefId,
          createdBy: userId,
        },
        tx
      );
    });

    // Verify StockBalance updated to physical count (125)
    const balance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(balance.quantity)).toBe(125);

    // Verify StockLedger recorded movement (+15 into locationAId)
    const movements = await StockLedgerService.getMovementsByReference("INVENTORY_ADJUSTMENT", testRefId);
    expect(movements.length).toBe(1);
    expect(movements[0].destinationLocationId).toBe(locationAId);
    expect(parseFloat(movements[0].quantity)).toBe(15);
  });

  // -------------------------------------------------------------------------
  // 5. Multi-Item Transaction Atomic Rollback
  // -------------------------------------------------------------------------
  it("guarantees atomic rollback on multi-item failure (no partial stock balance or ledger commits)", async () => {
    const testRefId = "00000000-5555-4000-8000-000000000007";
    let thrownError: any = null;

    try {
      await db.transaction(async (tx) => {
        await InventoryService.deliverStock(
          {
            items: [
              {
                productId,
                sourceLocationId: locationAId,
                quantity: 20, // Valid (125 available)
              },
              {
                productId,
                sourceLocationId: locationAId,
                quantity: 9999, // Invalid (exceeds stock)
              },
            ],
            referenceType: "DELIVERY",
            referenceId: testRefId,
          },
          tx
        );
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeDefined();

    // Verify locationAId stock balance remained 125 (line 1 was NOT committed)
    const balance = await StockBalanceService.getBalance(productId, locationAId);
    expect(parseFloat(balance.quantity)).toBe(125);

    // Verify no ledger entries exist for testRefId
    const movements = await StockLedgerService.getMovementsByReference("DELIVERY", testRefId);
    expect(movements.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 6. Idempotency & Operation Workflow Integration
  // -------------------------------------------------------------------------
  it("prevents double processing of the same operation record", async () => {
    // Create receipt
    const recRes = await app.request("/api/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId,
        defaultLocationId: locationAId,
        items: [{ productId, quantity: 50 }],
      }),
    });
    const recData = await recRes.json();
    const receiptId = recData.data.id;

    // Process 1st time (succeeds)
    const proc1Res = await app.request(`/api/receipts/${receiptId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(proc1Res.status).toBe(200);

    // Process 2nd time (rejected with HTTP 409 Conflict)
    const proc2Res = await app.request(`/api/receipts/${receiptId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(proc2Res.status).toBe(409);
  });
});
