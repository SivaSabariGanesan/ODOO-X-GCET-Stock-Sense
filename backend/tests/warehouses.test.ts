import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `wh_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let createdWarehouseIds: string[] = [];
let createdLocationIds: string[] = [];

describe("StockSense Warehouse CRUD Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Warehouse CRUD Tester",
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
  });

  afterAll(async () => {
    // Cleanup created records in reverse foreign-key order
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
    const res = await app.request("/api/warehouses", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create Warehouse (POST /api/warehouses)
  // -------------------------------------------------------------------------
  it("creates a new warehouse successfully with valid parameters", async () => {
    const whName = `Central Hub ${TEST_TIMESTAMP}`;
    const shortCode = `WH${TEST_TIMESTAMP}`.slice(0, 10);

    const res = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: whName,
        shortCode,
        description: "Primary distribution and storage hub",
        address: "100 Logistics Blvd, Zone A",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe(whName);
    expect(body.data.shortCode).toBe(shortCode);
    expect(body.data.address).toBe("100 Logistics Blvd, Zone A");

    createdWarehouseIds.push(body.data.id);
  });

  it("rejects warehouse creation when required fields are missing", async () => {
    const res = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        description: "Missing name and shortCode",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("enforces warehouse uniqueness and returns HTTP 409 on duplicate name or shortCode", async () => {
    const whName = `Unique WH ${TEST_TIMESTAMP}`;
    const shortCode = `UWH${TEST_TIMESTAMP}`.slice(0, 10);

    // First creation
    const res1 = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: whName, shortCode }),
    });
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    createdWarehouseIds.push(body1.data.id);

    // Second creation with duplicate shortCode
    const res2 = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Another Warehouse Name", shortCode }),
    });

    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toContain("already exists");
  });

  // -------------------------------------------------------------------------
  // 3. Get Warehouse Details (GET /api/warehouses/:id)
  // -------------------------------------------------------------------------
  it("retrieves warehouse details by ID", async () => {
    const targetId = createdWarehouseIds[0];
    const res = await app.request(`/api/warehouses/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
  });

  it("returns HTTP 404 when warehouse ID is not found", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/warehouses/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 4. List Warehouses (GET /api/warehouses)
  // -------------------------------------------------------------------------
  it("lists warehouses with pagination and search filter", async () => {
    const res = await app.request(`/api/warehouses?search=${TEST_TIMESTAMP}&page=1&limit=10`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // 5. Update Warehouse (PATCH /api/warehouses/:id)
  // -------------------------------------------------------------------------
  it("updates warehouse master fields successfully", async () => {
    const targetId = createdWarehouseIds[0];
    const updatedName = `Updated Central Hub ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/warehouses/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: updatedName,
        address: "999 Updated Address Way",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(updatedName);
    expect(body.data.address).toBe("999 Updated Address Way");
  });

  it("rejects update if shortCode conflicts with another warehouse", async () => {
    const targetId = createdWarehouseIds[0];
    const existingShortCode = `UWH${TEST_TIMESTAMP}`.slice(0, 10);

    const res = await app.request(`/api/warehouses/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        shortCode: existingShortCode,
      }),
    });

    expect(res.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  // 6. Delete Warehouse (DELETE /api/warehouses/:id)
  // -------------------------------------------------------------------------
  it("hard deletes an unreferenced warehouse", async () => {
    // Create temporary unreferenced warehouse
    const createRes = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Temp WH ${TEST_TIMESTAMP}`,
        shortCode: `TMP${TEST_TIMESTAMP}`.slice(0, 10),
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/warehouses/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify it no longer exists
    const getRes = await app.request(`/api/warehouses/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  it("deactivates a warehouse referenced by locations to preserve system data integrity", async () => {
    const targetId = createdWarehouseIds[0];

    // Insert a location belonging to targetId
    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: targetId,
        name: `Zone 1 Rack A ${TEST_TIMESTAMP}`,
        shortCode: `LOC${TEST_TIMESTAMP}`.slice(0, 10),
        fullPath: `WH/Zone1/RackA/${TEST_TIMESTAMP}`,
        type: "internal",
      })
      .returning();
    createdLocationIds.push(loc.id);

    // Attempt DELETE
    const delRes = await app.request(`/api/warehouses/${targetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deactivated");

    // Verify warehouse isActive is set to false
    const getRes = await app.request(`/api/warehouses/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getBody = await getRes.json();
    expect(getBody.data.isActive).toBeFalse();
  });

  // -------------------------------------------------------------------------
  // 7. Stock Isolation Verification
  // -------------------------------------------------------------------------
  it("verifies Warehouse CRUD operations do NOT create stock balances or movements", async () => {
    // Query stock balances and stock movements table count to confirm isolation
    const initialBalances = await db.select().from(stockBalances);
    const initialMovements = await db.select().from(stockMovements);

    // Perform a Warehouse creation
    const createRes = await app.request("/api/warehouses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Isolated WH ${TEST_TIMESTAMP}`,
        shortCode: `ISO${TEST_TIMESTAMP}`.slice(0, 10),
      }),
    });
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    createdWarehouseIds.push(createBody.data.id);

    const finalBalances = await db.select().from(stockBalances);
    const finalMovements = await db.select().from(stockMovements);

    expect(finalBalances.length).toBe(initialBalances.length);
    expect(finalMovements.length).toBe(initialMovements.length);
  });
});
