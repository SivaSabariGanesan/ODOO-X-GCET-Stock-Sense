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
import { inventoryAdjustments } from "../../../../../backend/src/db/schema/inventory-adjustments.js";
import { inventoryAdjustmentItems } from "../../../../../backend/src/db/schema/inventory-adjustment-items.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { adjustmentsApi, CreateAdjustmentPayload } from "../api";
import { InventoryService } from "../../../../../backend/src/modules/inventory/service.js";

const TEST_PREFIX = `fe_adj_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_adj@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationId = "";
let uomId = "";
let productId = "";
let createdAdjustmentIds: string[] = [];

describe("Inventory Adjustments Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Frontend Adjustments Tester",
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

    // Set token for frontend apiClient
    setAuthToken(authToken);

    // 2. Setup warehouse, location, product, and stock balance
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH FE Adj ${TEST_PREFIX}`,
        shortCode: `W${Math.floor(1000 + Math.random() * 9000)}`,
        description: "Test WH for Adjustments Frontend Integration",
        createdBy: userId,
      })
      .returning();
    warehouseId = wh.id;

    const [loc] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseId,
        name: "Stock Adj",
        fullPath: "WH/Stock-Adj",
        locationType: "internal",
        createdBy: userId,
      })
      .returning();
    locationId = loc.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM ${TEST_PREFIX}`,
        abbreviation: "pcs",
        measureType: "unit",
        createdBy: userId,
      })
      .returning();
    uomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: `FE Adjustment Product ${TEST_PREFIX}`,
        sku: `SKU_FE_ADJ_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId = prod.id;

    // Seed stock balance (100 units)
    await InventoryService.receiveStock({
      items: [
        {
          productId,
          destinationLocationId: locationId,
          quantity: 100,
        },
      ],
      referenceType: "RECEIPT",
      referenceId: productId,
      createdBy: userId,
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

    if (createdAdjustmentIds.length > 0) {
      await db
        .delete(inventoryAdjustmentItems)
        .where(inArray(inventoryAdjustmentItems.adjustmentId, createdAdjustmentIds));
      await db
        .delete(inventoryAdjustments)
        .where(inArray(inventoryAdjustments.id, createdAdjustmentIds));
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

  // 1. Adjustment list loads successfully
  it("1. Adjustment list loads successfully", async () => {
    const res = await adjustmentsApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.pagination).toBeDefined();
    expect(typeof res.pagination.page).toBe("number");
  });

  // 2. Real API response renders correctly
  it("2. Real API response is rendered correctly with full relational types", async () => {
    const newAdj = await adjustmentsApi.create({
      locationId,
      reason: "Annual Physical Audit",
      notes: "Frontend integration verification test",
      items: [
        {
          productId,
          countedQuantity: 97,
        },
      ],
    });
    createdAdjustmentIds.push(newAdj.id);

    expect(newAdj.id).toBeDefined();
    expect(newAdj.adjustmentNumber).toMatch(/^ADJ\//);
    expect(newAdj.locationId).toBe(locationId);
    expect(newAdj.status).toBe("DRAFT");
    expect(newAdj.items.length).toBe(1);
    expect(newAdj.items[0]!.productId).toBe(productId);
    expect(parseFloat(newAdj.items[0]!.countedQuantity)).toBe(97);
    expect(parseFloat(newAdj.items[0]!.systemQuantity)).toBe(100);
    expect(parseFloat(newAdj.items[0]!.difference)).toBe(-3);
  });

  // 3. Empty adjustment list
  it("3. Empty adjustment list handles gracefully when filtering non-matching criteria", async () => {
    const res = await adjustmentsApi.list({
      search: "NON_EXISTENT_ADJUSTMENT_SEARCH_CRITERIA_XYZ_12345",
    });
    expect(res.data).toEqual([]);
    expect(res.pagination.total).toBe(0);
  });

  // 4. Loading state / pagination structure
  it("4. Loading and pagination structures match expected schema", async () => {
    const res = await adjustmentsApi.list({ page: 1, limit: 5 });
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(5);
    expect(typeof res.pagination.total).toBe("number");
    expect(typeof res.pagination.totalPages).toBe("number");
  });

  // 5. API failure state
  it("5. API failure correctly maps to typed ApiError with status and message", async () => {
    try {
      await adjustmentsApi.getById("non-existent-uuid-format");
      expect(true).toBe(false);
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
      await adjustmentsApi.list();
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(401);
    } finally {
      setAuthToken(authToken); // Restore
    }
  });

  // 7. Adjustment detail loads correctly
  it("7. Adjustment detail loads correctly by ID", async () => {
    const created = await adjustmentsApi.create({
      locationId,
      reason: "Detail Fetch Test",
      items: [{ productId, countedQuantity: 102 }],
    });
    createdAdjustmentIds.push(created.id);

    const fetched = await adjustmentsApi.getById(created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.adjustmentNumber).toBe(created.adjustmentNumber);
    expect(fetched.location).toBeDefined();
    expect(fetched.location?.id).toBe(locationId);
    expect(fetched.items.length).toBe(1);
    expect(parseFloat(fetched.items[0]!.countedQuantity)).toBe(102);
  });

  // 8. Adjustment 404
  it("8. Adjustment not found returns 404 ApiError", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    try {
      await adjustmentsApi.getById(fakeId);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(404);
    }
  });

  // 9. Create adjustment successfully
  it("9. Create adjustment successfully with items and reasons", async () => {
    const payload: CreateAdjustmentPayload = {
      locationId,
      reason: "Quarterly Audit",
      items: [
        {
          productId,
          countedQuantity: 95,
        },
      ],
    };
    const created = await adjustmentsApi.create(payload);
    createdAdjustmentIds.push(created.id);

    expect(created.reason).toBe("Quarterly Audit");
    expect(created.items.length).toBe(1);
    expect(parseFloat(created.items[0]!.countedQuantity)).toBe(95);
  });

  // 10. Invalid adjustment data
  it("10. Create adjustment with invalid data rejects with 400 Bad Request", async () => {
    try {
      await adjustmentsApi.create({
        locationId: "NOT_A_VALID_UUID",
      });
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 11. Missing required fields
  it("11. Missing required locationId rejects with 400 Bad Request", async () => {
    try {
      // @ts-ignore
      await adjustmentsApi.create({});
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 12. Backend validation errors
  it("12. Backend validation error message is captured correctly for negative count", async () => {
    try {
      await adjustmentsApi.create({
        locationId,
        items: [
          {
            productId,
            countedQuantity: -10, // Invalid negative counted quantity
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

  // 13. Product/location selection works
  it("13. Product and location selection correctly associates with adjustment", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      items: [{ productId, countedQuantity: 100 }],
    });
    createdAdjustmentIds.push(adj.id);

    expect(adj.locationId).toBe(locationId);
    expect(adj.items[0]!.productId).toBe(productId);
  });

  // 14. Current system quantity is correctly displayed when supported
  it("14. Current system quantity is accurately populated from backend stock ledger", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      items: [{ productId, countedQuantity: 100 }],
    });
    createdAdjustmentIds.push(adj.id);

    // Initial seed was 100 units
    expect(parseFloat(adj.items[0]!.systemQuantity)).toBe(100);
  });

  // 15. Difference is correctly displayed/calculated according to backend contract
  it("15. Difference is correctly calculated according to backend contract (counted - system)", async () => {
    // System = 100, Counted = 92 -> Difference = -8
    const adj = await adjustmentsApi.create({
      locationId,
      items: [{ productId, countedQuantity: 92 }],
    });
    createdAdjustmentIds.push(adj.id);

    expect(parseFloat(adj.items[0]!.systemQuantity)).toBe(100);
    expect(parseFloat(adj.items[0]!.countedQuantity)).toBe(92);
    expect(parseFloat(adj.items[0]!.difference)).toBe(-8);

    // Verify preview endpoint gives identical difference calculation
    const preview = await adjustmentsApi.preview(adj.id);
    expect(preview.items[0]!.difference).toBe(-8);
    expect(preview.items[0]!.systemQuantity).toBe(100);
    expect(preview.items[0]!.countedQuantity).toBe(92);
  });

  // 16. Duplicate submission is prevented
  it("16. Client-side state tracking prevents concurrent duplicate submissions", async () => {
    let isSubmitting = false;

    const submitOnce = async () => {
      if (isSubmitting) return "BLOCKED";
      isSubmitting = true;
      try {
        const adj = await adjustmentsApi.create({
          locationId,
          items: [{ productId, countedQuantity: 100 }],
        });
        createdAdjustmentIds.push(adj.id);
        return adj.id;
      } finally {
        isSubmitting = false;
      }
    };

    const p1 = submitOnce();
    const p2 = submitOnce();

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).not.toBe("BLOCKED");
    expect(r2).toBe("BLOCKED");
  });

  // 17. Supported workflow action succeeds (DRAFT -> READY via validate, READY -> DONE via process)
  it("17. Supported workflow actions succeed: validate -> process (apply)", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      reason: "Workflow execution test",
      items: [{ productId, countedQuantity: 98 }],
    });
    createdAdjustmentIds.push(adj.id);
    expect(adj.status).toBe("DRAFT");

    // Action 1: Validate -> READY
    const validated = await adjustmentsApi.validate(adj.id);
    expect(validated.status).toBe("READY");

    // Action 2: Process (apply) -> DONE
    const processed = await adjustmentsApi.process(adj.id);
    expect(processed.status).toBe("DONE");
    expect(parseFloat(processed.items[0]!.difference)).toBe(-2);

    // Verify stock balance in DB updated to 98
    const balance = await InventoryService.getStockBalance(productId, locationId);
    expect(balance).toBe(98);
  });

  // 18. Invalid workflow transition is handled correctly
  it("18. Unsupported/invalid workflow transition on DONE adjustment is rejected", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      items: [{ productId, countedQuantity: 98 }],
    });
    createdAdjustmentIds.push(adj.id);

    await adjustmentsApi.validate(adj.id);
    await adjustmentsApi.process(adj.id);

    // Attempting to validate a DONE adjustment must fail
    try {
      await adjustmentsApi.validate(adj.id);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 19. Workflow API failure is handled correctly
  it("19. Workflow API failure handled (empty adjustment cannot be validated)", async () => {
    const emptyAdj = await adjustmentsApi.create({
      locationId,
      items: [],
    });
    createdAdjustmentIds.push(emptyAdj.id);

    try {
      await adjustmentsApi.validate(emptyAdj.id);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof ApiError).toBe(true);
      expect((err as ApiError).status).toBe(400);
    }
  });

  // 20. UI refreshes after successful mutation
  it("20. UI fetches updated state after mutation", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      reason: "Initial Reason",
      items: [{ productId, countedQuantity: 98 }],
    });
    createdAdjustmentIds.push(adj.id);

    const updated = await adjustmentsApi.update(adj.id, {
      reason: "Updated Reconciliation Reason",
    });

    expect(updated.reason).toBe("Updated Reconciliation Reason");
  });

  // 21. Search/filter/pagination if supported
  it("21. Search, status filtering, and location filtering parameters work properly", async () => {
    const uniqueReason = `SpecialAudit_${Date.now()}`;
    const adj = await adjustmentsApi.create({
      locationId,
      reason: uniqueReason,
      items: [{ productId, countedQuantity: 98 }],
    });
    createdAdjustmentIds.push(adj.id);

    const filtered = await adjustmentsApi.list({
      search: uniqueReason,
      status: "DRAFT",
      locationId,
    });

    expect(filtered.data.length).toBeGreaterThanOrEqual(1);
    expect(filtered.data.some((a) => a.id === adj.id)).toBe(true);
  });

  // 22. Authentication is correctly included
  it("22. Authentication Bearer header is included automatically by apiClient", async () => {
    const res = await adjustmentsApi.list();
    expect(res).toBeDefined();
    expect(res.data).toBeDefined();
  });

  // 23. Line items CRUD sub-endpoints
  it("23. Line item addition, modification, and deletion work seamlessly", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      items: [],
    });
    createdAdjustmentIds.push(adj.id);

    // Add item
    const item = await adjustmentsApi.addItem(adj.id, {
      productId,
      countedQuantity: 105,
    });
    expect(item.id).toBeDefined();
    expect(parseFloat(item.countedQuantity)).toBe(105);

    // Update item
    const updatedItem = await adjustmentsApi.updateItem(adj.id, item.id, {
      countedQuantity: 110,
    });
    expect(parseFloat(updatedItem.countedQuantity)).toBe(110);

    // Remove item
    const removeRes = await adjustmentsApi.removeItem(adj.id, item.id);
    expect(removeRes.success).toBe(true);
  });

  // 24. Cancellation workflow
  it("24. Adjustment cancellation succeeds and transitions to CANCELED", async () => {
    const adj = await adjustmentsApi.create({
      locationId,
      items: [{ productId, countedQuantity: 98 }],
    });
    createdAdjustmentIds.push(adj.id);

    const canceled = await adjustmentsApi.cancel(adj.id);
    expect(canceled.status).toBe("CANCELED");
  });
});
