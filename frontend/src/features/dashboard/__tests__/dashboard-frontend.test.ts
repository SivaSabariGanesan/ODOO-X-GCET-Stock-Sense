import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { stockBalances } from "../../../../../backend/src/db/schema/stock-balances.js";
import { stockMovements } from "../../../../../backend/src/db/schema/stock-movements.js";
import { reorderRules } from "../../../../../backend/src/db/schema/reorder-rules.js";
import { InventoryService } from "../../../../../backend/src/modules/inventory/service.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import {
  dashboardApi,
  transformToPendingOperations,
  transformToLowStockProducts,
  transformToRecentActivities,
  computeMovementSummary,
} from "../api";
import {
  ApiDashboardSummary,
  ApiLowStockItem,
  ApiDashboardWarehouseSummary,
} from "../types";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `dash_fe_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let testWarehouseId = "";
let testLocationAId = "";
let testLocationBId = "";
let testUomKgId = "";
let testUomPcsId = "";
let testProductKgId = "";
let testProductPcsId = "";
let testReorderRuleAId = "";
let testReorderRuleBId = "";

describe("Dashboard Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dashboard FE Tester",
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
    setAuthToken(authToken);

    // 2. Setup domain master data
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Dashboard FE Warehouse ${TEST_TIMESTAMP}`,
        shortCode: `WDF${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testWarehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Dash FE Loc A ${TEST_TIMESTAMP}`,
        fullPath: `WDF${TEST_TIMESTAMP}/LocA`,
        locationType: "internal",
      })
      .returning();
    testLocationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Dash FE Loc B ${TEST_TIMESTAMP}`,
        fullPath: `WDF${TEST_TIMESTAMP}/LocB`,
        locationType: "internal",
      })
      .returning();
    testLocationBId = locB.id;

    const [uomKg] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Kilogram DFE ${TEST_TIMESTAMP}`,
        abbreviation: `kg${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testUomKgId = uomKg.id;

    const [uomPcs] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Pieces DFE ${TEST_TIMESTAMP}`,
        abbreviation: `pc${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testUomPcsId = uomPcs.id;

    const [pKg] = await db
      .insert(products)
      .values({
        sku: `KGDFE${TEST_TIMESTAMP}`,
        name: `Steel Coil ${TEST_TIMESTAMP}`,
        uomId: testUomKgId,
      })
      .returning();
    testProductKgId = pKg.id;

    const [pPcs] = await db
      .insert(products)
      .values({
        sku: `PCSDFE${TEST_TIMESTAMP}`,
        name: `Circuit Board ${TEST_TIMESTAMP}`,
        uomId: testUomPcsId,
      })
      .returning();
    testProductPcsId = pPcs.id;

    // 3. Receive real inventory movement via InventoryService
    // 50 KG of Steel into Location A
    await InventoryService.receiveStock({
      items: [{ productId: testProductKgId, destinationLocationId: testLocationAId, quantity: 50 }],
      referenceType: "RECEIPT",
      referenceId: "00000000-0000-4000-8000-333333333333",
      createdBy: userId,
    });

    // 4. Create Reorder Rules:
    // Rule A: Product KG at Location A -> min 100 (current 50 -> shortage 50 = LOW STOCK!)
    const [rrA] = await db
      .insert(reorderRules)
      .values({
        productId: testProductKgId,
        locationId: testLocationAId,
        minQuantity: "100.0000",
        maxQuantity: "250.0000",
        reorderQty: "50.0000",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testReorderRuleAId = rrA.id;

    // Rule B: Product PCS at Location B -> min 20 (current 0 -> shortage 20 = OUT OF STOCK!)
    const [rrB] = await db
      .insert(reorderRules)
      .values({
        productId: testProductPcsId,
        locationId: testLocationBId,
        minQuantity: "20.0000",
        maxQuantity: "40.0000",
        reorderQty: "20.0000",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testReorderRuleBId = rrB.id;
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up test data
    const ruleIds = [testReorderRuleAId, testReorderRuleBId].filter(Boolean);
    if (ruleIds.length > 0) {
      await db.delete(reorderRules).where(inArray(reorderRules.id, ruleIds));
    }
    const prodIds = [testProductKgId, testProductPcsId].filter(Boolean);
    if (prodIds.length > 0) {
      await db.delete(stockMovements).where(inArray(stockMovements.productId, prodIds));
      await db.delete(stockBalances).where(inArray(stockBalances.productId, prodIds));
      await db.delete(products).where(inArray(products.id, prodIds));
    }
    const uomIds = [testUomKgId, testUomPcsId].filter(Boolean);
    if (uomIds.length > 0) {
      await db.delete(unitsOfMeasure).where(inArray(unitsOfMeasure.id, uomIds));
    }
    const locIds = [testLocationAId, testLocationBId].filter(Boolean);
    if (locIds.length > 0) {
      await db.delete(locations).where(inArray(locations.id, locIds));
    }
    if (testWarehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // ---------------------------------------------------------------------------
  // 1. Dashboard Summary Contract
  // ---------------------------------------------------------------------------
  it("1. Loads high-level summary metrics successfully via dashboardApi.getSummary()", async () => {
    setAuthToken(authToken);
    const summary = await dashboardApi.getSummary();

    expect(summary).toBeDefined();
    expect(typeof summary.totalProducts).toBe("number");
    expect(typeof summary.totalWarehouses).toBe("number");
    expect(typeof summary.totalLocations).toBe("number");
    expect(typeof summary.totalStockItems).toBe("number");
    expect(typeof summary.lowStockCount).toBe("number");
    expect(typeof summary.recentMovementsCount).toBe("number");
    expect(Array.isArray(summary.stockByUom)).toBe(true);

    expect(summary.totalProducts).toBeGreaterThanOrEqual(2);
    expect(summary.totalWarehouses).toBeGreaterThanOrEqual(1);
    expect(summary.totalLocations).toBeGreaterThanOrEqual(2);
    expect(summary.lowStockCount).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------------------
  // 2. Safe UOM Stock Breakdown
  // ---------------------------------------------------------------------------
  it("2. Returns safe UOM grouping without combining incompatible measurement units", async () => {
    setAuthToken(authToken);
    const summary = await dashboardApi.getSummary();

    const kgRow = summary.stockByUom.find((u) => u.uomId === testUomKgId);
    expect(kgRow).toBeDefined();
    expect(kgRow!.uomName).toContain("Kilogram");
    expect(parseFloat(kgRow!.totalQuantity)).toBe(50);
  });

  // ---------------------------------------------------------------------------
  // 3. Low Stock Items Contract
  // ---------------------------------------------------------------------------
  it("3. Returns products below reordering thresholds via dashboardApi.getLowStock()", async () => {
    setAuthToken(authToken);
    const res = await dashboardApi.getLowStock({ warehouseId: testWarehouseId });

    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(2);

    // Rule A check (Steel Coil: current 50, min 100 -> shortage 50)
    const itemA = res.data.find((i) => i.ruleId === testReorderRuleAId);
    expect(itemA).toBeDefined();
    expect(itemA!.productSku).toBe(`KGDFE${TEST_TIMESTAMP}`);
    expect(parseFloat(itemA!.minQuantity)).toBe(100);
    expect(parseFloat(itemA!.currentQuantity)).toBe(50);
    expect(parseFloat(itemA!.shortageQuantity)).toBe(50);

    // Rule B check (Circuit Board: current 0, min 20 -> shortage 20)
    const itemB = res.data.find((i) => i.ruleId === testReorderRuleBId);
    expect(itemB).toBeDefined();
    expect(itemB!.productSku).toBe(`PCSDFE${TEST_TIMESTAMP}`);
    expect(parseFloat(itemB!.currentQuantity)).toBe(0);
    expect(parseFloat(itemB!.shortageQuantity)).toBe(20);
  });

  // ---------------------------------------------------------------------------
  // 4. Movement History Contract
  // ---------------------------------------------------------------------------
  it("4. Returns stock movement history via dashboardApi.getMovements()", async () => {
    setAuthToken(authToken);
    const res = await dashboardApi.getMovements({ warehouseId: testWarehouseId });

    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(1);

    const movement = res.data[0];
    expect(movement.id).toBeDefined();
    expect(movement.movementType).toBe("RECEIPT");
    expect(parseFloat(movement.quantity)).toBe(50);
    expect(movement.product?.sku).toBe(`KGDFE${TEST_TIMESTAMP}`);
  });

  // ---------------------------------------------------------------------------
  // 5. Warehouses Summary Contract
  // ---------------------------------------------------------------------------
  it("5. Returns warehouse-level breakdown via dashboardApi.getWarehousesSummary()", async () => {
    setAuthToken(authToken);
    const list = await dashboardApi.getWarehousesSummary();

    expect(Array.isArray(list)).toBe(true);
    const wh = list.find((w) => w.id === testWarehouseId);
    expect(wh).toBeDefined();
    expect(wh!.locationCount).toBe(2);
    expect(wh!.lowStockCount).toBe(2);
    expect(Array.isArray(wh!.stockByUom)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Master Data Loaders
  // ---------------------------------------------------------------------------
  it("6. Master filter options load real warehouse and category records", async () => {
    setAuthToken(authToken);
    const warehouses = await dashboardApi.getWarehousesMaster();
    expect(Array.isArray(warehouses)).toBe(true);
    expect(warehouses.some((w) => w.id === testWarehouseId)).toBe(true);

    const categories = await dashboardApi.getCategoriesMaster();
    expect(Array.isArray(categories)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 7. Operational Queues Integration
  // ---------------------------------------------------------------------------
  it("7. Fetches operational queues for receipts, deliveries, transfers, and adjustments", async () => {
    setAuthToken(authToken);
    const receipts = await dashboardApi.getReceipts({ limit: 5 });
    const deliveries = await dashboardApi.getDeliveries({ limit: 5 });
    const transfers = await dashboardApi.getTransfers({ limit: 5 });
    const adjustments = await dashboardApi.getAdjustments({ limit: 5 });

    expect(Array.isArray(receipts)).toBe(true);
    expect(Array.isArray(deliveries)).toBe(true);
    expect(Array.isArray(transfers)).toBe(true);
    expect(Array.isArray(adjustments)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8. Transformation: Pending Operations Normalization
  // ---------------------------------------------------------------------------
  it("8. transformToPendingOperations normalizes backend records and status values", () => {
    const mockReceipt = {
      id: "rec-1",
      receiptNumber: "REC/2026/001",
      supplierName: "Apex Metals",
      supplierReference: "PO-100",
      warehouseId: testWarehouseId,
      status: "WAITING",
      createdAt: new Date().toISOString(),
      items: [{ id: "it-1", quantity: "150.0000", product: { id: "p1", name: "Alloy", sku: "AL-1" } }],
    };

    const mockDelivery = {
      id: "del-1",
      deliveryNumber: "DEL/2026/001",
      customerName: "Global Tech",
      customerReference: "SO-500",
      warehouseId: testWarehouseId,
      status: "READY",
      createdAt: new Date().toISOString(),
      items: [{ id: "it-2", quantity: "25.0000", product: { id: "p2", name: "Board", sku: "BD-1" } }],
    };

    const ops = transformToPendingOperations([mockReceipt], [mockDelivery], [], []);
    expect(ops.length).toBe(2);

    const recOp = ops.find((o) => o.type === "receipt");
    expect(recOp).toBeDefined();
    expect(recOp!.reference).toBe("REC/2026/001");
    expect(recOp!.status).toBe("waiting");
    expect(recOp!.totalUnits).toBe(150);

    const delOp = ops.find((o) => o.type === "delivery");
    expect(delOp).toBeDefined();
    expect(delOp!.reference).toBe("DEL/2026/001");
    expect(delOp!.status).toBe("ready");
    expect(delOp!.priority).toBe("urgent");
    expect(delOp!.totalUnits).toBe(25);
  });

  // ---------------------------------------------------------------------------
  // 9. Transformation: Low Stock Products Out-of-Stock Categorization
  // ---------------------------------------------------------------------------
  it("9. transformToLowStockProducts categorizes out_of_stock vs low_stock accurately", () => {
    const items: ApiLowStockItem[] = [
      {
        ruleId: "r1",
        productId: "p1",
        productName: "Item Low",
        productSku: "SKU-LOW",
        uom: { id: "u1", name: "pcs", abbreviation: "pcs" },
        warehouse: { id: "w1", name: "Warehouse 1", shortCode: "WH01" },
        location: { id: "l1", name: "Bin A", fullPath: "WH01/BinA" },
        minQuantity: "20.0000",
        maxQuantity: "50.0000",
        reorderQty: "30.0000",
        currentQuantity: "5.0000",
        reservedQuantity: "0.0000",
        availableQuantity: "5.0000",
        shortageQuantity: "15.0000",
      },
      {
        ruleId: "r2",
        productId: "p2",
        productName: "Item Empty",
        productSku: "SKU-EMPTY",
        uom: { id: "u2", name: "pcs", abbreviation: "pcs" },
        warehouse: { id: "w1", name: "Warehouse 1", shortCode: "WH01" },
        location: { id: "l2", name: "Bin B", fullPath: "WH01/BinB" },
        minQuantity: "10.0000",
        maxQuantity: "30.0000",
        reorderQty: "20.0000",
        currentQuantity: "0.0000",
        reservedQuantity: "0.0000",
        availableQuantity: "0.0000",
        shortageQuantity: "10.0000",
      },
    ];

    const products = transformToLowStockProducts(items);
    expect(products.length).toBe(2);

    const low = products.find((p) => p.sku === "SKU-LOW");
    expect(low!.status).toBe("low_stock");
    expect(low!.onHand).toBe(5);

    const empty = products.find((p) => p.sku === "SKU-EMPTY");
    expect(empty!.status).toBe("out_of_stock");
    expect(empty!.onHand).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 10. Transformation: Recent Activity Items
  // ---------------------------------------------------------------------------
  it("10. transformToRecentActivities creates formatted activities with time labels", () => {
    const rawMoves: any[] = [
      {
        id: "m-1",
        productId: testProductKgId,
        quantity: "50.0000",
        movementType: "RECEIPT",
        referenceType: "RECEIPT",
        referenceId: "00000000-0000-4000-8000-333333333333",
        createdAt: new Date().toISOString(),
        product: { id: testProductKgId, name: "Steel Coil", sku: "KGDFE" },
      },
    ];

    const activities = transformToRecentActivities(rawMoves);
    expect(activities.length).toBe(1);
    expect(activities[0].type).toBe("receipt");
    expect(activities[0].units).toBe(50);
    expect(activities[0].relativeTime).toBeDefined();
    expect(activities[0].status).toBe("done");
  });

  // ---------------------------------------------------------------------------
  // 11. Computation: Movement Velocity & Net Change
  // ---------------------------------------------------------------------------
  it("11. computeMovementSummary computes inbound, outbound, and net velocity accurately", () => {
    const rawMoves: any[] = [
      { quantity: "100.0000", movementType: "RECEIPT" },
      { quantity: "50.0000", movementType: "RECEIPT" },
      { quantity: "80.0000", movementType: "DELIVERY" },
      { quantity: "30.0000", movementType: "TRANSFER" },
      { quantity: "5.0000", movementType: "ADJUSTMENT" },
    ];

    const summary = computeMovementSummary(rawMoves, []);
    expect(summary.inboundUnits).toBe(150);
    expect(summary.inboundCount).toBe(2);
    expect(summary.outboundUnits).toBe(80);
    expect(summary.outboundCount).toBe(1);
    expect(summary.internalUnits).toBe(30);
    expect(summary.adjustmentsUnits).toBe(5);
    expect(summary.netChange).toBe(70); // 150 - 80 = +70
  });

  // ---------------------------------------------------------------------------
  // 12. Warehouse Server-Side Filtering
  // ---------------------------------------------------------------------------
  it("12. Warehouse filter restricts low stock items to matching warehouse", async () => {
    setAuthToken(authToken);
    const res = await dashboardApi.getLowStock({ warehouseId: testWarehouseId });
    expect(res.data.every((i) => i.warehouse.id === testWarehouseId)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 13. Search Server-Side Filtering
  // ---------------------------------------------------------------------------
  it("13. Search query filters low stock items by SKU or product name", async () => {
    setAuthToken(authToken);
    const res = await dashboardApi.getLowStock({ search: `KGDFE${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);
    expect(res.data[0].productSku).toBe(`KGDFE${TEST_TIMESTAMP}`);
  });

  // ---------------------------------------------------------------------------
  // 14. Read-Only Protection (HTTP 405)
  // ---------------------------------------------------------------------------
  it("14. Dashboard endpoints enforce read-only protection (HTTP 405 on POST/PATCH/DELETE)", async () => {
    const postRes = await app.request("/api/dashboard/summary", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(postRes.status).toBe(405);

    const patchRes = await app.request("/api/dashboard/summary", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(patchRes.status).toBe(405);

    const deleteRes = await app.request("/api/dashboard/summary", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(deleteRes.status).toBe(405);
  });

  // ---------------------------------------------------------------------------
  // 15. Authentication Security (HTTP 401)
  // ---------------------------------------------------------------------------
  it("15. Unauthenticated requests to dashboard endpoints reject with HTTP 401", async () => {
    clearAuthToken();
    try {
      await dashboardApi.getSummary();
      expect(true).toBe(false); // should throw
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    }
  });

  // ---------------------------------------------------------------------------
  // 16. apiClient Bearer Header Injection
  // ---------------------------------------------------------------------------
  it("16. apiClient automatically injects valid Authorization Bearer header", async () => {
    setAuthToken(authToken);
    const summary = await dashboardApi.getSummary();
    expect(summary).toBeDefined();
    expect(summary.totalProducts).toBeGreaterThanOrEqual(1);
  });
});
