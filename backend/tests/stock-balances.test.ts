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
import { StockBalanceService } from "../src/modules/stock-balances/service.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `bal_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let testWarehouseId = "";
let testLocationId1 = "";
let testLocationId2 = "";
let testUomId = "";
let testProductId = "";

let createdWarehouseIds: string[] = [];
let createdLocationIds: string[] = [];
let createdUomIds: string[] = [];
let createdProductIds: string[] = [];

describe("StockSense StockBalanceService & API Module", () => {
  beforeAll(async () => {
    // 1. Register test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "StockBalance Service Tester",
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

    // 2. Setup Warehouse & Locations
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Balance WH ${TEST_TIMESTAMP}`,
        shortCode: `WHB${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testWarehouseId = wh.id;
    createdWarehouseIds.push(wh.id);

    const [loc1] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Loc B1 ${TEST_TIMESTAMP}`,
        fullPath: `WHB${TEST_TIMESTAMP}/LocB1`,
      })
      .returning();
    testLocationId1 = loc1.id;
    createdLocationIds.push(loc1.id);

    const [loc2] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Loc B2 ${TEST_TIMESTAMP}`,
        fullPath: `WHB${TEST_TIMESTAMP}/LocB2`,
      })
      .returning();
    testLocationId2 = loc2.id;
    createdLocationIds.push(loc2.id);

    // 3. Setup UOM & Product
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Balance UOM ${TEST_TIMESTAMP}`,
        abbreviation: `bu${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testUomId = uom.id;
    createdUomIds.push(uom.id);

    const [prod] = await db
      .insert(products)
      .values({
        name: `Copper Ingot ${TEST_TIMESTAMP}`,
        sku: `SKU_BAL_${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductId = prod.id;
    createdProductIds.push(prod.id);
  });

  afterAll(async () => {
    // Cleanup in reverse foreign key order
    if (createdProductIds.length > 0) {
      await db.delete(stockBalances).where(inArray(stockBalances.productId, createdProductIds));
      await db.delete(products).where(inArray(products.id, createdProductIds));
    }
    if (createdUomIds.length > 0) {
      await db.delete(unitsOfMeasure).where(inArray(unitsOfMeasure.id, createdUomIds));
    }
    if (createdLocationIds.length > 0) {
      await db.delete(locations).where(inArray(locations.id, createdLocationIds));
    }
    if (createdWarehouseIds.length > 0) {
      await db.delete(warehouses).where(inArray(warehouses.id, createdWarehouseIds));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // -------------------------------------------------------------------------
  // 1. Get Balance
  // -------------------------------------------------------------------------
  it("returns zero-quantity default when no stock balance row exists yet", async () => {
    const bal = await StockBalanceService.getBalance(testProductId, testLocationId1);
    expect(bal).toBeDefined();
    expect(bal.productId).toBe(testProductId);
    expect(bal.locationId).toBe(testLocationId1);
    expect(bal.quantity).toBe("0.0000");
  });

  // -------------------------------------------------------------------------
  // 2. Increase Stock
  // -------------------------------------------------------------------------
  it("increases stock on a new balance row (0 + 100.5 = 100.5)", async () => {
    const record = await StockBalanceService.increaseStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 100.5,
    });

    expect(record).toBeDefined();
    expect(Number(record.quantity)).toBe(100.5);

    const check = await StockBalanceService.getBalance(testProductId, testLocationId1);
    expect(Number(check.quantity)).toBe(100.5);
  });

  it("increases stock on an existing balance row (100.5 + 25 = 125.5)", async () => {
    const record = await StockBalanceService.increaseStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 25,
    });

    expect(Number(record.quantity)).toBe(125.5);
  });

  it("rejects non-positive increase quantities", async () => {
    expect(
      StockBalanceService.increaseStock({
        productId: testProductId,
        locationId: testLocationId1,
        quantity: -10,
      })
    ).rejects.toThrow();
  });

  // -------------------------------------------------------------------------
  // 3. Decrease Stock
  // -------------------------------------------------------------------------
  it("decreases stock successfully (125.5 - 25.5 = 100)", async () => {
    const record = await StockBalanceService.decreaseStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 25.5,
    });

    expect(Number(record.quantity)).toBe(100);
  });

  it("rejects stock decrease exceeding available stock (Insufficient Stock)", async () => {
    expect(
      StockBalanceService.decreaseStock({
        productId: testProductId,
        locationId: testLocationId1,
        quantity: 500, // available is 100
      })
    ).rejects.toThrow("Insufficient stock");
  });

  // -------------------------------------------------------------------------
  // 4. Set Stock
  // -------------------------------------------------------------------------
  it("sets stock to an absolute physical count (100 -> 350)", async () => {
    const record = await StockBalanceService.setStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 350,
    });

    expect(Number(record.quantity)).toBe(350);
  });

  it("rejects negative set stock count", async () => {
    expect(
      StockBalanceService.setStock({
        productId: testProductId,
        locationId: testLocationId1,
        quantity: -5,
      })
    ).rejects.toThrow("cannot be negative");
  });

  // -------------------------------------------------------------------------
  // 5. Reserve & Unreserve Stock
  // -------------------------------------------------------------------------
  it("reserves stock quantity (350 total, reserve 50 -> available 300)", async () => {
    const record = await StockBalanceService.reserveStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 50,
    });

    expect(Number(record.reservedQuantity)).toBe(50);
    const bal = await StockBalanceService.getBalance(testProductId, testLocationId1);
    expect(bal.availableQuantity).toBe("300.0000");
  });

  it("unreserves stock quantity (reserve 50 -> 0)", async () => {
    const record = await StockBalanceService.unreserveStock({
      productId: testProductId,
      locationId: testLocationId1,
      quantity: 50,
    });

    expect(Number(record.reservedQuantity)).toBe(0);
  });

  // -------------------------------------------------------------------------
  // 6. Transfer Stock Primitive
  // -------------------------------------------------------------------------
  it("transfers stock primitive from Location 1 to Location 2 (Loc1 -30, Loc2 +30)", async () => {
    const res = await StockBalanceService.transferStockPrimitive({
      productId: testProductId,
      sourceLocationId: testLocationId1,
      destinationLocationId: testLocationId2,
      quantity: 30,
    });

    expect(Number(res.source.quantity)).toBe(320); // 350 - 30
    expect(Number(res.destination.quantity)).toBe(30); // 0 + 30
  });

  // -------------------------------------------------------------------------
  // 7. Concurrency Safety
  // -------------------------------------------------------------------------
  it("handles concurrent increaseStock operations safely without lost updates", async () => {
    const initialBal = await StockBalanceService.getBalance(testProductId, testLocationId1);
    const initialQty = Number(initialBal.quantity);

    // Execute 5 concurrent stock increases of 10.0
    await Promise.all([
      StockBalanceService.increaseStock({ productId: testProductId, locationId: testLocationId1, quantity: 10 }),
      StockBalanceService.increaseStock({ productId: testProductId, locationId: testLocationId1, quantity: 10 }),
      StockBalanceService.increaseStock({ productId: testProductId, locationId: testLocationId1, quantity: 10 }),
      StockBalanceService.increaseStock({ productId: testProductId, locationId: testLocationId1, quantity: 10 }),
      StockBalanceService.increaseStock({ productId: testProductId, locationId: testLocationId1, quantity: 10 }),
    ]);

    const finalBal = await StockBalanceService.getBalance(testProductId, testLocationId1);
    expect(Number(finalBal.quantity)).toBe(initialQty + 50);
  });

  // -------------------------------------------------------------------------
  // 8. Stock Isolation
  // -------------------------------------------------------------------------
  it("verifies StockBalanceService methods do NOT log stock movements or create operations", async () => {
    const initialMovements = await db.select().from(stockMovements);

    await StockBalanceService.increaseStock({
      productId: testProductId,
      locationId: testLocationId2,
      quantity: 15,
    });

    const finalMovements = await db.select().from(stockMovements);
    expect(finalMovements.length).toBe(initialMovements.length);
  });

  // -------------------------------------------------------------------------
  // 9. HTTP API Endpoints
  // -------------------------------------------------------------------------
  it("queries stock balance list via GET /api/stock-balances", async () => {
    const res = await app.request(`/api/stock-balances?productId=${testProductId}&hasStock=true`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("queries product aggregate stock via GET /api/stock-balances/product/:productId", async () => {
    const res = await app.request(`/api/stock-balances/product/${testProductId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.productId).toBe(testProductId);
    expect(Number(body.data.totalQuantity)).toBeGreaterThan(0);
    expect(body.data.locationBalances).toBeArray();
  });
});
