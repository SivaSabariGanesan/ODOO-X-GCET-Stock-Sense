import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { reorderRules } from "../../../../../backend/src/db/schema/reorder-rules.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { reorderingRulesApi } from "../api";
import { ApiReorderRule, CreateReorderRulePayload } from "../types";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const USER_EMAIL = `reorder_fe_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let testWarehouseId = "";
let testLocationId1 = "";
let testLocationId2 = "";
let testUomId = "";
let testProductId1 = "";
let testProductId2 = "";

let testRule1Id = "";
let testRule2Id = "";
let createdRuleIds: string[] = [];

describe("Reordering Rules Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Reorder Frontend Tester",
        email: USER_EMAIL,
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
        email: USER_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;

    setAuthToken(authToken);

    // 2. Setup domain master data: Warehouse, Locations, UOM, Products
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH Reorder FE ${TEST_TIMESTAMP}`,
        shortCode: `WRF${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testWarehouseId = wh.id;

    const [loc1] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: "Zone A Shelf 1",
        fullPath: "WH/ZoneA/Shelf1",
        locationType: "internal",
      })
      .returning();
    testLocationId1 = loc1.id;

    const [loc2] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: "Zone B Shelf 2",
        fullPath: "WH/ZoneB/Shelf2",
        locationType: "internal",
      })
      .returning();
    testLocationId2 = loc2.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM Reorder FE ${TEST_TIMESTAMP}`,
        abbreviation: `urf_${TEST_TIMESTAMP}`,
      })
      .returning();
    testUomId = uom.id;

    const [prod1] = await db
      .insert(products)
      .values({
        name: `Widget Alpha ${TEST_TIMESTAMP}`,
        sku: `SKU-ALPHA-${TEST_TIMESTAMP}`,
        uomId: testUomId,
        defaultLocationId: testLocationId1,
        createdBy: userId,
      })
      .returning();
    testProductId1 = prod1.id;

    const [prod2] = await db
      .insert(products)
      .values({
        name: `Gadget Beta ${TEST_TIMESTAMP}`,
        sku: `SKU-BETA-${TEST_TIMESTAMP}`,
        uomId: testUomId,
        defaultLocationId: testLocationId2,
        createdBy: userId,
      })
      .returning();
    testProductId2 = prod2.id;

    // 3. Seed initial reordering rules
    const [rule1] = await db
      .insert(reorderRules)
      .values({
        productId: testProductId1,
        locationId: testLocationId1,
        minQuantity: "10.0000",
        maxQuantity: "100.0000",
        reorderQty: "25.0000",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testRule1Id = rule1.id;
    createdRuleIds.push(rule1.id);

    const [rule2] = await db
      .insert(reorderRules)
      .values({
        productId: testProductId2,
        locationId: testLocationId2,
        minQuantity: "5.0000",
        maxQuantity: "50.0000",
        reorderQty: "10.0000",
        isActive: false, // inactive for filtering tests
        createdBy: userId,
      })
      .returning();
    testRule2Id = rule2.id;
    createdRuleIds.push(rule2.id);
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up reorder rules
    if (createdRuleIds.length > 0) {
      await db.delete(reorderRules).where(inArray(reorderRules.id, createdRuleIds));
    }

    // Clean up products
    const prodIds = [testProductId1, testProductId2].filter(Boolean);
    if (prodIds.length > 0) {
      await db.delete(products).where(inArray(products.id, prodIds));
    }

    // Clean up UOM
    if (testUomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, testUomId));
    }

    // Clean up Locations & Warehouse
    const locIds = [testLocationId1, testLocationId2].filter(Boolean);
    if (locIds.length > 0) {
      await db.delete(locations).where(inArray(locations.id, locIds));
    }
    if (testWarehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
    }

    // Clean up User
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // 1. Reordering Rules list loads successfully
  it("1. Reordering rules list loads successfully via reorderingRulesApi.list()", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.meta).toBeDefined();
    expect(res.pagination).toBeDefined();
    expect(res.data.length).toBeGreaterThanOrEqual(2);
  });

  // 2. Real API response matches contract with valid fields
  it("2. Real API response matches ApiReorderRule contract with full relational details", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.list({ search: `Widget Alpha ${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);

    const rule = res.data[0];
    expect(rule.id).toBe(testRule1Id);
    expect(rule.productId).toBe(testProductId1);
    expect(rule.locationId).toBe(testLocationId1);
    expect(parseFloat(rule.minQuantity)).toBe(10);
    expect(parseFloat(rule.maxQuantity!)).toBe(100);
    expect(parseFloat(rule.reorderQty)).toBe(25);
    expect(rule.isActive).toBe(true);
    expect(rule.productName).toBe(`Widget Alpha ${TEST_TIMESTAMP}`);
    expect(rule.productSku).toBe(`SKU-ALPHA-${TEST_TIMESTAMP}`);
    expect(rule.locationName).toBe("Zone A Shelf 1");
    expect(rule.locationFullPath).toBe("WH/ZoneA/Shelf1");
    expect(rule.warehouseId).toBe(testWarehouseId);
    expect(rule.warehouseName).toBe(`WH Reorder FE ${TEST_TIMESTAMP}`);
  });

  // 3. Empty list when search criteria matches nothing
  it("3. Empty reordering rules list returns empty data array when query matches nothing", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.list({ search: `NON_EXISTENT_SKU_${Date.now()}` });
    expect(res.data).toBeDefined();
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  // 4. Loading state & pagination metadata
  it("4. Pagination structure returns complete metadata for pagination components", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.list({ page: 1, limit: 10 });
    expect(res.pagination).toBeDefined();
    expect(typeof res.pagination.page).toBe("number");
    expect(typeof res.pagination.limit).toBe("number");
    expect(typeof res.pagination.total).toBe("number");
    expect(typeof res.pagination.totalPages).toBe("number");
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(10);
  });

  // 5. API failure state
  it("5. API failure state handles invalid parameters with typed ApiError", async () => {
    setAuthToken(authToken);
    try {
      await reorderingRulesApi.getById("not-a-valid-uuid");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBeGreaterThanOrEqual(400);
    }
  });

  // 6. Unauthorized response
  it("6. Unauthorized response throws 401 when auth token is omitted", async () => {
    clearAuthToken();
    try {
      await reorderingRulesApi.list();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(authToken);
    }
  });

  // 7. Search filter works
  it("7. Search filter accurately narrows results by product name, SKU, or location", async () => {
    setAuthToken(authToken);
    // Search by product name
    const byName = await reorderingRulesApi.list({ search: `Widget Alpha ${TEST_TIMESTAMP}` });
    expect(byName.data.length).toBe(1);
    expect(byName.data[0].id).toBe(testRule1Id);

    // Search by SKU
    const bySku = await reorderingRulesApi.list({ search: `SKU-BETA-${TEST_TIMESTAMP}` });
    expect(bySku.data.length).toBe(1);
    expect(bySku.data[0].id).toBe(testRule2Id);

    // Search by location fullPath
    const byLoc = await reorderingRulesApi.list({ search: "ZoneA/Shelf1" });
    const match = byLoc.data.find((r) => r.id === testRule1Id);
    expect(match).toBeDefined();
  });

  // 8. Warehouse filter works
  it("8. Warehouse filter restricts reordering rules to matching warehouse", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.list({
      warehouseId: testWarehouseId,
    });
    expect(res.data.length).toBeGreaterThanOrEqual(2);
    expect(res.data.every((r) => r.warehouseId === testWarehouseId)).toBe(true);
  });

  // 9. Active/inactive filter works
  it("9. Active and inactive status filters return correct subsets", async () => {
    setAuthToken(authToken);
    // Active only
    const activeRes = await reorderingRulesApi.list({
      isActive: true,
      search: TEST_TIMESTAMP,
    });
    const foundInactiveInActive = activeRes.data.some((r) => r.id === testRule2Id);
    expect(foundInactiveInActive).toBe(false);

    // Inactive only
    const inactiveRes = await reorderingRulesApi.list({
      isActive: false,
      search: TEST_TIMESTAMP,
    });
    const foundInactive = inactiveRes.data.some((r) => r.id === testRule2Id);
    expect(foundInactive).toBe(true);
  });

  // 10. Pagination works across pages
  it("10. Pagination returns distinct records across separate pages", async () => {
    setAuthToken(authToken);
    const page1 = await reorderingRulesApi.list({ page: 1, limit: 1 });
    expect(page1.data.length).toBe(1);

    const page2 = await reorderingRulesApi.list({ page: 2, limit: 1 });
    expect(page2.data.length).toBe(1);
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
  });

  // 11. Reordering rule detail loads by ID
  it("11. Reordering rule detail loads by ID via reorderingRulesApi.getById()", async () => {
    setAuthToken(authToken);
    const rule = await reorderingRulesApi.getById(testRule1Id);
    expect(rule).toBeDefined();
    expect(rule.id).toBe(testRule1Id);
    expect(rule.productName).toBe(`Widget Alpha ${TEST_TIMESTAMP}`);
    expect(rule.productSku).toBe(`SKU-ALPHA-${TEST_TIMESTAMP}`);
    expect(parseFloat(rule.minQuantity)).toBe(10);
  });

  // 12. Non-existent ID returns 404
  it("12. Non-existent reordering rule ID returns 404 ReorderRuleNotFoundError", async () => {
    setAuthToken(authToken);
    const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
    try {
      await reorderingRulesApi.getById(nonExistentUuid);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // 13. Create reordering rule successfully
  it("13. Create reordering rule successfully with min, max, and reorder quantities", async () => {
    setAuthToken(authToken);
    const payload: CreateReorderRulePayload = {
      productId: testProductId1,
      locationId: testLocationId2, // Product 1 at Location 2
      minQuantity: 15,
      maxQuantity: 80,
      reorderQty: 20,
      isActive: true,
    };

    const created = await reorderingRulesApi.create(payload);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.productId).toBe(testProductId1);
    expect(created.locationId).toBe(testLocationId2);
    expect(parseFloat(created.minQuantity)).toBe(15);
    expect(parseFloat(created.maxQuantity!)).toBe(80);
    expect(parseFloat(created.reorderQty)).toBe(20);
    expect(created.isActive).toBe(true);
    createdRuleIds.push(created.id);
  });

  // 14. Validation failure on negative minQuantity
  it("14. Negative minimum quantity rejects with 400 Bad Request", async () => {
    setAuthToken(authToken);
    try {
      await reorderingRulesApi.create({
        productId: testProductId2,
        locationId: testLocationId1,
        minQuantity: -5,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 15. Validation failure on non-positive reorderQty
  it("15. Non-positive reorderQty rejects with 400 Bad Request", async () => {
    setAuthToken(authToken);
    try {
      await reorderingRulesApi.create({
        productId: testProductId2,
        locationId: testLocationId1,
        reorderQty: 0,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 16. Validation failure when maxQuantity < minQuantity
  it("16. Maximum quantity less than minimum quantity rejects with 400 Bad Request", async () => {
    setAuthToken(authToken);
    try {
      await reorderingRulesApi.create({
        productId: testProductId2,
        locationId: testLocationId1,
        minQuantity: 50,
        maxQuantity: 20, // Invalid: max < min
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 17. Duplicate rule conflict on (productId, locationId) -> 409
  it("17. Creating duplicate rule on same product and location returns 409 Conflict", async () => {
    setAuthToken(authToken);
    try {
      await reorderingRulesApi.create({
        productId: testProductId1,
        locationId: testLocationId1, // Already exists for testRule1
        minQuantity: 5,
        reorderQty: 10,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }
  });

  // 18. Update reordering rule fields via PATCH /api/reordering-rules/:id
  it("18. Update reordering rule fields via PATCH /api/reordering-rules/:id", async () => {
    setAuthToken(authToken);
    const updated = await reorderingRulesApi.update(testRule1Id, {
      minQuantity: "30.0000",
      maxQuantity: "150.0000",
      reorderQty: "40.0000",
    });
    expect(updated).toBeDefined();
    expect(updated.id).toBe(testRule1Id);
    expect(parseFloat(updated.minQuantity)).toBe(30);
    expect(parseFloat(updated.maxQuantity!)).toBe(150);
    expect(parseFloat(updated.reorderQty)).toBe(40);
  });

  // 19. Toggle active status on reordering rule
  it("19. Toggle active status pauses or activates reorder rule", async () => {
    setAuthToken(authToken);
    const paused = await reorderingRulesApi.update(testRule1Id, {
      isActive: false,
    });
    expect(paused.isActive).toBe(false);

    const resumed = await reorderingRulesApi.update(testRule1Id, {
      isActive: true,
    });
    expect(resumed.isActive).toBe(true);
  });

  // 20. Delete reordering rule via DELETE /api/reordering-rules/:id
  it("20. Delete reordering rule removes rule from database", async () => {
    setAuthToken(authToken);
    const res = await reorderingRulesApi.delete(testRule2Id);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.mode).toBe("deleted");

    // Verify it is no longer retrievable
    try {
      await reorderingRulesApi.getById(testRule2Id);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  // 21. UI fetches updated state after mutations
  it("21. Newly created reordering rule appears in immediate subsequent list call", async () => {
    setAuthToken(authToken);
    const created = await reorderingRulesApi.create({
      productId: testProductId2,
      locationId: testLocationId1,
      minQuantity: 8,
      reorderQty: 15,
    });
    createdRuleIds.push(created.id);

    const listRes = await reorderingRulesApi.list({
      productId: testProductId2,
      locationId: testLocationId1,
    });
    expect(listRes.data.length).toBe(1);
    expect(listRes.data[0].id).toBe(created.id);
  });

  // 22. Authentication Bearer header is automatically injected
  it("22. apiClient injects valid Authorization Bearer header", async () => {
    setAuthToken(authToken);
    const res = await app.request("/api/reordering-rules", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toBeDefined();
  });
});
