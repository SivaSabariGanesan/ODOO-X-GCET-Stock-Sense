import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `uom_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";

let createdUomIds: string[] = [];
let createdProductIds: string[] = [];

describe("StockSense Unit of Measure (UOM) CRUD Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "UOM CRUD Tester",
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
    // Cleanup
    if (createdProductIds.length > 0) {
      await db.delete(products).where(inArray(products.id, createdProductIds));
    }
    if (createdUomIds.length > 0) {
      await db.delete(unitsOfMeasure).where(inArray(unitsOfMeasure.id, createdUomIds));
    }
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/uoms", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create UOM (POST /api/uoms)
  // -------------------------------------------------------------------------
  it("creates a new unit of measure successfully with valid parameters", async () => {
    const uomName = `Kilogram ${TEST_TIMESTAMP}`;
    const abbreviation = `kg${TEST_TIMESTAMP}`.slice(0, 10);

    const res = await app.request("/api/uoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: uomName,
        abbreviation,
        description: "Standard unit of mass",
        measureType: "weight",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe(uomName);
    expect(body.data.abbreviation).toBe(abbreviation);

    createdUomIds.push(body.data.id);
  });

  it("rejects UOM creation when required name or abbreviation is missing", async () => {
    const res = await app.request("/api/uoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Missing Abbreviation UOM",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("enforces UOM uniqueness and returns HTTP 409 on duplicate name or abbreviation", async () => {
    const uomName = `Unique UOM ${TEST_TIMESTAMP}`;
    const abbreviation = `uom${TEST_TIMESTAMP}`.slice(0, 10);

    // First creation
    const res1 = await app.request("/api/uoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: uomName, abbreviation }),
    });
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    createdUomIds.push(body1.data.id);

    // Second creation with duplicate abbreviation
    const res2 = await app.request("/api/uoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Different Name", abbreviation }),
    });

    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toContain("already exists");
  });

  // -------------------------------------------------------------------------
  // 3. Get UOM Details (GET /api/uoms/:id)
  // -------------------------------------------------------------------------
  it("retrieves unit of measure details by ID", async () => {
    const targetId = createdUomIds[0];
    const res = await app.request(`/api/uoms/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
  });

  it("returns HTTP 404 when UOM ID is not found", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/uoms/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 4. List UOMs (GET /api/uoms)
  // -------------------------------------------------------------------------
  it("lists UOMs with pagination, search, and measureType filter", async () => {
    const res = await app.request(`/api/uoms?search=${TEST_TIMESTAMP}&measureType=weight`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    body.data.forEach((u: any) => {
      expect(u.measureType).toBe("weight");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Update UOM (PATCH /api/uoms/:id)
  // -------------------------------------------------------------------------
  it("updates UOM master fields successfully", async () => {
    const targetId = createdUomIds[0];
    const updatedName = `Updated Kilogram ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/uoms/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: updatedName,
        description: "Updated unit description",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(updatedName);
    expect(body.data.description).toBe("Updated unit description");
  });

  it("rejects update if abbreviation conflicts with another UOM", async () => {
    const targetId = createdUomIds[0];
    const existingAbbr = `uom${TEST_TIMESTAMP}`.slice(0, 10);

    const res = await app.request(`/api/uoms/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        abbreviation: existingAbbr,
      }),
    });

    expect(res.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  // 6. Delete UOM (DELETE /api/uoms/:id)
  // -------------------------------------------------------------------------
  it("hard deletes an unreferenced UOM", async () => {
    // Create temporary unreferenced UOM
    const createRes = await app.request("/api/uoms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Temp UOM ${TEST_TIMESTAMP}`,
        abbreviation: `tmp${TEST_TIMESTAMP}`.slice(0, 10),
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/uoms/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify it no longer exists
    const getRes = await app.request(`/api/uoms/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  it("deactivates a UOM referenced by products to preserve data integrity", async () => {
    const targetId = createdUomIds[0];

    // Create a product referencing targetId
    const [p] = await db
      .insert(products)
      .values({
        name: `Product with UOM ${TEST_TIMESTAMP}`,
        sku: `SKU_UOM_TEST_${TEST_TIMESTAMP}`,
        uomId: targetId,
      })
      .returning();
    createdProductIds.push(p.id);

    // Attempt DELETE
    const delRes = await app.request(`/api/uoms/${targetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deactivated");

    // Verify UOM isActive is now false
    const getRes = await app.request(`/api/uoms/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getBody = await getRes.json();
    expect(getBody.data.isActive).toBeFalse();
  });
});
