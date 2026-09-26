import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { reorderRules } from "../src/db/schema/reorder-rules.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `reorder_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let testWarehouseId = "";
let testLocationId1 = "";
let testLocationId2 = "";
let testUomId = "";
let testProductId1 = "";
let testProductId2 = "";

let createdWarehouseIds: string[] = [];
let createdLocationIds: string[] = [];
let createdUomIds: string[] = [];
let createdProductIds: string[] = [];
let createdRuleIds: string[] = [];

describe("StockSense Reordering Rules CRUD Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Reorder Rule Tester",
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
        name: `Reorder WH ${TEST_TIMESTAMP}`,
        shortCode: `WHR${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testWarehouseId = wh.id;
    createdWarehouseIds.push(wh.id);

    const [loc1] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Rack R1 ${TEST_TIMESTAMP}`,
        fullPath: `WHR${TEST_TIMESTAMP}/RackR1`,
      })
      .returning();
    testLocationId1 = loc1.id;
    createdLocationIds.push(loc1.id);

    const [loc2] = await db
      .insert(locations)
      .values({
        warehouseId: testWarehouseId,
        name: `Rack R2 ${TEST_TIMESTAMP}`,
        fullPath: `WHR${TEST_TIMESTAMP}/RackR2`,
      })
      .returning();
    testLocationId2 = loc2.id;
    createdLocationIds.push(loc2.id);

    // 3. Setup UOM & Products
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Reorder UOM ${TEST_TIMESTAMP}`,
        abbreviation: `ru${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testUomId = uom.id;
    createdUomIds.push(uom.id);

    const [p1] = await db
      .insert(products)
      .values({
        name: `Steel Rod ${TEST_TIMESTAMP}`,
        sku: `SKU_RR_1_${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductId1 = p1.id;
    createdProductIds.push(p1.id);

    const [p2] = await db
      .insert(products)
      .values({
        name: `Copper Wire ${TEST_TIMESTAMP}`,
        sku: `SKU_RR_2_${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    testProductId2 = p2.id;
    createdProductIds.push(p2.id);
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    if (createdRuleIds.length > 0) {
      await db.delete(reorderRules).where(inArray(reorderRules.id, createdRuleIds));
    }
    if (createdProductIds.length > 0) {
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
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/reordering-rules", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create Reordering Rule (POST /api/reordering-rules)
  // -------------------------------------------------------------------------
  it("creates a reordering rule successfully with valid parameters", async () => {
    const res = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: testProductId1,
        locationId: testLocationId1,
        minQuantity: 50,
        maxQuantity: 200,
        reorderQty: 50,
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.productId).toBe(testProductId1);
    expect(body.data.locationId).toBe(testLocationId1);
    expect(Number(body.data.minQuantity)).toBe(50);
    expect(Number(body.data.maxQuantity)).toBe(200);

    createdRuleIds.push(body.data.id);
  });

  it("rejects rule creation when minimum quantity exceeds maximum quantity", async () => {
    const res = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: testProductId2,
        locationId: testLocationId1,
        minQuantity: 200,
        maxQuantity: 50,
        reorderQty: 25,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects duplicate rule creation for the same product and location", async () => {
    const res = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: testProductId1,
        locationId: testLocationId1,
        minQuantity: 10,
        maxQuantity: 100,
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("already exists");
  });

  it("returns HTTP 404 when product or location does not exist", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";

    const res = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: fakeId,
        locationId: testLocationId1,
        minQuantity: 10,
      }),
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 3. Get Reordering Rule Details (GET /api/reordering-rules/:id)
  // -------------------------------------------------------------------------
  it("retrieves reordering rule details with enriched product and location names", async () => {
    const targetId = createdRuleIds[0];

    const res = await app.request(`/api/reordering-rules/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
    expect(body.data.productName).toBeDefined();
    expect(body.data.locationName).toBeDefined();
    expect(body.data.warehouseName).toBeDefined();
  });

  it("returns HTTP 404 for non-existent rule ID", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";

    const res = await app.request(`/api/reordering-rules/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 4. List Reordering Rules (GET /api/reordering-rules)
  // -------------------------------------------------------------------------
  it("lists reordering rules with pagination and filters", async () => {
    const res = await app.request(
      `/api/reordering-rules?productId=${testProductId1}&page=1&limit=10`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(body.data[0].productId).toBe(testProductId1);
  });

  // -------------------------------------------------------------------------
  // 5. Update Reordering Rule (PATCH /api/reordering-rules/:id)
  // -------------------------------------------------------------------------
  it("updates reordering rule quantities successfully", async () => {
    const targetId = createdRuleIds[0];

    const res = await app.request(`/api/reordering-rules/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        minQuantity: 75,
        maxQuantity: 300,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Number(body.data.minQuantity)).toBe(75);
    expect(Number(body.data.maxQuantity)).toBe(300);
  });

  it("rejects update when updated minQuantity exceeds maxQuantity", async () => {
    const targetId = createdRuleIds[0];

    const res = await app.request(`/api/reordering-rules/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        minQuantity: 500, // exceeds current max (300)
      }),
    });

    expect(res.status).toBe(400);
  });

  // -------------------------------------------------------------------------
  // 6. Delete Reordering Rule (DELETE /api/reordering-rules/:id)
  // -------------------------------------------------------------------------
  it("deletes a reordering rule successfully", async () => {
    // Create temporary rule
    const createRes = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: testProductId2,
        locationId: testLocationId2,
        minQuantity: 10,
        maxQuantity: 50,
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/reordering-rules/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify it no longer exists
    const getRes = await app.request(`/api/reordering-rules/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 7. Stock Isolation Verification
  // -------------------------------------------------------------------------
  it("verifies Reordering Rules CRUD operations do NOT modify stock balances or movements", async () => {
    const initialBalances = await db.select().from(stockBalances);
    const initialMovements = await db.select().from(stockMovements);

    const createRes = await app.request("/api/reordering-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        productId: testProductId1,
        locationId: testLocationId2,
        minQuantity: 20,
        maxQuantity: 100,
      }),
    });

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    createdRuleIds.push(createBody.data.id);

    const finalBalances = await db.select().from(stockBalances);
    const finalMovements = await db.select().from(stockMovements);

    expect(finalBalances.length).toBe(initialBalances.length);
    expect(finalMovements.length).toBe(initialMovements.length);
  });
});
