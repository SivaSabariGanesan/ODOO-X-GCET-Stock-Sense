import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { categories } from "../src/db/schema/categories.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `cat_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let uomId = "";

let createdCategoryIds: string[] = [];
let createdProductIds: string[] = [];

describe("StockSense Category CRUD Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Category CRUD Tester",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: "admin",
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

    // 2. Insert dummy UOM for testing product references
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Units ${TEST_TIMESTAMP}`,
        abbreviation: `u${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomId = uom.id;
  });

  afterAll(async () => {
    // Cleanup
    if (createdProductIds.length > 0) {
      await db.delete(products).where(inArray(products.id, createdProductIds));
    }
    if (createdCategoryIds.length > 0) {
      await db.delete(categories).where(inArray(categories.id, createdCategoryIds));
    }
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/categories", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create Category (POST /api/categories)
  // -------------------------------------------------------------------------
  it("creates a new category successfully with valid parameters", async () => {
    const catName = `Raw Materials ${TEST_TIMESTAMP}`;
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: catName,
        description: "Primary inputs for manufacturing",
        color: "#3B82F6",
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.name).toBe(catName);
    expect(body.data.color).toBe("#3B82F6");

    createdCategoryIds.push(body.data.id);
  });

  it("rejects category creation when required name is missing", async () => {
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        description: "Category without name",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects category creation with invalid color hex format", async () => {
    const res = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Invalid Color Cat ${TEST_TIMESTAMP}`,
        color: "NOT_HEX",
      }),
    });

    expect(res.status).toBe(400);
  });

  it("enforces category name uniqueness and returns HTTP 409", async () => {
    const catName = `Unique Cat ${TEST_TIMESTAMP}`;

    // First creation
    const res1 = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: catName }),
    });
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    createdCategoryIds.push(body1.data.id);

    // Second creation with duplicate name
    const res2 = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: catName }),
    });

    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toContain("already exists");
  });

  // -------------------------------------------------------------------------
  // 3. Get Category Details (GET /api/categories/:id)
  // -------------------------------------------------------------------------
  it("retrieves category details by ID", async () => {
    const targetId = createdCategoryIds[0];
    const res = await app.request(`/api/categories/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
  });

  it("returns HTTP 404 when category ID is not found", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/categories/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // 4. List Categories (GET /api/categories)
  // -------------------------------------------------------------------------
  it("lists categories with pagination and search", async () => {
    const res = await app.request(`/api/categories?search=${TEST_TIMESTAMP}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // 5. Update Category (PATCH /api/categories/:id)
  // -------------------------------------------------------------------------
  it("updates category master fields successfully", async () => {
    const targetId = createdCategoryIds[0];
    const updatedName = `Updated Raw Materials ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/categories/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: updatedName,
        description: "Updated category description",
        color: "#10B981",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(updatedName);
    expect(body.data.color).toBe("#10B981");
  });

  it("rejects update if name conflicts with another category", async () => {
    const targetId = createdCategoryIds[0];
    const duplicateName = `Unique Cat ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/categories/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: duplicateName,
      }),
    });

    expect(res.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  // 6. Delete Category (DELETE /api/categories/:id)
  // -------------------------------------------------------------------------
  it("hard deletes an unreferenced category", async () => {
    // Create temporary unreferenced category
    const createRes = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Temp Cat ${TEST_TIMESTAMP}`,
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/categories/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify it no longer exists
    const getRes = await app.request(`/api/categories/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  it("deactivates a category referenced by products to preserve data integrity", async () => {
    const targetId = createdCategoryIds[0];

    // Create a product referencing targetId
    const [p] = await db
      .insert(products)
      .values({
        name: `Product in Category ${TEST_TIMESTAMP}`,
        sku: `SKU_CAT_TEST_${TEST_TIMESTAMP}`,
        categoryId: targetId,
        uomId,
      })
      .returning();
    createdProductIds.push(p.id);

    // Attempt DELETE
    const delRes = await app.request(`/api/categories/${targetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deactivated");

    // Verify category isActive is now false
    const getRes = await app.request(`/api/categories/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getBody = await getRes.json();
    expect(getBody.data.isActive).toBeFalse();
  });
});
