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
import { StockBalanceService } from "../../../../../backend/src/modules/stock-balances/service.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { stockBalancesApi } from "../api";
import type { ApiStockBalance } from "../types";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `inv_fe_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let testWarehouseId = "";
let testLocationAId = "";
let testLocationBId = "";
let testUomId = "";
let testProductAId = "";
let testProductBId = "";
let testProductZeroId = "";
let testProductASku = "";
let testProductBSku = "";

describe("Stock Balances & Inventory Frontend API Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Inventory FE Tester",
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
        name: `Inv Test Facility ${TEST_TIMESTAMP}`,
        shortCode: `IF${TEST_TIMESTAMP}`.slice(0, 10),
        address: "742 Evergreen Terrace",
        createdBy: userId,
      })
      .returning();
    testWarehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Bin Zone A ${TEST_TIMESTAMP}`,
        fullPath: `IF${TEST_TIMESTAMP}/ZoneA`,
        locationType: "internal",
      })
      .returning();
    testLocationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Bin Zone B ${TEST_TIMESTAMP}`,
        fullPath: `IF${TEST_TIMESTAMP}/ZoneB`,
        locationType: "internal",
      })
      .returning();
    testLocationBId = locB.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Cartons IF ${TEST_TIMESTAMP}`,
        abbreviation: `ctn${TEST_TIMESTAMP}`.slice(0, 10),
        category: "unit",
      })
      .returning();
    testUomId = uom.id;

    testProductASku = `SKUA${TEST_TIMESTAMP}`;
    const [pA] = await db
      .insert(products)
      .values({
        sku: testProductASku,
        name: `Component Alpha ${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductAId = pA.id;

    testProductBSku = `SKUB${TEST_TIMESTAMP}`;
    const [pB] = await db
      .insert(products)
      .values({
        sku: testProductBSku,
        name: `Component Beta ${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductBId = pB.id;

    const [pZero] = await db
      .insert(products)
      .values({
        sku: `SKUZ${TEST_TIMESTAMP}`,
        name: `Zero Balance Product ${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductZeroId = pZero.id;

    // 3. Establish authoritative stock balances in DB
    // Product A at Location A: 100 on-hand, 25 reserved => 75 available
    await StockBalanceService.increaseStock({
      productId: testProductAId,
      locationId: testLocationAId,
      quantity: 100,
    });
    await StockBalanceService.reserveStock({
      productId: testProductAId,
      locationId: testLocationAId,
      quantity: 25,
    });

    // Product B at Location B: 50 on-hand, 0 reserved => 50 available
    await StockBalanceService.increaseStock({
      productId: testProductBId,
      locationId: testLocationBId,
      quantity: 50,
    });
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up domain records in correct dependency order
    const pIds = [testProductAId, testProductBId, testProductZeroId].filter(Boolean);
    if (pIds.length > 0) {
      await db.delete(stockMovements).where(inArray(stockMovements.productId, pIds));
      await db.delete(stockBalances).where(inArray(stockBalances.productId, pIds));
      await db.delete(products).where(inArray(products.id, pIds));
    }

    if (testUomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, testUomId));
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

  // 1. Stock balances list loads successfully
  it("1. Stock balances list loads successfully via stockBalancesApi.list()", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ warehouseId: testWarehouseId });
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.pagination).toBeDefined();
    expect(res.pagination.total).toBe(2);
  });

  // 2. Real API response matches ApiStockBalance contract with accurate fields
  it("2. Real API response matches ApiStockBalance contract with all required relational fields", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ productId: testProductAId });
    expect(res.data.length).toBe(1);

    const bal = res.data[0];
    expect(bal.id).toBeDefined();
    expect(bal.productId).toBe(testProductAId);
    expect(bal.productSku).toBe(testProductASku);
    expect(bal.productName).toBe(`Component Alpha ${TEST_TIMESTAMP}`);
    expect(bal.locationId).toBe(testLocationAId);
    expect(bal.locationName).toBe(`Bin Zone A ${TEST_TIMESTAMP}`);
    expect(bal.locationFullPath).toBe(`IF${TEST_TIMESTAMP}/ZoneA`);
    expect(bal.warehouseId).toBe(testWarehouseId);
    expect(bal.warehouseName).toBe(`Inv Test Facility ${TEST_TIMESTAMP}`);
    expect(bal.warehouseShortCode).toBe(`IF${TEST_TIMESTAMP}`.slice(0, 10));
    expect(bal.uomName).toBe(`Cartons IF ${TEST_TIMESTAMP}`);
    expect(bal.uomAbbreviation).toBe(`ctn${TEST_TIMESTAMP}`.slice(0, 10));
    expect(typeof bal.createdAt).toBe("string");
    expect(typeof bal.updatedAt).toBe("string");
  });

  // 3. Authoritative stock calculations: On-Hand, Reserved, Available
  it("3. Verifies backend authoritative quantities: quantity, reservedQuantity, and availableQuantity", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ productId: testProductAId });
    const bal = res.data[0];

    // Backend calculation verification
    expect(bal.quantity).toBe(100);
    expect(bal.reservedQuantity).toBe(25);
    expect(bal.availableQuantity).toBe(75);
    expect(bal.quantity - bal.reservedQuantity).toBe(bal.availableQuantity);
  });

  // 4. Product with unreserved stock displays availableQuantity equal to quantity
  it("4. Product with unreserved stock has availableQuantity equal to on-hand quantity", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ productId: testProductBId });
    const bal = res.data[0];

    expect(bal.quantity).toBe(50);
    expect(bal.reservedQuantity).toBe(0);
    expect(bal.availableQuantity).toBe(50);
  });

  // 5. Product stock summary endpoint GET /api/stock-balances/product/:productId
  it("5. Product stock summary loads via stockBalancesApi.getProductStock(productId)", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.getProductStock(testProductAId);

    expect(res).toBeDefined();
    expect(res.productId).toBe(testProductAId);
    expect(res.totalQuantity).toBe(100);
    expect(res.totalReserved).toBe(25);
    expect(res.totalAvailable).toBe(75);
    expect(Array.isArray(res.locationBalances)).toBe(true);
    expect(res.locationBalances.length).toBe(1);
    expect(res.locationBalances[0].locationId).toBe(testLocationAId);
  });

  // 6. Product stock summary for product with no inventory records returns zeros
  it("6. Product stock summary for zero-inventory product returns clean 0 totals without error", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.getProductStock(testProductZeroId);

    expect(res).toBeDefined();
    expect(res.productId).toBe(testProductZeroId);
    expect(res.totalQuantity).toBe(0);
    expect(res.totalReserved).toBe(0);
    expect(res.totalAvailable).toBe(0);
    expect(res.locationBalances).toEqual([]);
  });

  // 7. Location stock summary endpoint GET /api/stock-balances/location/:locationId
  it("7. Location stock summary loads via stockBalancesApi.getLocationStock(locationId)", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.getLocationStock(testLocationAId);

    expect(res).toBeDefined();
    expect(res.locationId).toBe(testLocationAId);
    expect(res.locationName).toBe(`Bin Zone A ${TEST_TIMESTAMP}`);
    expect(res.warehouseId).toBe(testWarehouseId);
    expect(Array.isArray(res.balances)).toBe(true);
    expect(res.balances.length).toBe(1);
    expect(res.balances[0].productId).toBe(testProductAId);
  });

  // 8. Specific bin check via GET /api/stock-balances/check
  it("8. Single bin balance check via stockBalancesApi.check(productId, locationId)", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.check(testProductAId, testLocationAId);

    expect(res).toBeDefined();
    expect(res.productId).toBe(testProductAId);
    expect(res.locationId).toBe(testLocationAId);
    expect(res.quantity).toBe(100);
    expect(res.reservedQuantity).toBe(25);
    expect(res.availableQuantity).toBe(75);
  });

  // 9. Search query filters by SKU accurately
  it("9. Search query accurately filters balances by product SKU", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ search: testProductASku });

    expect(res.data.length).toBe(1);
    expect(res.data[0].productSku).toBe(testProductASku);
  });

  // 10. Search query for nonexistent term returns empty array
  it("10. Search query for non-matching term returns empty data array", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ search: `NONEXISTENT_${TEST_TIMESTAMP}` });

    expect(res.data).toBeDefined();
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  // 11. Warehouse filter restricts results to specified facility
  it("11. Warehouse filter restricts balances to matching facility", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ warehouseId: testWarehouseId });

    expect(res.data.length).toBe(2);
    expect(res.data.every((b) => b.warehouseId === testWarehouseId)).toBe(true);
  });

  // 12. Location filter restricts results to specific bin location
  it("12. Location filter restricts balances to matching location", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({ locationId: testLocationBId });

    expect(res.data.length).toBe(1);
    expect(res.data[0].locationId).toBe(testLocationBId);
    expect(res.data[0].productId).toBe(testProductBId);
  });

  // 13. hasStock filter returns only positive balances
  it("13. hasStock query parameter filters records with positive stock quantity", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({
      warehouseId: testWarehouseId,
      hasStock: true,
    });

    expect(res.data.length).toBe(2);
    expect(res.data.every((b) => b.quantity > 0)).toBe(true);
  });

  // 14. minQuantity and maxQuantity numerical range filtering
  it("14. minQuantity and maxQuantity correctly bound the returned stock balances", async () => {
    setAuthToken(authToken);
    // Product A has 100, Product B has 50. Filter between 60 and 150 => only Product A
    const res = await stockBalancesApi.list({
      warehouseId: testWarehouseId,
      minQuantity: 60,
      maxQuantity: 150,
    });

    expect(res.data.length).toBe(1);
    expect(res.data[0].productId).toBe(testProductAId);
    expect(res.data[0].quantity).toBe(100);
  });

  // 15. Server-side sorting orders results properly
  it("15. Server-side sorting by quantity descending returns highest stock first", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({
      warehouseId: testWarehouseId,
      sortBy: "quantity",
      sortOrder: "desc",
    });

    expect(res.data.length).toBe(2);
    expect(res.data[0].quantity).toBe(100);
    expect(res.data[1].quantity).toBe(50);
  });

  // 16. Server-side pagination parameters limit and page
  it("16. Server-side pagination returns correct limits and total page metadata", async () => {
    setAuthToken(authToken);
    const res = await stockBalancesApi.list({
      warehouseId: testWarehouseId,
      limit: 1,
      page: 1,
    });

    expect(res.data.length).toBe(1);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(1);
    expect(res.pagination.total).toBe(2);
    expect(res.pagination.totalPages).toBe(2);

    // Fetch page 2
    const resPage2 = await stockBalancesApi.list({
      warehouseId: testWarehouseId,
      limit: 1,
      page: 2,
    });

    expect(resPage2.data.length).toBe(1);
    expect(resPage2.pagination.page).toBe(2);
    expect(resPage2.data[0].id).not.toBe(res.data[0].id);
  });

  // 17. Master warehouses helper returns active warehouses
  it("17. stockBalancesApi.getWarehousesMaster() returns warehouse options for filters", async () => {
    setAuthToken(authToken);
    const whList = await stockBalancesApi.getWarehousesMaster();

    expect(Array.isArray(whList)).toBe(true);
    expect(whList.length).toBeGreaterThanOrEqual(1);
    const ourWh = whList.find((w) => w.id === testWarehouseId);
    expect(ourWh).toBeDefined();
    expect(ourWh?.name).toBe(`Inv Test Facility ${TEST_TIMESTAMP}`);
  });

  // 18. Master locations helper returns location options filtered by warehouse
  it("18. stockBalancesApi.getLocationsMaster(warehouseId) returns location options for selected warehouse", async () => {
    setAuthToken(authToken);
    const locList = await stockBalancesApi.getLocationsMaster(testWarehouseId);

    expect(Array.isArray(locList)).toBe(true);
    expect(locList.length).toBe(2);
    expect(locList.every((l) => l.warehouseId === testWarehouseId)).toBe(true);
  });

  // 19. Unauthorized request without Bearer token returns 401
  it("19. Request throws 401 ApiError when auth token is omitted", async () => {
    clearAuthToken();
    try {
      await stockBalancesApi.list();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(authToken);
    }
  });

  // 20. Invalid query parameter returns 400 validation error
  it("20. Invalid query parameter (limit > 100) triggers 400 ApiError", async () => {
    setAuthToken(authToken);
    try {
      await stockBalancesApi.list({ limit: 500 });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 21. Non-existent UUID balance query throws 404
  it("21. Requesting non-existent balance ID returns 404 ApiError", async () => {
    setAuthToken(authToken);
    try {
      await stockBalancesApi.getById("00000000-0000-4000-8000-999999999999");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // 22. apiClient injects valid Authorization Bearer header into stock balances request
  it("22. apiClient injects valid Authorization Bearer header into backend request", async () => {
    setAuthToken(authToken);
    const res = await app.request(`/api/stock-balances?warehouseId=${testWarehouseId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.length).toBe(2);
  });
});
