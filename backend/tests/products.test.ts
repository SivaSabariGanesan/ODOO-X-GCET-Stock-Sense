import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { categories } from "../src/db/schema/categories.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `product_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let categoryId = "";
let uomId = "";

let createdProductIds: string[] = [];

describe("StockSense Product CRUD Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Product CRUD Tester",
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

    // 2. Create prerequisite Category and UOM
    const [cat] = await db
      .insert(categories)
      .values({
        name: `Raw Materials ${TEST_TIMESTAMP}`,
        description: "Category for testing",
      })
      .returning();
    categoryId = cat.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Kilogram ${TEST_TIMESTAMP}`,
        abbreviation: `kg${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomId = uom.id;
  });

  afterAll(async () => {
    // Cleanup created test products, categories, uom, and user
    if (createdProductIds.length > 0) {
      await db.delete(stockMovements).where(inArray(stockMovements.productId, createdProductIds));
      await db.delete(stockBalances).where(inArray(stockBalances.productId, createdProductIds));
      await db.delete(products).where(inArray(products.id, createdProductIds));
    }
    await db.delete(categories).where(eq(categories.id, categoryId));
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Authentication & Security
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests with HTTP 401", async () => {
    const res = await app.request("/api/products", {
      method: "GET",
    });

    expect(res.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // 2. Create Product (POST /api/products)
  // -------------------------------------------------------------------------
  it("creates a new product successfully with valid details", async () => {
    const sku = `PROD_${TEST_TIMESTAMP}_001`;
    const res = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: `Steel Pipe ${TEST_TIMESTAMP}`,
        sku,
        description: "High durability steel pipe",
        categoryId,
        uomId,
        barcode: `BC_${TEST_TIMESTAMP}_001`,
        isActive: true,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBeDefined();
    expect(body.data.sku).toBe(sku);
    expect(body.data.category.id).toBe(categoryId);
    expect(body.data.uom.id).toBe(uomId);

    createdProductIds.push(body.data.id);
  });

  it("rejects product creation when required fields are missing", async () => {
    const res = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Product Without SKU",
        uomId,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("rejects product creation with a nonexistent category ID", async () => {
    const fakeCatId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Product With Fake Category",
        sku: `FAKE_CAT_${TEST_TIMESTAMP}`,
        categoryId: fakeCatId,
        uomId,
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Category with ID");
  });

  it("rejects product creation with a nonexistent UOM ID", async () => {
    const fakeUomId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Product With Fake UOM",
        sku: `FAKE_UOM_${TEST_TIMESTAMP}`,
        uomId: fakeUomId,
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Unit of Measure with ID");
  });

  it("enforces SKU uniqueness and returns HTTP 409 on duplicate SKU", async () => {
    const sku = `PROD_${TEST_TIMESTAMP}_DUP`;

    // First creation
    const res1 = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Original Product",
        sku,
        uomId,
      }),
    });
    expect(res1.status).toBe(201);
    const body1 = await res1.json();
    createdProductIds.push(body1.data.id);

    // Duplicate creation
    const res2 = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Duplicate Product",
        sku,
        uomId,
      }),
    });

    expect(res2.status).toBe(409);
    const body2 = await res2.json();
    expect(body2.error).toContain("already exists");
  });

  // -------------------------------------------------------------------------
  // 3. Get Product Details (GET /api/products/:id)
  // -------------------------------------------------------------------------
  it("retrieves product details by ID", async () => {
    const targetId = createdProductIds[0];
    const res = await app.request(`/api/products/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe(targetId);
    expect(body.data.category).toBeDefined();
    expect(body.data.uom).toBeDefined();
  });

  it("returns HTTP 404 when product ID is not found", async () => {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const res = await app.request(`/api/products/${fakeId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain("Product with ID");
  });

  // -------------------------------------------------------------------------
  // 4. List Products (GET /api/products)
  // -------------------------------------------------------------------------
  it("lists products with pagination and category/uom filters", async () => {
    const res = await app.request(`/api/products?categoryId=${categoryId}&limit=10`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.pagination.total).toBeGreaterThanOrEqual(1);
    body.data.forEach((p: any) => {
      expect(p.categoryId).toBe(categoryId);
    });
  });

  it("searches products by name or SKU", async () => {
    const searchSku = `PROD_${TEST_TIMESTAMP}_001`;
    const res = await app.request(`/api/products?search=${searchSku}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0].sku).toBe(searchSku);
  });

  // -------------------------------------------------------------------------
  // 5. Update Product (PATCH /api/products/:id)
  // -------------------------------------------------------------------------
  it("updates product master fields successfully", async () => {
    const targetId = createdProductIds[0];
    const newName = `Updated Steel Pipe ${TEST_TIMESTAMP}`;

    const res = await app.request(`/api/products/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: newName,
        description: "Updated description text",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe(newName);
    expect(body.data.description).toBe("Updated description text");
  });

  it("rejects update if SKU is changed to an existing SKU", async () => {
    const targetId = createdProductIds[0];
    const existingSku = `PROD_${TEST_TIMESTAMP}_DUP`;

    const res = await app.request(`/api/products/${targetId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sku: existingSku,
      }),
    });

    expect(res.status).toBe(409);
  });

  // -------------------------------------------------------------------------
  // 6. Delete Product (DELETE /api/products/:id)
  // -------------------------------------------------------------------------
  it("hard deletes an unreferenced product", async () => {
    // Create a temporary unreferenced product
    const createRes = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Temporary Unreferenced Product",
        sku: `TEMP_${TEST_TIMESTAMP}`,
        uomId,
      }),
    });
    const createBody = await createRes.json();
    const tempId = createBody.data.id;

    // Delete it
    const delRes = await app.request(`/api/products/${tempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deleted");

    // Verify it is gone
    const getRes = await app.request(`/api/products/${tempId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(getRes.status).toBe(404);
  });

  it("deactivates a product referenced in stock movements to preserve audit data", async () => {
    const targetId = createdProductIds[0];

    // Create a dummy warehouse and location to host a stock movement
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH ${TEST_TIMESTAMP}`,
        shortCode: `WH${TEST_TIMESTAMP}`,
      })
      .returning();

    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: wh.id,
        name: `Loc ${TEST_TIMESTAMP}`,
        fullPath: `WH${TEST_TIMESTAMP}/Loc`,
      })
      .returning();

    // Insert a dummy stock balance reference
    await db.insert(stockBalances).values({
      productId: targetId,
      locationId: loc.id,
      quantity: "50.0000",
    });

    // Attempt DELETE
    const delRes = await app.request(`/api/products/${targetId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.mode).toBe("deactivated");

    // Verify product is now active=false
    const getRes = await app.request(`/api/products/${targetId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const getBody = await getRes.json();
    expect(getBody.data.isActive).toBeFalse();

    // Clean up dummy stock balance and location
    await db.delete(stockBalances).where(eq(stockBalances.productId, targetId));
    await db.delete(locations).where(eq(locations.id, loc.id));
    await db.delete(warehouses).where(eq(warehouses.id, wh.id));
  });

  // -------------------------------------------------------------------------
  // 7. Stock Isolation Guarantee
  // -------------------------------------------------------------------------
  it("guarantees stock isolation: product CRUD never mutates stock balances", async () => {
    const balancesBefore = await db.select().from(stockBalances);
    const movementsBefore = await db.select().from(stockMovements);

    // Create, update, list product
    const pRes = await app.request("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Isolation Test Product",
        sku: `ISO_${TEST_TIMESTAMP}`,
        uomId,
      }),
    });
    const pBody = await pRes.json();
    createdProductIds.push(pBody.data.id);

    await app.request(`/api/products/${pBody.data.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Updated Isolation Name" }),
    });

    const balancesAfter = await db.select().from(stockBalances);
    const movementsAfter = await db.select().from(stockMovements);

    expect(balancesAfter.length).toBe(balancesBefore.length);
    expect(movementsAfter.length).toBe(movementsBefore.length);
  });
});
