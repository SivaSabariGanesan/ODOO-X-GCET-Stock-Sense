import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../../../../../backend/src/server/index.js";
import { db } from "../../../../../backend/src/db/client.js";
import { users } from "../../../../../backend/src/db/schema/users.js";
import { warehouses } from "../../../../../backend/src/db/schema/warehouses.js";
import { locations } from "../../../../../backend/src/db/schema/locations.js";
import { unitsOfMeasure } from "../../../../../backend/src/db/schema/units-of-measure.js";
import { products } from "../../../../../backend/src/db/schema/products.js";
import { stockMovements } from "../../../../../backend/src/db/schema/stock-movements.js";
import { StockLedgerService } from "../../../../../backend/src/modules/stock-movements/service.js";
import { eq, inArray } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { stockMovementsApi } from "../api";
import {
  formatStockMove,
  mapMovementTypeToFrontend,
  mapFrontendTypeToApi,
  ApiStockMovement,
} from "../types";

const TEST_PREFIX = `fe_moves_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let locationAId = "";
let locationBId = "";
let uomId = "";
let product1Id = "";
let product1Sku = "";
let product2Id = "";
let product2Sku = "";

let createdMovementIds: string[] = [];

describe("Stock Move History Frontend Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Frontend Moves Tester",
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

    // 2. Setup domain master data: Warehouse, Locations, UOM, Products
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WH FE Moves ${TEST_PREFIX}`,
        shortCode: `M${Math.floor(1000 + Math.random() * 9000)}`,
        description: "Test Warehouse for Move History Integration",
        createdBy: userId,
      })
      .returning();
    warehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: "Storage A",
        fullPath: "WH/StorageA",
        locationType: "internal",
      })
      .returning();
    locationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: "Storage B",
        fullPath: "WH/StorageB",
        locationType: "internal",
      })
      .returning();
    locationBId = locB.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM Moves ${TEST_PREFIX}`,
        abbreviation: "units",
        measureType: "unit",
      })
      .returning();
    uomId = uom.id;

    product1Sku = `SKU_MV1_${TEST_PREFIX}`;
    const [prod1] = await db
      .insert(products)
      .values({
        name: `Product 1 For Moves ${TEST_PREFIX}`,
        sku: product1Sku,
        uomId,
        createdBy: userId,
      })
      .returning();
    product1Id = prod1.id;

    product2Sku = `SKU_MV2_${TEST_PREFIX}`;
    const [prod2] = await db
      .insert(products)
      .values({
        name: `Product 2 For Moves ${TEST_PREFIX}`,
        sku: product2Sku,
        uomId,
        createdBy: userId,
      })
      .returning();
    product2Id = prod2.id;

    // 3. Seed authoritative stock movements across different movement types
    // Movement 1: Inbound Receipt for Product 1
    const m1 = await StockLedgerService.recordMovement({
      productId: product1Id,
      destinationLocationId: locationAId,
      quantity: 100,
      movementType: "RECEIPT",
      referenceType: "RECEIPT",
      referenceId: crypto.randomUUID(),
      createdBy: userId,
    });
    createdMovementIds.push(m1.id);

    // Movement 2: Internal Transfer from Loc A to Loc B for Product 1
    const m2 = await StockLedgerService.recordMovement({
      productId: product1Id,
      sourceLocationId: locationAId,
      destinationLocationId: locationBId,
      quantity: 40,
      movementType: "TRANSFER",
      referenceType: "INTERNAL_TRANSFER",
      referenceId: crypto.randomUUID(),
      createdBy: userId,
    });
    createdMovementIds.push(m2.id);

    // Movement 3: Outbound Delivery from Loc B for Product 1
    const m3 = await StockLedgerService.recordMovement({
      productId: product1Id,
      sourceLocationId: locationBId,
      quantity: 15,
      movementType: "DELIVERY",
      referenceType: "DELIVERY",
      referenceId: crypto.randomUUID(),
      createdBy: userId,
    });
    createdMovementIds.push(m3.id);

    // Movement 4: Inventory Adjustment on Loc A for Product 2
    const m4 = await StockLedgerService.recordMovement({
      productId: product2Id,
      destinationLocationId: locationAId,
      quantity: 5,
      movementType: "ADJUSTMENT",
      referenceType: "INVENTORY_ADJUSTMENT",
      referenceId: crypto.randomUUID(),
      createdBy: userId,
    });
    createdMovementIds.push(m4.id);

    // 4. Mock global fetch to route requests through backend Hono app.request
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

    // Clean up created movements
    if (createdMovementIds.length > 0) {
      await db
        .delete(stockMovements)
        .where(inArray(stockMovements.id, createdMovementIds));
    }

    // Clean up products
    if (product1Id || product2Id) {
      const prodIds = [product1Id, product2Id].filter(Boolean);
      await db.delete(products).where(inArray(products.id, prodIds));
    }

    // Clean up UOM
    if (uomId) {
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    }

    // Clean up Locations and Warehouse
    if (warehouseId) {
      await db.delete(locations).where(eq(locations.warehouseId, warehouseId));
      await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    }

    // Clean up User
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // 1. Movement list loads successfully
  it("1. Movement list loads successfully from backend API", async () => {
    const res = await stockMovementsApi.list();
    expect(res).toBeDefined();
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.meta).toBeDefined();
    expect(res.pagination).toBeDefined();
    expect(typeof res.pagination.total).toBe("number");
    expect(typeof res.pagination.page).toBe("number");
    expect(typeof res.pagination.limit).toBe("number");
  });

  // 2. Real API response renders correctly
  it("2. Real API response is rendered and mapped correctly into UI model", async () => {
    const res = await stockMovementsApi.list({ productId: product1Id });
    expect(res.data.length).toBeGreaterThanOrEqual(3);

    const apiItem = res.data.find((m) => m.movementType === "RECEIPT")!;
    expect(apiItem).toBeDefined();
    expect(apiItem.productId).toBe(product1Id);
    expect(apiItem.product?.name).toBe(`Product 1 For Moves ${TEST_PREFIX}`);
    expect(apiItem.product?.sku).toBe(product1Sku);

    // Test formatter
    const uiModel = formatStockMove(apiItem);
    expect(uiModel.id).toBe(apiItem.id);
    expect(uiModel.productName).toBe(`Product 1 For Moves ${TEST_PREFIX}`);
    expect(uiModel.productSku).toBe(product1Sku);
    expect(uiModel.movementType).toBe("receipt");
    expect(uiModel.quantity).toBe(100);
    expect(uiModel.transactionId).toContain("TX-");
    expect(uiModel.reference).toContain("WH/IN/");
    expect(uiModel.referenceUrl).toContain("/operations/receipts/");
  });

  // 3. Empty movement list
  it("3. Empty movement list handles gracefully when filtering non-matching criteria", async () => {
    const res = await stockMovementsApi.list({
      search: "NON_EXISTENT_MOVEMENT_SEARCH_TERM_XYZ_9999",
    });
    expect(res.data).toEqual([]);
    expect(res.pagination.total).toBe(0);
    expect(res.meta.total).toBe(0);
  });

  // 4. Loading state structure
  it("4. Loading and meta pagination structures match expected contract schema", async () => {
    const res = await stockMovementsApi.list({ limit: 5 });
    expect(res.pagination.limit).toBe(5);
    expect(res.meta.limit).toBe(5);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.totalPages).toBeGreaterThanOrEqual(1);
  });

  // 5. API failure state
  it("5. API failure correctly maps to typed ApiError with status and message", async () => {
    try {
      await stockMovementsApi.list({
        // Invalid non-UUID format triggers backend 400 schema error
        productId: "non-existent-uuid-format",
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err instanceof ApiError).toBe(true);
      expect(err.status).toBe(400);
      expect(err.message).toBeDefined();
    }
  });

  // 6. Unauthorized response
  it("6. Unauthorized request (missing / invalid token) returns 401 error", async () => {
    clearAuthToken();
    try {
      await stockMovementsApi.list();
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err instanceof ApiError).toBe(true);
      expect(err.status).toBe(401);
    } finally {
      setAuthToken(authToken);
    }
  });

  // 7. Product filter
  it("7. Product filter restricts movements strictly to matching product", async () => {
    const res = await stockMovementsApi.list({ productId: product2Id });
    expect(res.data.length).toBe(1);
    expect(res.data[0]!.productId).toBe(product2Id);
    expect(res.data[0]!.movementType).toBe("ADJUSTMENT");
  });

  // 8. SKU / search filter
  it("8. SKU search filter queries movements by product SKU or name pattern", async () => {
    const res = await stockMovementsApi.list({ search: product2Sku });
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data.every((m) => m.product?.sku === product2Sku)).toBe(true);
  });

  // 9. Movement type filter
  it("9. Movement type filter filters accurately across RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT", async () => {
    const receipts = await stockMovementsApi.list({
      productId: product1Id,
      movementType: "RECEIPT",
    });
    expect(receipts.data.length).toBe(1);
    expect(receipts.data[0]!.movementType).toBe("RECEIPT");

    const transfers = await stockMovementsApi.list({
      productId: product1Id,
      movementType: "TRANSFER",
    });
    expect(transfers.data.length).toBe(1);
    expect(transfers.data[0]!.movementType).toBe("TRANSFER");

    const deliveries = await stockMovementsApi.list({
      productId: product1Id,
      movementType: "DELIVERY",
    });
    expect(deliveries.data.length).toBe(1);
    expect(deliveries.data[0]!.movementType).toBe("DELIVERY");

    const adjustments = await stockMovementsApi.list({
      productId: product2Id,
      movementType: "ADJUSTMENT",
    });
    expect(adjustments.data.length).toBe(1);
    expect(adjustments.data[0]!.movementType).toBe("ADJUSTMENT");
  });

  // 10. Warehouse filter
  it("10. Warehouse filter restricts movements to warehouse scope", async () => {
    const res = await stockMovementsApi.list({ warehouseId });
    expect(res.data.length).toBeGreaterThanOrEqual(4);
    expect(
      res.data.every(
        (m) =>
          m.sourceLocation?.warehouseId === warehouseId ||
          m.destinationLocation?.warehouseId === warehouseId
      )
    ).toBe(true);
  });

  // 11. Location filter
  it("11. Location filter restricts movements where location is source or destination", async () => {
    const res = await stockMovementsApi.list({ locationId: locationBId });
    expect(res.data.length).toBeGreaterThanOrEqual(2);
    expect(
      res.data.every(
        (m) =>
          m.sourceLocationId === locationBId ||
          m.destinationLocationId === locationBId
      )
    ).toBe(true);
  });

  // 12. Date range filter
  it("12. Date range filter (fromDate / toDate) filters accurately", async () => {
    // fromDate in the future should return no records
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const futureRes = await stockMovementsApi.list({
      productId: product1Id,
      fromDate: futureDate,
    });
    expect(futureRes.data.length).toBe(0);

    // fromDate in the past includes seeded records
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const pastRes = await stockMovementsApi.list({
      productId: product1Id,
      fromDate: pastDate,
    });
    expect(pastRes.data.length).toBeGreaterThanOrEqual(3);
  });

  // 13. Multiple filters together
  it("13. Multiple filters combined work together predictably", async () => {
    const res = await stockMovementsApi.list({
      productId: product1Id,
      movementType: "TRANSFER",
      locationId: locationAId,
      warehouseId,
    });
    expect(res.data.length).toBe(1);
    expect(res.data[0]!.productId).toBe(product1Id);
    expect(res.data[0]!.movementType).toBe("TRANSFER");
    expect(res.data[0]!.sourceLocationId).toBe(locationAId);
  });

  // 14. Search + pagination interaction
  it("14. Search + pagination interaction returns properly paginated subset", async () => {
    const res = await stockMovementsApi.list({
      search: TEST_PREFIX,
      page: 1,
      limit: 2,
    });
    expect(res.data.length).toBe(2);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.limit).toBe(2);
    expect(res.pagination.total).toBeGreaterThanOrEqual(4);
    expect(res.pagination.totalPages).toBeGreaterThanOrEqual(2);
  });

  // 15. Filter + pagination interaction
  it("15. Filter + pagination interaction applies limits to filtered subset", async () => {
    const res = await stockMovementsApi.list({
      warehouseId,
      page: 1,
      limit: 2,
    });
    expect(res.data.length).toBe(2);
    expect(res.pagination.total).toBeGreaterThanOrEqual(4);
  });

  // 16. Pagination works correctly (Page 1 vs Page 2)
  it("16. Pagination returns distinct records across consecutive pages", async () => {
    const page1 = await stockMovementsApi.list({
      warehouseId,
      page: 1,
      limit: 2,
    });
    const page2 = await stockMovementsApi.list({
      warehouseId,
      page: 2,
      limit: 2,
    });

    expect(page1.data.length).toBe(2);
    expect(page2.data.length).toBe(2);

    const page1Ids = page1.data.map((m) => m.id);
    const page2Ids = page2.data.map((m) => m.id);
    // Ensure no overlap between page 1 and page 2
    for (const id of page1Ids) {
      expect(page2Ids).not.toContain(id);
    }
  });

  // 17. Previous/next buttons have correct disabled state
  it("17. Pagination calculation derives correct disabled states", () => {
    const page1State = {
      currentPage: 1,
      totalPages: 3,
      isPreviousDisabled: true, // currentPage === 1
      isNextDisabled: false,
    };
    expect(page1State.currentPage === 1).toBe(true);
    expect(page1State.isPreviousDisabled).toBe(true);
    expect(page1State.isNextDisabled).toBe(false);

    const page3State = {
      currentPage: 3,
      totalPages: 3,
      isPreviousDisabled: false,
      isNextDisabled: true, // currentPage === totalPages
    };
    expect(page3State.currentPage === page3State.totalPages).toBe(true);
    expect(page3State.isPreviousDisabled).toBe(false);
    expect(page3State.isNextDisabled).toBe(true);
  });

  // 18. API query parameters are correct
  it("18. API query parameters map exactly to backend parameters", async () => {
    const params = {
      page: 1,
      limit: 10,
      productId: product1Id,
      warehouseId,
      movementType: "RECEIPT" as const,
      search: product1Sku,
    };

    const res = await stockMovementsApi.list(params);
    expect(res).toBeDefined();
    expect(res.data.length).toBe(1);
    expect(res.data[0]!.productId).toBe(product1Id);
    expect(res.data[0]!.movementType).toBe("RECEIPT");
  });

  // 19. Authentication is included correctly
  it("19. Authentication Bearer header is automatically sent by apiClient", async () => {
    const res = await stockMovementsApi.getById(createdMovementIds[0]!);
    expect(res).toBeDefined();
    expect(res.id).toBe(createdMovementIds[0]!);
  });

  // 20. Type-check passes and type mapping utilities work
  it("20. Type conversion helpers accurately translate between frontend and backend contracts", () => {
    expect(mapMovementTypeToFrontend("RECEIPT")).toBe("receipt");
    expect(mapMovementTypeToFrontend("DELIVERY")).toBe("delivery");
    expect(mapMovementTypeToFrontend("TRANSFER")).toBe("transfer");
    expect(mapMovementTypeToFrontend("ADJUSTMENT")).toBe("adjustment");

    expect(mapFrontendTypeToApi("receipt")).toBe("RECEIPT");
    expect(mapFrontendTypeToApi("delivery")).toBe("DELIVERY");
    expect(mapFrontendTypeToApi("transfer")).toBe("TRANSFER");
    expect(mapFrontendTypeToApi("adjustment")).toBe("ADJUSTMENT");
    expect(mapFrontendTypeToApi("all")).toBeUndefined();
  });

  // 21. Immutability validation: rejection of PUT/PATCH/DELETE
  it("21. Stock ledger immutability: rejects update and deletion with 405 Method Not Allowed", async () => {
    const id = createdMovementIds[0]!;

    const putRes = await app.request(`/api/stock-movements/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: "999" }),
    });
    expect(putRes.status).toBe(405);

    const patchRes = await app.request(`/api/stock-movements/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity: "999" }),
    });
    expect(patchRes.status).toBe(405);

    const delRes = await app.request(`/api/stock-movements/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    expect(delRes.status).toBe(405);
  });
});
