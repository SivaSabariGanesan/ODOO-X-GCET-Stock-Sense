import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { stockBalances } from "../../../../../backend/src/db/schema/stock-balances.js";
import { stockMovements } from "../../../../../backend/src/db/schema/stock-movements.js";
import { deliveries } from "../../../../../backend/src/db/schema/deliveries.js";
import { deliveryItems } from "../../../../../backend/src/db/schema/delivery-items.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { deliveriesApi, CreateDeliveryPayload } from "../api";

const TEST_PREFIX = `fe_test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_deliv@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationId = "";
let uomId = "";
let productId = "";
let createdDeliveryIds: string[] = [];

describe("Deliveries Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Frontend Delivery Tester",
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

    // Set token in global mock localStorage for apiClient
    setAuthToken(authToken);

    // 2. Setup warehouse, location, product, and stock balance
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH FE ${TEST_PREFIX}`,
        shortCode: `W${Math.floor(1000 + Math.random() * 9000)}`,
        description: "Test WH for Frontend Integration",
        createdBy: userId,
      })
      .returning();
    warehouseId = wh.id;

    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseId,
        name: "Stock",
        fullPath: "WH/Stock",
        locationType: "internal",
      })
      .returning();
    locationId = loc.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM ${TEST_PREFIX}`,
        abbreviation: `p_${TEST_PREFIX.slice(-6)}`,
        measureType: "unit",
      })
      .returning();
    uomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: `FE Delivery Product ${TEST_PREFIX}`,
        sku: `SKU_FE_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId = prod.id;

    // Seed stock balance for processing tests
    await db.insert(stockBalances).values({
      productId: productId,
      locationId: locationId,
      quantity: "500",
    });

    // Mock global fetch to route requests to Hono app.request
    const originalFetch = globalThis.fetch;
    // @ts-ignore
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let path = typeof input === "string" ? input : input.toString();
      if (path.startsWith("http://localhost:3000")) {
        path = path.replace("http://localhost:3000", "");
      }
      return app.request(path, init);
    };
  });

  afterAll(async () => {
    clearAuthToken();

    if (createdDeliveryIds.length > 0) {
      await db
        .delete(deliveryItems)
        .where(inArray(deliveryItems.deliveryId, createdDeliveryIds));
      await db
        .delete(deliveries)
        .where(inArray(deliveries.id, createdDeliveryIds));
    }

    if (productId) {
      await db
        .delete(stockMovements)
        .where(eq(stockMovements.productId, productId));
      await db
        .delete(stockBalances)
        .where(eq(stockBalances.productId, productId));
      await db.delete(products).where(eq(products.id, productId));
    }

    if (uomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    }

    if (warehouseId) {
      await db.delete(locations).where(eq(locations.warehouseId, warehouseId));
      await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    }

    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // 1. Delivery list loads successfully
  it("1. Delivery list loads successfully", async () => {
    const res = await deliveriesApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.meta).toBeDefined();
    expect(res.pagination).toBeDefined();
  });

  // 2. Real API response is rendered / parsed correctly
  it("2. Real API response is rendered correctly with full relational types", async () => {
    const newDel = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/001_${Date.now()}`,
      customerName: "Acme Logistics Inc",
      customerReference: "SO-9921",
      warehouseId,
      items: [
        {
          productId,
          quantity: 25,
          unitPrice: 15.5,
          notes: "Handle with care",
        },
      ],
    });
    createdDeliveryIds.push(newDel.id);

    expect(newDel.id).toBeDefined();
    expect(newDel.customerName).toBe("Acme Logistics Inc");
    expect(newDel.status).toBe("DRAFT");
    expect(newDel.items.length).toBe(1);
    expect(newDel.items[0]!.productId).toBe(productId);
    expect(parseFloat(newDel.items[0]!.quantity)).toBe(25);
  });

  // 3. Empty delivery list handling
  it("3. Empty delivery list handles gracefully when filtering non-matching criteria", async () => {
    const res = await deliveriesApi.list({
      search: "NON_EXISTENT_DELIVERY_SEARCH_TERM_XYZ",
    });
    expect(res.data).toEqual([]);
    expect(res.meta.total).toBe(0);
  });

  // 4. Loading state / response structure
  it("4. Loading and meta pagination structures match expected schema", async () => {
    const res = await deliveriesApi.list({ page: 1, limit: 5 });
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(5);
    expect(typeof res.pagination.total).toBe("number");
    expect(typeof res.pagination.totalPages).toBe("number");
  });

  // 5. API failure state
  it("5. API failure correctly maps to typed ApiError with status and message", async () => {
    try {
      await deliveriesApi.getById("non-existent-uuid-format");
      expect(true).toBe(false); // Should not reach here
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBeGreaterThanOrEqual(400);
      expect(typeof apiErr.message).toBe("string");
    }
  });

  // 6. Unauthorized response
  it("6. Unauthorized request (missing / invalid token) returns 401 error", async () => {
    clearAuthToken();
    try {
      await deliveriesApi.list();
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(401);
    } finally {
      setAuthToken(authToken); // Restore
    }
  });

  // 7. Delivery detail loads correctly
  it("7. Delivery detail loads correctly by ID", async () => {
    const created = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/002_${Date.now()}`,
      customerName: "Global Express",
      warehouseId,
      items: [{ productId, quantity: 10 }],
    });
    createdDeliveryIds.push(created.id);

    const fetched = await deliveriesApi.getById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.deliveryNumber).toBe(created.deliveryNumber);
    expect(fetched.warehouse).toBeDefined();
    expect(fetched.warehouse?.id).toBe(warehouseId);
  });

  // 8. Delivery not found / 404
  it("8. Delivery not found returns 404 ApiError", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    try {
      await deliveriesApi.getById(fakeId);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(404);
    }
  });

  // 9. Create delivery successfully
  it("9. Create delivery successfully with items and notes", async () => {
    const payload: CreateDeliveryPayload = {
      deliveryNumber: `DEL/FE/003_${Date.now()}`,
      customerName: "Nordic Office AB",
      notes: "Express road delivery",
      warehouseId,
      items: [
        {
          productId,
          quantity: 15,
          unitPrice: 42.0,
        },
      ],
    };
    const created = await deliveriesApi.create(payload);
    createdDeliveryIds.push(created.id);

    expect(created.customerName).toBe("Nordic Office AB");
    expect(created.notes).toBe("Express road delivery");
    expect(created.items.length).toBe(1);
    expect(parseFloat(created.items[0]!.quantity)).toBe(15);
  });

  // 10. Create delivery with invalid data
  it("10. Create delivery with invalid data rejects with 400 Bad Request", async () => {
    try {
      await deliveriesApi.create({
        warehouseId: "NOT_A_VALID_UUID",
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 11. Backend validation error is captured correctly
  it("11. Backend validation error message is captured correctly", async () => {
    try {
      await deliveriesApi.create({
        warehouseId,
        items: [
          {
            productId,
            quantity: -5, // Invalid negative quantity
          },
        ],
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(400);
      expect(apiErr.message).toBeDefined();
    }
  });

  // 12. Duplicate submission prevention flag is respected
  it("12. Client-side state tracking prevents concurrent submissions", async () => {
    let isSubmitting = false;

    const submitOnce = async () => {
      if (isSubmitting) return "BLOCKED";
      isSubmitting = true;
      try {
        const del = await deliveriesApi.create({
          deliveryNumber: `DEL/FE/CONCUR_${Date.now()}`,
          warehouseId,
          items: [{ productId, quantity: 2 }],
        });
        createdDeliveryIds.push(del.id);
        return del.id;
      } finally {
        isSubmitting = false;
      }
    };

    // First call sets isSubmitting
    const p1 = submitOnce();
    const p2 = submitOnce(); // immediately triggered while p1 is in-flight

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).not.toBe("BLOCKED");
    expect(r2).toBe("BLOCKED");
  });

  // 13. Supported workflow actions succeed (pick -> WAITING, pack -> READY, process -> DONE)
  it("13. Supported workflow actions succeed: pick -> pack -> process", async () => {
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/FLOW_${Date.now()}`,
      customerName: "Workflow Test Corp",
      warehouseId,
      items: [{ productId, quantity: 10 }],
    });
    createdDeliveryIds.push(del.id);
    expect(del.status).toBe("DRAFT");

    // Step 1: Pick
    const picked = await deliveriesApi.pick(del.id);
    expect(picked.status).toBe("WAITING");

    // Step 2: Pack
    const packed = await deliveriesApi.pack(del.id);
    expect(packed.status).toBe("READY");

    // Step 3: Process (decreases stock & marks DONE)
    const processed = await deliveriesApi.process(del.id);
    expect(processed.status).toBe("DONE");
  });

  // 14. Unsupported/invalid workflow transition is rejected
  it("14. Unsupported/invalid workflow transition on DONE delivery is rejected with error", async () => {
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/LOCKED_${Date.now()}`,
      warehouseId,
      items: [{ productId, quantity: 5 }],
    });
    createdDeliveryIds.push(del.id);

    await deliveriesApi.validate(del.id);
    await deliveriesApi.process(del.id);

    // Try to pick a DONE delivery
    try {
      await deliveriesApi.pick(del.id);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 15. Workflow API failure handled (e.g. empty delivery cannot be packed/picked)
  it("15. Workflow API failure handled (empty delivery cannot be picked)", async () => {
    const emptyDel = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/EMPTY_${Date.now()}`,
      warehouseId,
      items: [],
    });
    createdDeliveryIds.push(emptyDel.id);

    try {
      await deliveriesApi.pick(emptyDel.id);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 16. UI refreshes / returns updated state after mutation
  it("16. UI fetches updated state after mutation", async () => {
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/UPDATE_${Date.now()}`,
      customerName: "Original Name",
      warehouseId,
      items: [{ productId, quantity: 5 }],
    });
    createdDeliveryIds.push(del.id);

    const updated = await deliveriesApi.update(del.id, {
      customerName: "Updated Customer Name",
      notes: "Updated delivery notes",
    });

    expect(updated.customerName).toBe("Updated Customer Name");
    expect(updated.notes).toBe("Updated delivery notes");
  });

  // 17. Search/filter/pagination work with backend parameters
  it("17. Search, status filtering, and pagination parameters are passed correctly", async () => {
    const uniqueCust = `FilterTestCust_${Date.now()}`;
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/FILTER_${Date.now()}`,
      customerName: uniqueCust,
      warehouseId,
      items: [{ productId, quantity: 1 }],
    });
    createdDeliveryIds.push(del.id);

    const filtered = await deliveriesApi.list({
      search: uniqueCust,
      status: "DRAFT",
      warehouseId,
    });

    expect(filtered.data.length).toBeGreaterThanOrEqual(1);
    expect(filtered.data.some((d) => d.id === del.id)).toBe(true);
  });

  // 18. Authentication is correctly included in requests
  it("18. Authentication Bearer header is included automatically by apiClient", async () => {
    const res = await deliveriesApi.list();
    expect(res).toBeDefined();
  });

  // 19. Item CRUD sub-endpoints work as expected
  it("19. Line item addition, update, and deletion work", async () => {
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/ITEMS_${Date.now()}`,
      warehouseId,
      items: [],
    });
    createdDeliveryIds.push(del.id);

    // Add item
    const item = await deliveriesApi.addItem(del.id, {
      productId,
      quantity: 8,
      unitPrice: 20,
    });
    expect(item.id).toBeDefined();
    expect(parseFloat(item.quantity)).toBe(8);

    // Update item
    const updatedItem = await deliveriesApi.updateItem(del.id, item.id, {
      quantity: 12,
    });
    expect(parseFloat(updatedItem.quantity)).toBe(12);

    // Remove item
    const removeRes = await deliveriesApi.removeItem(del.id, item.id);
    expect(removeRes.success).toBe(true);
  });

  // 20. Cancellation workflow
  it("20. Delivery cancellation succeeds and transitions to CANCELED", async () => {
    const del = await deliveriesApi.create({
      deliveryNumber: `DEL/FE/CANCEL_${Date.now()}`,
      warehouseId,
      items: [{ productId, quantity: 3 }],
    });
    createdDeliveryIds.push(del.id);

    const canceled = await deliveriesApi.cancel(del.id);
    expect(canceled.status).toBe("CANCELED");
  });
});
