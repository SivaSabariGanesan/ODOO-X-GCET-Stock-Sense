import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { reorderRules } from "../src/db/schema/reorder-rules.js";
import { InventoryService } from "../src/modules/inventory/service.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `dash_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationAId = "";
let locationBId = "";
let uomKgId = "";
let uomPcsId = "";
let productKgId = "";
let productPcsId = "";
let reorderRuleAId = "";
let reorderRuleBId = "";

describe("StockSense Dashboard API Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dashboard Tester",
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
        name: `Dashboard Main Warehouse ${TEST_TIMESTAMP}`,
        shortCode: `WHD${TEST_TIMESTAMP}`,
      })
      .returning();
    warehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Dash Location A ${TEST_TIMESTAMP}`,
        fullPath: `WHD${TEST_TIMESTAMP}/LocA`,
        locationType: "internal",
      })
      .returning();
    locationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `Dash Location B ${TEST_TIMESTAMP}`,
        fullPath: `WHD${TEST_TIMESTAMP}/LocB`,
        locationType: "internal",
      })
      .returning();
    locationBId = locB.id;

    const [uomKg] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Kilogram ${TEST_TIMESTAMP}`,
        abbreviation: `kg${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomKgId = uomKg.id;

    const [uomPcs] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Pieces ${TEST_TIMESTAMP}`,
        abbreviation: `pcs${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomPcsId = uomPcs.id;

    const [pKg] = await db
      .insert(products)
      .values({
        sku: `KGPROD${TEST_TIMESTAMP}`,
        name: `Heavy Steel Bar ${TEST_TIMESTAMP}`,
        uomId: uomKgId,
      })
      .returning();
    productKgId = pKg.id;

    const [pPcs] = await db
      .insert(products)
      .values({
        sku: `PCSPROD${TEST_TIMESTAMP}`,
        name: `Widget Component ${TEST_TIMESTAMP}`,
        uomId: uomPcsId,
      })
      .returning();
    productPcsId = pPcs.id;

    // 3. Receive stock via InventoryService
    // Product KG into Location A (100 KG)
    await InventoryService.receiveStock({
      items: [{ productId: productKgId, destinationLocationId: locationAId, quantity: 100 }],
      referenceType: "RECEIPT",
      referenceId: "00000000-0000-4000-8000-111111111111",
      createdBy: userId,
    });

    // Product PCS into Location B (5 PCS)
    await InventoryService.receiveStock({
      items: [{ productId: productPcsId, destinationLocationId: locationBId, quantity: 5 }],
      referenceType: "RECEIPT",
      referenceId: "00000000-0000-4000-8000-222222222222",
      createdBy: userId,
    });

    // 4. Create Reorder Rules
    // Rule 1: Product KG at Location A -> Min 150 (Current 100 -> LOW STOCK!)
    const [rrA] = await db
      .insert(reorderRules)
      .values({
        productId: productKgId,
        locationId: locationAId,
        minQuantity: "150.0000",
        maxQuantity: "300.0000",
        reorderQty: "50.0000",
      })
      .returning();
    reorderRuleAId = rrA.id;

    // Rule 2: Product PCS at Location A -> Min 50 (Current 0 - missing balance row -> LOW STOCK!)
    const [rrB] = await db
      .insert(reorderRules)
      .values({
        productId: productPcsId,
        locationId: locationAId,
        minQuantity: "50.0000",
        maxQuantity: "100.0000",
        reorderQty: "20.0000",
      })
      .returning();
    reorderRuleBId = rrB.id;
  });

  afterAll(async () => {
    // Cleanup test records
    await db.delete(reorderRules).where(inArray(reorderRules.id, [reorderRuleAId, reorderRuleBId]));
    await db.delete(stockMovements).where(inArray(stockMovements.productId, [productKgId, productPcsId]));
    await db.delete(stockBalances).where(inArray(stockBalances.productId, [productKgId, productPcsId]));
    await db.delete(products).where(inArray(products.id, [productKgId, productPcsId]));
    await db.delete(unitsOfMeasure).where(inArray(unitsOfMeasure.id, [uomKgId, uomPcsId]));
    await db.delete(locations).where(inArray(locations.id, [locationAId, locationBId]));
    await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Authentication Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests to dashboard endpoints with HTTP 401", async () => {
    const endpoints = [
      "/api/dashboard/summary",
      "/api/dashboard/stock",
      "/api/dashboard/low-stock",
      "/api/dashboard/movements",
      "/api/dashboard/warehouses",
    ];

    for (const ep of endpoints) {
      const res = await app.request(ep, { method: "GET" });
      expect(res.status).toBe(401);
    }
  });

  // -------------------------------------------------------------------------
  // 2. Summary API
  // -------------------------------------------------------------------------
  it("returns high-level domain & stock summary metrics via GET /api/dashboard/summary", async () => {
    const res = await app.request("/api/dashboard/summary", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    const data = body.data;

    expect(data.totalProducts).toBeGreaterThanOrEqual(2);
    expect(data.totalWarehouses).toBeGreaterThanOrEqual(1);
    expect(data.totalLocations).toBeGreaterThanOrEqual(2);
    expect(data.totalStockItems).toBeGreaterThanOrEqual(2);
    expect(data.lowStockCount).toBeGreaterThanOrEqual(2);
    expect(data.recentMovementsCount).toBeGreaterThanOrEqual(2);
    expect(data.stockByUom).toBeArray();

    // Verify safe UOM grouping (KG and PCS separated)
    const kgUom = data.stockByUom.find((u: any) => u.uomId === uomKgId);
    expect(kgUom).toBeDefined();
    expect(parseFloat(kgUom.totalQuantity)).toBe(100);

    const pcsUom = data.stockByUom.find((u: any) => u.uomId === uomPcsId);
    expect(pcsUom).toBeDefined();
    expect(parseFloat(pcsUom.totalQuantity)).toBe(5);
  });

  // -------------------------------------------------------------------------
  // 3. Low Stock API
  // -------------------------------------------------------------------------
  it("returns products below reordering rules via GET /api/dashboard/low-stock", async () => {
    const res = await app.request(`/api/dashboard/low-stock?warehouseId=${warehouseId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination).toBeDefined();
    expect(body.data.length).toBe(2);

    // Rule 1 check: Product KG at Location A (100 < 150 -> shortage = 50)
    const itemA = body.data.find((i: any) => i.ruleId === reorderRuleAId);
    expect(itemA).toBeDefined();
    expect(itemA.productName).toBe(`Heavy Steel Bar ${TEST_TIMESTAMP}`);
    expect(parseFloat(itemA.minQuantity)).toBe(150);
    expect(parseFloat(itemA.currentQuantity)).toBe(100);
    expect(parseFloat(itemA.shortageQuantity)).toBe(50);

    // Rule 2 check: Product PCS at Location A (missing balance row -> currentQty 0 < min 50 -> shortage 50)
    const itemB = body.data.find((i: any) => i.ruleId === reorderRuleBId);
    expect(itemB).toBeDefined();
    expect(itemB.productName).toBe(`Widget Component ${TEST_TIMESTAMP}`);
    expect(parseFloat(itemB.currentQuantity)).toBe(0);
    expect(parseFloat(itemB.shortageQuantity)).toBe(50);
  });

  // -------------------------------------------------------------------------
  // 4. Stock Breakdown API
  // -------------------------------------------------------------------------
  it("returns paginated stock balance breakdown via GET /api/dashboard/stock", async () => {
    const res = await app.request(`/api/dashboard/stock?warehouseId=${warehouseId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination).toBeDefined();
    expect(body.data.length).toBe(2);
  });

  // -------------------------------------------------------------------------
  // 5. Movements History API
  // -------------------------------------------------------------------------
  it("returns recent movement history via GET /api/dashboard/movements", async () => {
    const res = await app.request(`/api/dashboard/movements?warehouseId=${warehouseId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.data[0].movementType).toBe("RECEIPT");
  });

  // -------------------------------------------------------------------------
  // 6. Warehouses Summary API
  // -------------------------------------------------------------------------
  it("returns warehouse-level breakdown via GET /api/dashboard/warehouses", async () => {
    const res = await app.request("/api/dashboard/warehouses", {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();

    const wh = body.data.find((w: any) => w.id === warehouseId);
    expect(wh).toBeDefined();
    expect(wh.locationCount).toBe(2);
    expect(wh.totalStockItems).toBe(2);
    expect(wh.lowStockCount).toBe(2);
    expect(wh.stockByUom).toBeArray();
  });

  // -------------------------------------------------------------------------
  // 7. Read-Only Protection
  // -------------------------------------------------------------------------
  it("enforces read-only behavior: returns HTTP 405 for POST, PUT, PATCH, DELETE requests", async () => {
    const postRes = await app.request("/api/dashboard/summary", {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(postRes.status).toBe(405);

    const putRes = await app.request("/api/dashboard/summary", {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(putRes.status).toBe(405);

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
});
