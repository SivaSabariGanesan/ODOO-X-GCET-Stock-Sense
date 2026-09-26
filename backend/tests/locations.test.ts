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
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `loc_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let primaryWarehouseId = "";
let secondaryWarehouseId = "";
let testUomId = "";
let createdWarehouseIds: string[] = [];
let createdLocationIds: string[] = [];
let createdProductIds: string[] = [];
let createdUomIds: string[] = [];

describe("StockSense Location CRUD & Hierarchy Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Location CRUD Tester",
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

    // 2. Setup test warehouses
    const [wh1] = await db
      .insert(warehouses)
      .values({
        name: `Primary WH ${TEST_TIMESTAMP}`,
        shortCode: `WHA${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    primaryWarehouseId = wh1.id;
    createdWarehouseIds.push(wh1.id);

    const [wh2] = await db
      .insert(warehouses)
      .values({
        name: `Secondary WH ${TEST_TIMESTAMP}`,
        shortCode: `WHB${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    secondaryWarehouseId = wh2.id;
    createdWarehouseIds.push(wh2.id);

    // 3. Setup test UOM for product referencing
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Loc Unit ${TEST_TIMESTAMP}`,
        abbreviation: `lu${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    testUomId = uom.id;
    createdUomIds.push(uom.id);
  });

  afterAll(async () => {
    // Cleanup records in reverse foreign-key order
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
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/locations", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create Location (POST /api/locations)
  // -------------------------------------------------------------------------
  it("creates a root location successfully with valid parameters", async () => {
    const res = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: primaryWarehouseId,
        name: `Zone A ${TEST_TIMESTAMP}`,
        locationType: "internal",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe(`Zone A ${TEST_TIMESTAMP}`);
    expect(body.data.warehouseId).toBe(primaryWarehouseId);
    expect(body.data.fullPath).toContain(`Zone A ${TEST_TIMESTAMP}`);

    createdLocationIds.push(body.data.id);
  });

  it("creates a child location under an existing parent location", async () => {
    const parentId = createdLocationIds[0];

    const res = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: primaryWarehouseId,
        parentId,
        name: `Shelf A-1 ${TEST_TIMESTAMP}`,
        locationType: "internal",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.parentId).toBe(parentId);
    expect(body.data.fullPath).toContain("/");

    createdLocationIds.push(body.data.id);
  });

  it("rejects location creation when required fields are missing", async () => {
    const res = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        locationType: "internal",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("returns HTTP 404 when warehouseId does not exist", async () => {
    const fakeWarehouseId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: fakeWarehouseId,
        name: "Invalid WH Loc",
      }),
    });

    expect(res.status).toBe(404);
  });

  it("rejects cross-warehouse parent assignment", async () => {
    // Attempt to create a location in secondaryWarehouseId using parentId from primaryWarehouseId
    const primaryParentId = createdLocationIds[0];

    const res = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: secondaryWarehouseId,
        parentId: primaryParentId,
        name: "Cross WH Loc",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("same warehouse");
  });

  // -------------------------------------------------------------------------
  // 3. Location Hierarchy & Circular Dependency Detection
  // -------------------------------------------------------------------------
  it("detects and rejects circular parent hierarchy during location update", async () => {
    const parentId = createdLocationIds[0];
    const childId = createdLocationIds[1];

    // Try setting parentId of parent location to its child location (creating circular loop A -> B -> A)
    const res = await app.request(`/api/locations/${parentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        parentId: childId,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Circular");
  });

  it("rejects self-parenting on update", async () => {
    const targetId = createdLocationIds[0];

    const res = await app.request(`/api/locations/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        parentId: targetId,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("own parent");
  });

  // -------------------------------------------------------------------------
  // 4. Get Location Details (GET /api/locations/:id)
  // -------------------------------------------------------------------------
  it("retrieves location details with warehouse metadata and child count", async () => {
    const targetId = createdLocationIds[0];
    const res = await app.request(`/api/locations/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
    expect(body.data.warehouseName).toBeDefined();
    expect(body.data.childrenCount).toBeGreaterThanOrEqual(1);
  });

  it("returns HTTP 404 when location ID is not found", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/locations/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 5. List Locations (GET /api/locations)
  // -------------------------------------------------------------------------
  it("lists locations with pagination, warehouse filter, and search", async () => {
    const res = await app.request(
      `/api/locations?warehouseId=${primaryWarehouseId}&search=${TEST_TIMESTAMP}&page=1&limit=10`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // 6. Update Location (PATCH /api/locations/:id)
  // -------------------------------------------------------------------------
  it("updates location master fields and propagates fullPath changes to children", async () => {
    const parentId = createdLocationIds[0];
    const childId = createdLocationIds[1];
    const updatedParentName = `Renamed Zone A ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/locations/${parentId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: updatedParentName,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(updatedParentName);

    // Verify child location fullPath was automatically updated
    const childRes = await app.request(`/api/locations/${childId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const childBody = await childRes.json();
    expect(childBody.data.fullPath).toContain(updatedParentName);
  });

  // -------------------------------------------------------------------------
  // 7. Delete Location (DELETE /api/locations/:id)
  // -------------------------------------------------------------------------
  it("rejects deletion of a location that has child locations", async () => {
    const parentId = createdLocationIds[0];

    const res = await app.request(`/api/locations/${parentId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("child locations");
  });

  it("hard deletes an unreferenced leaf location", async () => {
    // Create temporary leaf location
    const createRes = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: primaryWarehouseId,
        name: `Temp Leaf ${TEST_TIMESTAMP}`,
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/locations/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify no longer exists
    const getRes = await app.request(`/api/locations/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  it("deactivates a location referenced by stock balances to preserve data integrity", async () => {
    const childId = createdLocationIds[1];

    // Create test product and stock balance referencing childId
    const [prod] = await db
      .insert(products)
      .values({
        name: `Loc Test Product ${TEST_TIMESTAMP}`,
        sku: `SKU_LOC_${TEST_TIMESTAMP}`,
        uomId: testUomId,
      })
      .returning();
    createdProductIds.push(prod.id);

    await db.insert(stockBalances).values({
      productId: prod.id,
      locationId: childId,
      warehouseId: primaryWarehouseId,
      quantity: "15.00",
    });

    // Attempt DELETE
    const delRes = await app.request(`/api/locations/${childId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deactivated");

    // Verify location isActive is now false
    const getRes = await app.request(`/api/locations/${childId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getBody = await getRes.json();
    expect(getBody.data.isActive).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // 8. Stock Isolation Verification
  // -------------------------------------------------------------------------
  it("verifies Location CRUD operations do NOT create stock balances or movements", async () => {
    const initialBalances = await db.select().from(stockBalances);
    const initialMovements = await db.select().from(stockMovements);

    const createRes = await app.request("/api/locations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        warehouseId: primaryWarehouseId,
        name: `Isolated Loc ${TEST_TIMESTAMP}`,
      }),
    });

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    createdLocationIds.push(createBody.data.id);

    const finalBalances = await db.select().from(stockBalances);
    const finalMovements = await db.select().from(stockMovements);

    expect(finalBalances.length).toBe(initialBalances.length);
    expect(finalMovements.length).toBe(initialMovements.length);
  });
});
