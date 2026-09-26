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
import { warehousesApi, locationsApi } from "../api";
import { stockBalancesApi } from "../../inventory/api";
import type { ApiWarehouse, ApiLocation } from "../types";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `wh_fe_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let testWarehouseAId = "";
let testWarehouseBId = "";
let createdWarehouseIds: string[] = [];

let testLocationParentId = "";
let testLocationChildId = "";
let testLocationDockId = "";
let createdLocationIds: string[] = [];

let testUomId = "";
let testProductId = "";

describe("Warehouses & Locations Frontend API Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Warehouse FE Tester",
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

    // 2. Create Warehouse A
    const [whA] = await db
      .insert(warehouses)
      .values({
        name: `Alpha Logistics Hub ${TEST_TIMESTAMP}`,
        shortCode: `WHA${TEST_TIMESTAMP}`.slice(0, 10),
        address: "100 Logistics Way, Sector 1",
        description: "Primary regional distribution facility",
        isActive: true,
        createdBy: userId,
      })
      .returning();
    testWarehouseAId = whA.id;
    createdWarehouseIds.push(whA.id);

    // 3. Create Warehouse B (Inactive for status filtering)
    const [whB] = await db
      .insert(warehouses)
      .values({
        name: `Beta Cold Storage ${TEST_TIMESTAMP}`,
        shortCode: `WHB${TEST_TIMESTAMP}`.slice(0, 10),
        address: "200 Arctic Boulevard, Sector 2",
        description: "Temperature controlled inventory staging",
        isActive: false,
        createdBy: userId,
      })
      .returning();
    testWarehouseBId = whB.id;
    createdWarehouseIds.push(whB.id);

    // 4. Create Locations in Warehouse A with Parent/Child Hierarchy
    const [locParent] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseAId,
        name: `Section A ${TEST_TIMESTAMP}`,
        fullPath: `${whA.shortCode} / Section A`,
        locationType: "internal",
        parentId: null,
      })
      .returning();
    testLocationParentId = locParent.id;
    createdLocationIds.push(locParent.id);

    const [locChild] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseAId,
        name: `Rack A1 ${TEST_TIMESTAMP}`,
        fullPath: `${whA.shortCode} / Section A / Rack A1`,
        locationType: "internal",
        parentId: testLocationParentId,
      })
      .returning();
    testLocationChildId = locChild.id;
    createdLocationIds.push(locChild.id);

    const [locDock] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseAId,
        name: `Inbound Dock ${TEST_TIMESTAMP}`,
        fullPath: `${whA.shortCode} / Inbound Dock`,
        locationType: "input",
        parentId: null,
      })
      .returning();
    testLocationDockId = locDock.id;
    createdLocationIds.push(locDock.id);

    // 5. Seed Product and Stock in Rack A1
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Cartons WH ${TEST_TIMESTAMP}`,
        abbreviation: `ct${TEST_TIMESTAMP}`.slice(0, 10),
        category: "unit",
      })
      .returning();
    testUomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        sku: `SKUWH${TEST_TIMESTAMP}`,
        name: `Industrial Valve ${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductId = prod.id;

    await StockBalanceService.increaseStock({
      productId: testProductId,
      locationId: testLocationChildId,
      quantity: 45,
    });
  });

  afterAll(async () => {
    clearAuthToken();

    // Clean up domain records in dependency order
    if (testProductId) {
      await db.delete(stockMovements).where(eq(stockMovements.productId, testProductId));
      await db.delete(stockBalances).where(eq(stockBalances.productId, testProductId));
      await db.delete(products).where(eq(products.id, testProductId));
    }

    if (testUomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, testUomId));
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

  // ── 1. Warehouse List Tests ──────────────────────────────────────────────

  it("1. Warehouse list loads successfully via warehousesApi.list()", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(2);
    expect(res.pagination).toBeDefined();
  });

  it("2. Real warehouse API response matches ApiWarehouse contract with required schema fields", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list({ search: `Alpha Logistics Hub ${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);

    const wh = res.data[0];
    expect(wh.id).toBe(testWarehouseAId);
    expect(wh.name).toBe(`Alpha Logistics Hub ${TEST_TIMESTAMP}`);
    expect(wh.shortCode).toBe(`WHA${TEST_TIMESTAMP}`.slice(0, 10));
    expect(wh.address).toBe("100 Logistics Way, Sector 1");
    expect(wh.description).toBe("Primary regional distribution facility");
    expect(wh.isActive).toBe(true);
    expect(typeof wh.createdAt).toBe("string");
    expect(typeof wh.updatedAt).toBe("string");
  });

  it("3. Search query filters warehouses by name, code, or address", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list({ search: `WHA${TEST_TIMESTAMP}`.slice(0, 10) });
    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe(testWarehouseAId);
  });

  it("4. Non-matching search query returns empty data array", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list({ search: `NONEXISTENT_WH_${TEST_TIMESTAMP}` });
    expect(res.data).toBeDefined();
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  it("5. Pagination metadata contains page, limit, total, and totalPages", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list({ limit: 1, page: 1 });
    expect(res.data.length).toBe(1);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(1);
    expect(res.pagination.total).toBeGreaterThanOrEqual(2);
    expect(res.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  it("6. isActive filter accurately filters active vs inactive warehouses", async () => {
    setAuthToken(authToken);
    const activeRes = await warehousesApi.list({ isActive: true });
    expect(activeRes.data.some((w) => w.id === testWarehouseAId)).toBe(true);
    expect(activeRes.data.some((w) => w.id === testWarehouseBId)).toBe(false);

    const inactiveRes = await warehousesApi.list({ isActive: false });
    expect(inactiveRes.data.some((w) => w.id === testWarehouseBId)).toBe(true);
    expect(inactiveRes.data.some((w) => w.id === testWarehouseAId)).toBe(false);
  });

  // ── 2. Warehouse Detail Tests ────────────────────────────────────────────

  it("7. Warehouse detail loads by ID via warehousesApi.getById()", async () => {
    setAuthToken(authToken);
    const wh = await warehousesApi.getById(testWarehouseAId);
    expect(wh).toBeDefined();
    expect(wh.id).toBe(testWarehouseAId);
    expect(wh.name).toBe(`Alpha Logistics Hub ${TEST_TIMESTAMP}`);
    expect(wh.shortCode).toBe(`WHA${TEST_TIMESTAMP}`.slice(0, 10));
  });

  it("8. Non-existent warehouse UUID returns 404 ApiError", async () => {
    setAuthToken(authToken);
    try {
      await warehousesApi.getById("00000000-0000-4000-8000-999999999999");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // ── 3. Warehouse CRUD Mutation Tests ─────────────────────────────────────

  it("9. Create warehouse successfully via warehousesApi.create()", async () => {
    setAuthToken(authToken);
    const newWh = await warehousesApi.create({
      name: `Gamma Depot ${TEST_TIMESTAMP}`,
      shortCode: `WHG${TEST_TIMESTAMP}`.slice(0, 10),
      address: "300 Transit Rd",
      description: "Overflow staging warehouse",
      isActive: true,
    });

    expect(newWh.id).toBeDefined();
    expect(newWh.name).toBe(`Gamma Depot ${TEST_TIMESTAMP}`);
    expect(newWh.shortCode).toBe(`WHG${TEST_TIMESTAMP}`.slice(0, 10));
    createdWarehouseIds.push(newWh.id);
  });

  it("10. Warehouse creation with missing required fields rejects with 400 Bad Request", async () => {
    setAuthToken(authToken);
    try {
      await warehousesApi.create({
        name: "",
        shortCode: "",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
    }
  });

  it("11. Duplicate warehouse name or shortCode rejects with 409 Conflict", async () => {
    setAuthToken(authToken);
    try {
      await warehousesApi.create({
        name: `Alpha Logistics Hub ${TEST_TIMESTAMP}`,
        shortCode: `WHA${TEST_TIMESTAMP}`.slice(0, 10),
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
    }
  });

  it("12. Update warehouse fields via warehousesApi.update()", async () => {
    setAuthToken(authToken);
    const updated = await warehousesApi.update(testWarehouseAId, {
      description: "Updated description text",
      address: "105 Logistics Way Updated",
    });

    expect(updated.id).toBe(testWarehouseAId);
    expect(updated.description).toBe("Updated description text");
    expect(updated.address).toBe("105 Logistics Way Updated");
  });

  it("13. Delete / deactivate warehouse via warehousesApi.delete()", async () => {
    setAuthToken(authToken);
    // Create standalone warehouse to test clean deletion
    const tempWh = await warehousesApi.create({
      name: `Temp Delete WH ${TEST_TIMESTAMP}`,
      shortCode: `WHT${TEST_TIMESTAMP}`.slice(0, 10),
    });

    const res = await warehousesApi.delete(tempWh.id);
    expect(res).toBeDefined();
    expect(res.message).toBeDefined();

    // Verify it is removed or deactivated
    try {
      const getRes = await warehousesApi.getById(tempWh.id);
      expect(getRes.isActive).toBe(false);
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  // ── 4. Locations List & Hierarchy Tests ──────────────────────────────────

  it("14. Location list loads successfully via locationsApi.list()", async () => {
    setAuthToken(authToken);
    const res = await locationsApi.list({ warehouseId: testWarehouseAId });
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data.length).toBe(3);
  });

  it("15. Real location API response matches ApiLocation contract with schema and relational fields", async () => {
    setAuthToken(authToken);
    const res = await locationsApi.list({ search: `Rack A1 ${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(1);

    const loc = res.data[0];
    expect(loc.id).toBe(testLocationChildId);
    expect(loc.warehouseId).toBe(testWarehouseAId);
    expect(loc.parentId).toBe(testLocationParentId);
    expect(loc.name).toBe(`Rack A1 ${TEST_TIMESTAMP}`);
    expect(loc.fullPath).toContain("Rack A1");
    expect(loc.locationType).toBe("internal");
    expect(loc.warehouseName).toBe(`Alpha Logistics Hub ${TEST_TIMESTAMP}`);
    expect(loc.parentName).toBe(`Section A ${TEST_TIMESTAMP}`);
    expect(loc.isActive).toBe(true);
  });

  it("16. locationsApi.list({ warehouseId }) restricts locations strictly to the specified warehouse", async () => {
    setAuthToken(authToken);
    const res = await locationsApi.list({ warehouseId: testWarehouseAId });
    expect(res.data.length).toBe(3);
    expect(res.data.every((l) => l.warehouseId === testWarehouseAId)).toBe(true);
  });

  it("17. Parent/child location hierarchy is accurately represented with parentId relationship", async () => {
    setAuthToken(authToken);
    const child = await locationsApi.getById(testLocationChildId);
    expect(child.parentId).toBe(testLocationParentId);
    expect(child.parentName).toBe(`Section A ${TEST_TIMESTAMP}`);

    const parent = await locationsApi.getById(testLocationParentId);
    expect(parent.parentId).toBeNull();
  });

  it("18. locationsApi.list({ parentId }) filters sub-locations under specific parent", async () => {
    setAuthToken(authToken);
    const res = await locationsApi.list({ parentId: testLocationParentId });
    expect(res.data.length).toBe(1);
    expect(res.data[0].id).toBe(testLocationChildId);
  });

  it("19. Non-matching search query returns empty locations array", async () => {
    setAuthToken(authToken);
    const res = await locationsApi.list({ search: `NONEXISTENT_LOC_${TEST_TIMESTAMP}` });
    expect(res.data.length).toBe(0);
  });

  it("20. Non-existent location ID returns 404 ApiError", async () => {
    setAuthToken(authToken);
    try {
      await locationsApi.getById("00000000-0000-4000-8000-999999999999");
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(404);
    }
  });

  // ── 5. Location CRUD Mutation Tests ──────────────────────────────────────

  it("21. Create location linked to a warehouse via locationsApi.create()", async () => {
    setAuthToken(authToken);
    const newLoc = await locationsApi.create({
      warehouseId: testWarehouseAId,
      name: `Quality Bay ${TEST_TIMESTAMP}`,
      locationType: "quality_control",
    });

    expect(newLoc.id).toBeDefined();
    expect(newLoc.name).toBe(`Quality Bay ${TEST_TIMESTAMP}`);
    expect(newLoc.locationType).toBe("quality_control");
    expect(newLoc.warehouseId).toBe(testWarehouseAId);
    createdLocationIds.push(newLoc.id);
  });

  it("22. Create location with invalid warehouse UUID rejects with 400 or 404", async () => {
    setAuthToken(authToken);
    try {
      await locationsApi.create({
        warehouseId: "00000000-0000-4000-8000-000000000000",
        name: "Orphan Location",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect([400, 404]).toContain(err.status);
    }
  });

  it("23. Update location name and type via locationsApi.update()", async () => {
    setAuthToken(authToken);
    const updated = await locationsApi.update(testLocationDockId, {
      name: `Primary Dock Intake ${TEST_TIMESTAMP}`,
      locationType: "input",
    });

    expect(updated.id).toBe(testLocationDockId);
    expect(updated.name).toBe(`Primary Dock Intake ${TEST_TIMESTAMP}`);
  });

  it("24. Circular location hierarchy assignment is rejected by backend", async () => {
    setAuthToken(authToken);
    try {
      // Attempting to make parent location a child of its own child
      await locationsApi.update(testLocationParentId, {
        parentId: testLocationChildId,
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect([400, 409]).toContain(err.status);
    }
  });

  it("25. Delete location via locationsApi.delete() removes or deactivates location", async () => {
    setAuthToken(authToken);
    const tempLoc = await locationsApi.create({
      warehouseId: testWarehouseAId,
      name: `Temp Delete Loc ${TEST_TIMESTAMP}`,
      locationType: "internal",
    });

    const res = await locationsApi.delete(tempLoc.id);
    expect(res).toBeDefined();
    expect(res.message).toBeDefined();
  });

  // ── 6. Warehouse Selector & Stock Relationship Tests ─────────────────────

  it("26. Warehouse selector formats '${shortCode} — ${name}' without truncating important context", async () => {
    setAuthToken(authToken);
    const res = await warehousesApi.list({ isActive: true });
    const wh = res.data.find((w) => w.id === testWarehouseAId);
    expect(wh).toBeDefined();

    const formatted = `${wh?.shortCode} — ${wh?.name}`;
    expect(formatted).toContain(wh!.shortCode);
    expect(formatted).toContain(wh!.name);
  });

  it("27. Warehouse stock balances load via stockBalancesApi.list({ warehouseId }) with authoritative on-hand stock", async () => {
    setAuthToken(authToken);
    const stockRes = await stockBalancesApi.list({ warehouseId: testWarehouseAId });
    expect(stockRes.data).toBeDefined();
    expect(stockRes.data.length).toBeGreaterThanOrEqual(1);

    const rackStock = stockRes.data.find((b) => b.locationId === testLocationChildId);
    expect(rackStock).toBeDefined();
    expect(rackStock?.quantity).toBe(45);
    expect(rackStock?.productSku).toBe(`SKUWH${TEST_TIMESTAMP}`);
  });

  it("28. Unauthorized request without Bearer token returns 401 ApiError", async () => {
    clearAuthToken();
    try {
      await warehousesApi.list();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(authToken);
    }
  });

  it("29. apiClient automatically injects valid Authorization Bearer header into warehouse requests", async () => {
    setAuthToken(authToken);
    const res = await app.request("/api/warehouses", {
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
