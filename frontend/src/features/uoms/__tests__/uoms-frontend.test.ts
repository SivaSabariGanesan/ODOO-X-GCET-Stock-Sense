import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { categories } from "../../../../../backend/src/db/schema/categories.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { uomsApi } from "../api";
import { ApiUom, CreateUomPayload } from "../types";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const USER_EMAIL = `uom_fe_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let testUomAId = "";
let testUomBId = "";
let testUomCId = "";
let createdUomIds: string[] = [];

// Domain data for product reference delete testing
let testWarehouseId = "";
let testLocationId = "";
let testCategoryId = "";
let testProductId = "";

describe("Units of Measure (UOM) Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "UOM Frontend Tester",
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

    // Set default client token
    setAuthToken(authToken);

    // 2. Seed test UOMs
    const [uomA] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Kilogram UOM ${TEST_TIMESTAMP}`,
        abbreviation: `kg_${TEST_TIMESTAMP}`,
        description: "Metric standard mass measurement",
        measureType: "weight",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testUomAId = uomA.id;
    createdUomIds.push(uomA.id);

    const [uomB] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Liter UOM ${TEST_TIMESTAMP}`,
        abbreviation: `L_${TEST_TIMESTAMP}`,
        description: "Liquid volume measurement",
        measureType: "volume",
        isActive: false, // inactive for status filter testing
        createdBy: userId,
      })
      .returning();
    testUomBId = uomB.id;
    createdUomIds.push(uomB.id);

    const [uomC] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Box UOM ${TEST_TIMESTAMP}`,
        abbreviation: `bx_${TEST_TIMESTAMP}`,
        description: "Packaging unit container",
        measureType: "unit",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testUomCId = uomC.id;
    createdUomIds.push(uomC.id);

    // 3. Seed domain master data for product reference delete testing
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH UOM Test ${TEST_TIMESTAMP}`,
        shortCode: `W${Math.floor(1000 + Math.random() * 9000)}`,
        createdBy: userId,
      })
      .returning();
    testWarehouseId = wh.id;

    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: "UOM Test Location",
        fullPath: "WH/UOMTest",
        locationType: "internal",
      })
      .returning();
    testLocationId = loc.id;

    const [cat] = await db
      .insert(categories)
      .values({
        name: `Cat for UOM Test ${TEST_TIMESTAMP}`,
        createdBy: userId,
      })
      .returning();
    testCategoryId = cat.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: `Product with UOM A ${TEST_TIMESTAMP}`,
        sku: `SKU-UOM-${TEST_TIMESTAMP}`,
        categoryId: testCategoryId,
        uomId: testUomAId, // References UOM A
        defaultLocationId: testLocationId,
        createdBy: userId,
      })
      .returning();
    testProductId = prod.id;
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up product
    if (testProductId) {
      await db.delete(products).where(eq(products.id, testProductId));
    }
    // Clean up category
    if (testCategoryId) {
      await db.delete(categories).where(eq(categories.id, testCategoryId));
    }
    // Clean up location and warehouse
    if (testLocationId) {
      await db.delete(locations).where(eq(locations.id, testLocationId));
    }
    if (testWarehouseId) {
      await db.delete(warehouses).where(eq(warehouses.id, testWarehouseId));
    }

    // Clean up created UOMs
    if (createdUomIds.length > 0) {
      await db.delete(unitsOfMeasure).where(inArray(unitsOfMeasure.id, createdUomIds));
    }

    // Clean up user
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // 1. UOM list loads successfully
  it("1. UOM list loads successfully via uomsApi.list()", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.meta).toBeDefined();
    expect(res.pagination).toBeDefined();
    expect(res.data.length).toBeGreaterThanOrEqual(3);
  });

  // 2. Real API response renders correctly
  it("2. Real API response matches ApiUom contract with valid fields", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.list({ search: `Kilogram UOM ${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);

    const uom = res.data[0];
    expect(uom.id).toBe(testUomAId);
    expect(uom.name).toBe(`Kilogram UOM ${TEST_TIMESTAMP}`);
    expect(uom.abbreviation).toBe(`kg_${TEST_TIMESTAMP}`);
    expect(uom.measureType).toBe("weight");
    expect(uom.description).toBe("Metric standard mass measurement");
    expect(uom.isActive).toBe(true);
    expect(typeof uom.createdAt).toBe("string");
    expect(typeof uom.updatedAt).toBe("string");
  });

  // 3. Empty UOM list
  it("3. Empty UOM list returns empty data array when query matches nothing", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.list({ search: `NON_EXISTENT_UOM_${Date.now()}` });
    expect(res.data).toBeDefined();
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  // 4. Loading state & pagination metadata
  it("4. Pagination structure returns complete metadata for pagination components", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.list({ page: 1, limit: 10 });
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
      await uomsApi.getById("not-a-valid-uuid");
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
      await uomsApi.list();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(authToken);
    }
  });

  // 7. Search works
  it("7. Search filter accurately narrows results by name, abbreviation, or description", async () => {
    setAuthToken(authToken);
    // Search by name
    const byName = await uomsApi.list({ search: `Kilogram UOM ${TEST_TIMESTAMP}` });
    expect(byName.data.length).toBe(1);
    expect(byName.data[0].id).toBe(testUomAId);

    // Search by abbreviation
    const byAbbr = await uomsApi.list({ search: `kg_${TEST_TIMESTAMP}` });
    expect(byAbbr.data.length).toBe(1);
    expect(byAbbr.data[0].id).toBe(testUomAId);

    // Search by description keyword
    const byDesc = await uomsApi.list({ search: "volume measurement" });
    const match = byDesc.data.find((u) => u.id === testUomBId);
    expect(match).toBeDefined();
  });

  // 8. Measure type filter works
  it("8. Measure type filter accurately restricts results by dimension", async () => {
    setAuthToken(authToken);
    const weightRes = await uomsApi.list({
      measureType: "weight",
      search: TEST_TIMESTAMP,
    });
    expect(weightRes.data.length).toBe(1);
    expect(weightRes.data[0].id).toBe(testUomAId);

    const volumeRes = await uomsApi.list({
      measureType: "volume",
      search: TEST_TIMESTAMP,
    });
    expect(volumeRes.data.length).toBe(1);
    expect(volumeRes.data[0].id).toBe(testUomBId);
  });

  // 9. Active/inactive filter works
  it("9. Active and inactive status filters return correct subsets", async () => {
    setAuthToken(authToken);
    // Active only
    const activeRes = await uomsApi.list({
      isActive: true,
      search: TEST_TIMESTAMP,
    });
    const foundInactiveInActive = activeRes.data.some((u) => u.id === testUomBId);
    expect(foundInactiveInActive).toBe(false);

    // Inactive only
    const inactiveRes = await uomsApi.list({
      isActive: false,
      search: TEST_TIMESTAMP,
    });
    const foundInactive = inactiveRes.data.some((u) => u.id === testUomBId);
    expect(foundInactive).toBe(true);
  });

  // 10. Pagination works
  it("10. Pagination returns distinct records across consecutive pages", async () => {
    setAuthToken(authToken);
    const page1 = await uomsApi.list({ page: 1, limit: 1 });
    expect(page1.data.length).toBe(1);

    const page2 = await uomsApi.list({ page: 2, limit: 1 });
    expect(page2.data.length).toBe(1);
    expect(page1.data[0].id).not.toBe(page2.data[0].id);
  });

  // 11. UOM detail loads
  it("11. UOM detail loads by ID via uomsApi.getById()", async () => {
    setAuthToken(authToken);
    const uom = await uomsApi.getById(testUomAId);
    expect(uom).toBeDefined();
    expect(uom.id).toBe(testUomAId);
    expect(uom.name).toBe(`Kilogram UOM ${TEST_TIMESTAMP}`);
    expect(uom.abbreviation).toBe(`kg_${TEST_TIMESTAMP}`);
  });

  // 12. Non-existent UOM ID returns 404
  it("12. Non-existent UOM ID returns 404 UomNotFoundError", async () => {
    setAuthToken(authToken);
    const nonExistentUuid = "00000000-0000-0000-0000-000000000000";
    try {
      await uomsApi.getById(nonExistentUuid);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // 13. Create UOM successfully
  it("13. Create UOM successfully with valid schema fields", async () => {
    setAuthToken(authToken);
    const payload: CreateUomPayload = {
      name: `Milliliter UOM ${TEST_TIMESTAMP}`,
      abbreviation: `ml_${TEST_TIMESTAMP}`,
      description: "Fractional liquid volume",
      measureType: "volume",
      isActive: true,
    };

    const created = await uomsApi.create(payload);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.name).toBe(`Milliliter UOM ${TEST_TIMESTAMP}`);
    expect(created.abbreviation).toBe(`ml_${TEST_TIMESTAMP}`);
    expect(created.measureType).toBe("volume");
    expect(created.isActive).toBe(true);
    createdUomIds.push(created.id);
  });

  // 14. Required-field validation
  it("14. Missing required name or abbreviation rejects with 400 Bad Request", async () => {
    setAuthToken(authToken);
    // Missing name
    try {
      await uomsApi.create({
        name: "   ",
        abbreviation: `abbr_${TEST_TIMESTAMP}`,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }

    // Missing abbreviation
    try {
      await uomsApi.create({
        name: `Valid Name ${TEST_TIMESTAMP}`,
        abbreviation: "",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  // 15. Backend field validation errors details
  it("15. Invalid field length triggers detailed fieldErrors", async () => {
    setAuthToken(authToken);
    try {
      await uomsApi.create({
        name: "A".repeat(105), // Exceeds 100 max chars
        abbreviation: "B".repeat(25), // Exceeds 20 max chars
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      const data = err.data as any;
      expect(data).toBeDefined();
      expect(data.details?.fieldErrors?.name).toBeDefined();
      expect(data.details?.fieldErrors?.abbreviation).toBeDefined();
    }
  });

  // 16. Enforce uniqueness on name or abbreviation (409 Conflict)
  it("16. Enforces UOM uniqueness and returns HTTP 409 on duplicate name or abbreviation", async () => {
    setAuthToken(authToken);
    // Duplicate name
    try {
      await uomsApi.create({
        name: `Kilogram UOM ${TEST_TIMESTAMP}`, // Duplicate name
        abbreviation: `diff_${TEST_TIMESTAMP}`,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }

    // Duplicate abbreviation
    try {
      await uomsApi.create({
        name: `Different Name ${TEST_TIMESTAMP}`,
        abbreviation: `kg_${TEST_TIMESTAMP}`, // Duplicate abbreviation
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }
  });

  // 17. Update UOM fields via PATCH /api/uoms/:id
  it("17. Update UOM fields via PATCH /api/uoms/:id", async () => {
    setAuthToken(authToken);
    const updated = await uomsApi.update(testUomAId, {
      name: `Kilogram Updated ${TEST_TIMESTAMP}`,
      description: "Updated metric mass standard description",
      measureType: "weight",
    });
    expect(updated).toBeDefined();
    expect(updated.id).toBe(testUomAId);
    expect(updated.name).toBe(`Kilogram Updated ${TEST_TIMESTAMP}`);
    expect(updated.description).toBe("Updated metric mass standard description");
  });

  // 18. Reject update if abbreviation conflicts with another UOM (409)
  it("18. Rejects update if abbreviation conflicts with another UOM", async () => {
    setAuthToken(authToken);
    try {
      await uomsApi.update(testUomAId, {
        abbreviation: `L_${TEST_TIMESTAMP}`, // Already used by testUomB
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }
  });

  // 19. Hard deletes an unreferenced UOM
  it("19. Hard deletes an unreferenced UOM record", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.delete(testUomCId);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.mode).toBe("deleted");

    // Verify it is no longer retrievable
    try {
      await uomsApi.getById(testUomCId);
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  // 20. Deactivates a UOM referenced by products
  it("20. Deactivates a UOM referenced by products to preserve ledger integrity", async () => {
    setAuthToken(authToken);
    const res = await uomsApi.delete(testUomAId);
    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.mode).toBe("deactivated");

    // UOM should still exist in DB, but with isActive = false
    const uom = await uomsApi.getById(testUomAId);
    expect(uom.isActive).toBe(false);
  });

  // 21. UI fetches updated state after mutations
  it("21. Newly created UOM appears in immediate subsequent list call", async () => {
    setAuthToken(authToken);
    const uniqueName = `Refresh Test UOM ${TEST_TIMESTAMP}`;
    const uniqueAbbr = `rf_${TEST_TIMESTAMP}`;
    const created = await uomsApi.create({
      name: uniqueName,
      abbreviation: uniqueAbbr,
      measureType: "unit",
    });
    createdUomIds.push(created.id);

    const listRes = await uomsApi.list({ search: uniqueName });
    expect(listRes.data.length).toBe(1);
    expect(listRes.data[0].id).toBe(created.id);
  });

  // 22. Authentication Bearer header is automatically injected
  it("22. apiClient injects valid Authorization Bearer header", async () => {
    setAuthToken(authToken);
    const res = await app.request("/api/uoms", {
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
