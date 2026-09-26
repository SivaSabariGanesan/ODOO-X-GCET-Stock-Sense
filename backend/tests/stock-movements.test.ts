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
import { StockLedgerService } from "../src/modules/stock-movements/service.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `ledger_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationAId = "";
let locationBId = "";
let uomId = "";
let product1Id = "";
let product2Id = "";

let receiptId = "";
let transferId = "";
let deliveryId = "";
let adjustmentId = "";

describe("StockSense Move History / Stock Ledger API Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ledger History Tester",
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

    // 2. Create prerequisite domain records
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Main Warehouse ${TEST_TIMESTAMP}`,
        shortCode: `WH${TEST_TIMESTAMP}`,
      })
      .returning();
    warehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Location A ${TEST_TIMESTAMP}`,
        fullPath: `WH${TEST_TIMESTAMP}/LocA`,
        locationType: "internal",
      })
      .returning();
    locationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Location B ${TEST_TIMESTAMP}`,
        fullPath: `WH${TEST_TIMESTAMP}/LocB`,
        locationType: "internal",
      })
      .returning();
    locationBId = locB.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Kilogram ${TEST_TIMESTAMP}`,
        abbreviation: `kg${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomId = uom.id;

    const [p1] = await db
      .insert(products)
      .values({
        sku: `STEEL${TEST_TIMESTAMP}`,
        name: `Steel Bar ${TEST_TIMESTAMP}`,
        uomId,
      })
      .returning();
    product1Id = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        sku: `ALUM${TEST_TIMESTAMP}`,
        name: `Aluminum Sheet ${TEST_TIMESTAMP}`,
        uomId,
      })
      .returning();
    product2Id = p2.id;

    // 3. Execute operational lifecycle to generate real ledger entries
    // Step 3a: Receipt + Process (+100 Steel Bar into Location A)
    const recRes = await app.request("/api/receipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        supplierName: `SteelCo Supplier ${TEST_TIMESTAMP}`,
        warehouseId,
        defaultLocationId: locationAId,
        notes: "Initial inventory receipt for history testing",
        items: [{ productId: product1Id, quantity: 100, unitPrice: 15.5 }],
      }),
    });
    const recData = await recRes.json();
    receiptId = recData.data.id;

    const procRecRes = await app.request(`/api/receipts/${receiptId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(procRecRes.status).toBe(200);

    // Step 3b: Internal Transfer + Process (40 Steel Bar from Location A to Location B)
    const trfRes = await app.request("/api/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sourceLocationId: locationAId,
        destinationLocationId: locationBId,
        notes: "Transfer steel from loc A to B",
        items: [{ productId: product1Id, quantity: 40 }],
      }),
    });
    const trfData = await trfRes.json();
    transferId = trfData.data.id;

    const procTrfRes = await app.request(`/api/transfers/${transferId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(procTrfRes.status).toBe(200);

    // Step 3c: Delivery + Process (20 Steel Bar out of Location B)
    const delRes = await app.request("/api/deliveries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId,
        customerName: "Test Customer Inc",
        items: [{ productId: product1Id, quantity: 20, sourceLocationId: locationBId }],
      }),
    });
    const delData = await delRes.json();
    deliveryId = delData.data.id;

    const procDelRes = await app.request(`/api/deliveries/${deliveryId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(procDelRes.status).toBe(200);

    // Step 3d: Inventory Adjustment + Process (-3 Steel Bar at Location B: count 17 instead of 20)
    const adjRes = await app.request("/api/adjustments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        locationId: locationBId,
        reason: "Cycle count damage deduction",
        items: [{ productId: product1Id, countedQuantity: 17 }],
      }),
    });
    const adjData = await adjRes.json();
    adjustmentId = adjData.data.id;

    const procAdjRes = await app.request(`/api/adjustments/${adjustmentId}/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(procAdjRes.status).toBe(200);
  });

  afterAll(async () => {
    // Cleanup created test records
    await db.delete(stockMovements).where(inArray(stockMovements.productId, [product1Id, product2Id]));
    await db.delete(stockBalances).where(inArray(stockBalances.productId, [product1Id, product2Id]));

    if (adjustmentId) {
      await db.delete(inventoryAdjustmentItems).where(eq(inventoryAdjustmentItems.adjustmentId, adjustmentId));
      await db.delete(inventoryAdjustments).where(eq(inventoryAdjustments.id, adjustmentId));
    }

    if (deliveryId) {
      await db.delete(deliveryItems).where(eq(deliveryItems.deliveryId, deliveryId));
      await db.delete(deliveries).where(eq(deliveries.id, deliveryId));
    }

    if (transferId) {
      await db.delete(internalTransferItems).where(eq(internalTransferItems.transferId, transferId));
      await db.delete(internalTransfers).where(eq(internalTransfers.id, transferId));
    }

    if (receiptId) {
      await db.delete(receiptItems).where(eq(receiptItems.receiptId, receiptId));
      await db.delete(receipts).where(eq(receipts.id, receiptId));
    }

    await db.delete(products).where(inArray(products.id, [product1Id, product2Id]));
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    await db.delete(locations).where(inArray(locations.id, [locationAId, locationBId]));
    await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/stock-movements", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Listing & Pagination
  // -------------------------------------------------------------------------
  it("lists all stock movements with default pagination and newest-first ordering", async () => {
    const res = await app.request("/api/stock-movements?limit=10", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(4);
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    expect(body.pagination.totalPages).toBeGreaterThanOrEqual(1);

    // Verify ordering: newest created timestamp first
    const dates = body.data.map((m: any) => new Date(m.createdAt).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  it("handles pagination offset correctly (page 1 vs page 2)", async () => {
    const resPage1 = await app.request("/api/stock-movements?page=1&limit=2", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body1 = await resPage1.json();
    expect(body1.data.length).toBe(2);

    const resPage2 = await app.request("/api/stock-movements?page=2&limit=2", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const body2 = await resPage2.json();

    expect(resPage2.status).toBe(200);
    expect(body2.pagination.page).toBe(2);
    // Ensure items on page 1 and page 2 do not overlap
    const idsPage1 = body1.data.map((m: any) => m.id);
    const idsPage2 = body2.data.map((m: any) => m.id);
    const overlap = idsPage1.filter((id: string) => idsPage2.includes(id));
    expect(overlap.length).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 3. Product Filtering & Convenience Endpoint
  // -------------------------------------------------------------------------
  it("filters stock movements by productId via query parameter", async () => {
    const res = await app.request(`/api/stock-movements?productId=${product1Id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(4);
    body.data.forEach((m: any) => {
      expect(m.productId).toBe(product1Id);
    });
  });

  it("returns movements for a specific product via /api/products/:productId/stock-movements", async () => {
    const res = await app.request(`/api/products/${product1Id}/stock-movements`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(4);
    body.data.forEach((m: any) => {
      expect(m.productId).toBe(product1Id);
      expect(m.product.name).toBe(`Steel Bar ${TEST_TIMESTAMP}`);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Location Filtering & Convenience Endpoint
  // -------------------------------------------------------------------------
  it("filters stock movements by locationId (matching source or destination)", async () => {
    const res = await app.request(`/api/stock-movements?locationId=${locationAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Receipt (+100 into Loc A) and Transfer (40 from Loc A to Loc B)
    expect(body.data.length).toBe(2);
    body.data.forEach((m: any) => {
      const isSource = m.sourceLocationId === locationAId;
      const isDest = m.destinationLocationId === locationAId;
      expect(isSource || isDest).toBeTrue();
    });
  });

  it("returns movements for a specific location via /api/locations/:locationId/stock-movements", async () => {
    const res = await app.request(`/api/locations/${locationBId}/stock-movements`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    // Transfer (to Loc B), Delivery (from Loc B), Adjustment (at Loc B)
    expect(body.data.length).toBe(3);
  });

  // -------------------------------------------------------------------------
  // 5. Movement Type & Reference Filtering
  // -------------------------------------------------------------------------
  it("filters stock movements by movementType (e.g. RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT)", async () => {
    const resReceipt = await app.request("/api/stock-movements?movementType=RECEIPT", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const bodyReceipt = await resReceipt.json();
    expect(bodyReceipt.data.length).toBeGreaterThanOrEqual(1);
    expect(bodyReceipt.data[0].movementType).toBe("RECEIPT");

    const resTransfer = await app.request("/api/stock-movements?movementType=TRANSFER", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const bodyTransfer = await resTransfer.json();
    expect(bodyTransfer.data.length).toBeGreaterThanOrEqual(1);
    expect(bodyTransfer.data[0].movementType).toBe("TRANSFER");
  });

  it("filters stock movements by referenceType and referenceId", async () => {
    const resRef = await app.request(
      `/api/stock-movements?referenceType=RECEIPT&referenceId=${receiptId}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(resRef.status).toBe(200);
    const body = await resRef.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].referenceType).toBe("RECEIPT");
    expect(body.data[0].referenceId).toBe(receiptId);
  });

  // -------------------------------------------------------------------------
  // 6. Date Range Filtering
  // -------------------------------------------------------------------------
  it("filters stock movements by date range (fromDate and toDate)", async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const tomorrow = new Date(Date.now() + 86400000).toISOString();

    const res = await app.request(
      `/api/stock-movements?fromDate=${yesterday}&toDate=${tomorrow}&productId=${product1Id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(4);
  });

  // -------------------------------------------------------------------------
  // 7. Movement Details Endpoint
  // -------------------------------------------------------------------------
  it("fetches single movement details by ID via GET /api/stock-movements/:id", async () => {
    const listRes = await app.request(`/api/stock-movements?referenceId=${receiptId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listBody = await listRes.json();
    const movementId = listBody.data[0].id;

    const detailRes = await app.request(`/api/stock-movements/${movementId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json();
    expect(detailBody.data.id).toBe(movementId);
    expect(detailBody.data.product).toBeDefined();
    expect(detailBody.data.product.sku).toBe(`STEEL${TEST_TIMESTAMP}`);
  });

  it("returns HTTP 404 when movement ID does not exist", async () => {
    const nonExistentId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/stock-movements/${nonExistentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // 8. Read-Only Guarantee
  // -------------------------------------------------------------------------
  it("guarantees read-only behavior: calling ledger APIs does not mutate stock balances or ledger count", async () => {
    const countBeforeRes = await app.request(`/api/stock-movements?productId=${product1Id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const countBeforeBody = await countBeforeRes.json();
    const totalBefore = countBeforeBody.pagination.total;

    // Perform multiple read calls
    await app.request(`/api/stock-movements?productId=${product1Id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    await app.request(`/api/products/${product1Id}/stock-movements`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const countAfterRes = await app.request(`/api/stock-movements?productId=${product1Id}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const countAfterBody = await countAfterRes.json();
    const totalAfter = countAfterBody.pagination.total;

    expect(totalAfter).toBe(totalBefore);
  });

  // -------------------------------------------------------------------------
  // 9. StockLedgerService.recordMovement & Service Methods
  // -------------------------------------------------------------------------
  it("records an append-only stock movement using StockLedgerService.recordMovement", async () => {
    const movement = await StockLedgerService.recordMovement({
      productId: product2Id,
      destinationLocationId: locationAId,
      quantity: 50,
      movementType: "RECEIPT",
      referenceType: "RECEIPT",
      referenceId: receiptId,
      createdBy: userId,
    });

    expect(movement.id).toBeDefined();
    expect(movement.productId).toBe(product2Id);
    expect(parseFloat(movement.quantity)).toBe(50);

    const fetched = await StockLedgerService.getMovementById(movement.id);
    expect(fetched.id).toBe(movement.id);
    expect(fetched.product?.id).toBe(product2Id);
  });

  it("records transfer movements using StockLedgerService.recordTransferMovements", async () => {
    const movement = await StockLedgerService.recordTransferMovements({
      productId: product2Id,
      sourceLocationId: locationAId,
      destinationLocationId: locationBId,
      quantity: 15,
      referenceType: "INTERNAL_TRANSFER",
      referenceId: transferId,
      createdBy: userId,
    });

    expect(movement.movementType).toBe("TRANSFER");
    expect(movement.sourceLocationId).toBe(locationAId);
    expect(movement.destinationLocationId).toBe(locationBId);
  });

  it("verifies StockLedgerService.recordMovement does NOT update stock_balances", async () => {
    // Record movement directly via StockLedgerService
    await StockLedgerService.recordMovement({
      productId: product2Id,
      destinationLocationId: locationBId,
      quantity: 999,
      movementType: "RECEIPT",
      referenceType: "RECEIPT",
      referenceId: receiptId,
    });

    // Check stock_balances for product2Id at locationBId (should remain unchanged/non-existent)
    const [bal] = await db
      .select()
      .from(stockBalances)
      .where(eq(stockBalances.productId, product2Id));

    // Either no balance row exists or its quantity was untouched by recordMovement
    if (bal) {
      expect(parseFloat(bal.quantity)).not.toBe(999);
    } else {
      expect(bal).toBeUndefined();
    }
  });

  it("rollbacks ledger inserts when outer transaction fails", async () => {
    const testRefId = "11111111-2222-4333-8444-555555555555";
    try {
      await db.transaction(async (tx) => {
        await StockLedgerService.recordMovement(
          {
            productId: product1Id,
            destinationLocationId: locationAId,
            quantity: 10,
            movementType: "RECEIPT",
            referenceType: "RECEIPT",
            referenceId: testRefId,
          },
          tx
        );
        // Force transaction rollback
        throw new Error("Simulated outer transaction failure");
      });
    } catch (err: any) {
      expect(err.message).toBe("Simulated outer transaction failure");
    }

    // Verify ledger entry was rolled back
    const movements = await StockLedgerService.getMovementsByReference("RECEIPT", testRefId);
    expect(movements.length).toBe(0);
  });

  it("filters stock movements by warehouseId", async () => {
    const res = await app.request(`/api/stock-movements?warehouseId=${warehouseId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(4);
  });

  it("records movement via POST /api/stock-movements endpoint", async () => {
    const res = await app.request("/api/stock-movements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: product1Id,
        sourceLocationId: locationAId,
        quantity: 5,
        movementType: "DELIVERY",
        referenceType: "DELIVERY",
        referenceId: deliveryId,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toBeDefined();
    expect(body.data.movementType).toBe("DELIVERY");
  });

  it("enforces immutability: returns HTTP 405 for PUT, PATCH, DELETE requests", async () => {
    const putRes = await app.request("/api/stock-movements/some-id", {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(putRes.status).toBe(405);

    const patchRes = await app.request("/api/stock-movements/some-id", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(patchRes.status).toBe(405);

    const deleteRes = await app.request("/api/stock-movements/some-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(deleteRes.status).toBe(405);
  });
});

