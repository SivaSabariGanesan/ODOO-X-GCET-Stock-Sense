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
import { internalTransfers } from "../../../../../backend/src/db/schema/internal-transfers.js";
import { internalTransferItems } from "../../../../../backend/src/db/schema/internal-transfer-items.js";
import { eq, inArray, and } from "drizzle-orm";
import { setAuthToken, clearAuthToken, ApiError } from "../../../lib/apiClient";
import { transfersApi } from "../api";
import { warehousesApi, locationsApi } from "../../warehouses/api";

const TEST_PREFIX = `fe_tr_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_tr@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseAId = "";
let warehouseBId = "";
let sourceLocationId = "";
let destinationLocationId = "";
let otherLocationId = "";
let uomId = "";
let productId = "";
let createdTransferIds: string[] = [];

describe("Internal Transfers Live API Integration & Contract Tests", () => {
  beforeAll(async () => {
    // 1. Authenticate user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Transfers Tester",
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

    // 2. Setup Warehouses and Locations
    const [whA] = await db
      .insert(warehouses)
      .values({
        name: `WH Source ${TEST_PREFIX}`,
        shortCode: `S${Math.floor(1000 + Math.random() * 9000)}`,
        description: "Source Warehouse for Transfers",
        createdBy: userId,
      })
      .returning();
    warehouseAId = whA.id;

    const [whB] = await db
      .insert(warehouses)
      .values({
        name: `WH Dest ${TEST_PREFIX}`,
        shortCode: `D${Math.floor(1000 + Math.random() * 9000)}`,
        description: "Destination Warehouse for Transfers",
        createdBy: userId,
      })
      .returning();
    warehouseBId = whB.id;

    const [locSrc] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseAId,
        name: "Stock-Rack-1",
        fullPath: "WH-A/Stock/Rack-1",
        locationType: "internal",
      })
      .returning();
    sourceLocationId = locSrc.id;

    const [locDest] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseBId,
        name: "Stock-Rack-2",
        fullPath: "WH-B/Stock/Rack-2",
        locationType: "internal",
      })
      .returning();
    destinationLocationId = locDest.id;

    const [locOther] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseAId,
        name: "Shelf-Other",
        fullPath: "WH-A/Stock/Shelf-Other",
        locationType: "internal",
      })
      .returning();
    otherLocationId = locOther.id;

    // 3. Setup UOM & Product
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `UOM ${TEST_PREFIX}`,
        abbreviation: `u_${TEST_PREFIX.slice(-6)}`,
        measureType: "unit",
      })
      .returning();
    uomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        name: `Transfer Product ${TEST_PREFIX}`,
        sku: `SKU_TR_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId = prod.id;

    // 4. Seed initial stock balance in source location: 100 units
    await db.insert(stockBalances).values({
      productId: productId,
      locationId: sourceLocationId,
      quantity: "100.0000",
    });

    // Mock global fetch to proxy directly into in-memory Hono app
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

    // Clean up transfer items and transfers
    if (createdTransferIds.length > 0) {
      await db
        .delete(internalTransferItems)
        .where(inArray(internalTransferItems.transferId, createdTransferIds));
      await db
        .delete(internalTransfers)
        .where(inArray(internalTransfers.id, createdTransferIds));
    }

    // Clean up stock data
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

    if (sourceLocationId || destinationLocationId || otherLocationId) {
      const locIds = [sourceLocationId, destinationLocationId, otherLocationId].filter(Boolean);
      await db.delete(locations).where(inArray(locations.id, locIds));
    }

    if (warehouseAId || warehouseBId) {
      const whIds = [warehouseAId, warehouseBId].filter(Boolean);
      await db.delete(warehouses).where(inArray(warehouses.id, whIds));
    }

    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  // ── Master Data APIs ───────────────────────────────────────────────────────
  describe("Master Data live queries", () => {
    it("should query warehouses via existing warehousesApi", async () => {
      const res = await warehousesApi.list({ limit: 100 });
      expect(res.data).toBeDefined();
      expect(Array.isArray(res.data)).toBe(true);
      const found = res.data.some((w) => w.id === warehouseAId);
      expect(found).toBe(true);
    });

    it("should query locations via existing locationsApi", async () => {
      const res = await locationsApi.list({ warehouseId: warehouseAId });
      expect(res.data).toBeDefined();
      expect(Array.isArray(res.data)).toBe(true);
      const found = res.data.some((l) => l.id === sourceLocationId);
      expect(found).toBe(true);
    });
  });

  // ── Create Transfer ────────────────────────────────────────────────────────
  describe("Create Transfer (POST /api/transfers)", () => {
    it("should reject creation when source and destination locations are identical", async () => {
      try {
        await transfersApi.create({
          sourceLocationId: sourceLocationId,
          destinationLocationId: sourceLocationId,
          items: [{ productId, quantity: 10 }],
        });
        expect(true).toBe(false); // Should not reach
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
      }
    });

    it("should reject creation when quantity is zero or negative", async () => {
      try {
        await transfersApi.create({
          sourceLocationId: sourceLocationId,
          destinationLocationId: destinationLocationId,
          items: [{ productId, quantity: -5 }],
        });
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
      }
    });

    it("should successfully create an internal transfer with product line items", async () => {
      const res = await transfersApi.create({
        sourceLocationId: sourceLocationId,
        destinationLocationId: destinationLocationId,
        notes: "Automated test relocation",
        items: [{ productId, quantity: 20 }],
      });

      expect(res.data).toBeDefined();
      expect(res.data.id).toBeDefined();
      expect(res.data.transferNumber).toMatch(/^INT\//);
      expect(res.data.status).toBe("DRAFT");
      expect(res.data.items).toHaveLength(1);
      expect(parseFloat(res.data.items[0].quantity)).toBe(20);

      createdTransferIds.push(res.data.id);
    });
  });

  // ── List Transfers ─────────────────────────────────────────────────────────
  describe("List Transfers (GET /api/transfers)", () => {
    it("should list transfers with pagination", async () => {
      const res = await transfersApi.list({ page: 1, limit: 10 });
      expect(res.data).toBeDefined();
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.pagination).toBeDefined();
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it("should filter transfers by search query", async () => {
      const transferId = createdTransferIds[0]!;
      const transferDetail = await transfersApi.getById(transferId);

      const res = await transfersApi.list({ search: transferDetail.data.transferNumber });
      expect(res.data.length).toBeGreaterThanOrEqual(1);
      expect(res.data.some((t) => t.id === transferId)).toBe(true);
    });

    it("should filter transfers by status", async () => {
      const res = await transfersApi.list({ status: "DRAFT" });
      expect(res.data.every((t) => t.status === "DRAFT")).toBe(true);
    });

    it("should return empty list when searching for non-existent reference", async () => {
      const res = await transfersApi.list({ search: "NON_EXISTENT_REF_999999" });
      expect(res.data).toHaveLength(0);
      expect(res.pagination.total).toBe(0);
    });
  });

  // ── Get Transfer by ID ─────────────────────────────────────────────────────
  describe("Get Transfer Details (GET /api/transfers/:id)", () => {
    it("should fetch complete transfer details with resolved locations and products", async () => {
      const transferId = createdTransferIds[0]!;
      const res = await transfersApi.getById(transferId);

      expect(res.data).toBeDefined();
      expect(res.data.id).toBe(transferId);
      expect(res.data.sourceLocation).toBeDefined();
      expect(res.data.sourceLocation?.id).toBe(sourceLocationId);
      expect(res.data.destinationLocation).toBeDefined();
      expect(res.data.destinationLocation?.id).toBe(destinationLocationId);
      expect(res.data.items).toHaveLength(1);
      expect(res.data.items[0].product).toBeDefined();
      expect(res.data.items[0].product?.sku).toBe(`SKU_TR_${TEST_PREFIX}`);
    });

    it("should return 404 for non-existent UUID", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      try {
        await transfersApi.getById(fakeId);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(404);
      }
    });
  });

  // ── Validate Transfer Document ─────────────────────────────────────────────
  describe("Validate Transfer (POST /api/transfers/:id/validate)", () => {
    it("should update DRAFT status to READY", async () => {
      const transferId = createdTransferIds[0]!;
      const res = await transfersApi.validate(transferId);

      expect(res.data).toBeDefined();
      expect(res.data.valid).toBe(true);
      expect(res.data.transfer?.status).toBe("READY");

      const check = await transfersApi.getById(transferId);
      expect(check.data.status).toBe("READY");
    });
  });

  // ── Process Transfer & Stock Integrity ─────────────────────────────────────
  describe("Process Transfer (POST /api/transfers/:id/process) & Stock Integrity", () => {
    it("should process transfer atomically, mutate stock correctly, and log movements", async () => {
      const transferId = createdTransferIds[0]!;

      // Check pre-transfer stock balances
      const [preSrc] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId),
            eq(stockBalances.locationId, sourceLocationId)
          )
        );
      expect(parseFloat(preSrc.quantity)).toBe(100);

      // Process the transfer (relocates 20 units from Source to Destination)
      const res = await transfersApi.process(transferId);

      expect(res.data).toBeDefined();
      expect(res.data.status).toBe("DONE");

      // Verify post-transfer stock balances:
      // 1. Source location decreased by 20 -> 80
      const [postSrc] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId),
            eq(stockBalances.locationId, sourceLocationId)
          )
        );
      expect(parseFloat(postSrc.quantity)).toBe(80);

      // 2. Destination location increased by 20 -> 20
      const [postDest] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId),
            eq(stockBalances.locationId, destinationLocationId)
          )
        );
      expect(parseFloat(postDest.quantity)).toBe(20);

      // 3. Stock Integrity: Global company stock remains 100
      const allBalances = await db
        .select()
        .from(stockBalances)
        .where(eq(stockBalances.productId, productId));
      const totalCompanyStock = allBalances.reduce(
        (sum, b) => sum + parseFloat(b.quantity),
        0
      );
      expect(totalCompanyStock).toBe(100);

      // 4. Move History ledger contains immutable transfer movements
      const moves = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.productId, productId),
            eq(stockMovements.referenceId, transferId)
          )
        );
      expect(moves.length).toBeGreaterThanOrEqual(1);
    });

    it("should return 409 conflict when trying to re-process an already completed transfer", async () => {
      const transferId = createdTransferIds[0]!;
      try {
        await transfersApi.process(transferId);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(409);
      }
    });

    it("should reject processing when source location has insufficient stock", async () => {
      // Create transfer requesting 9999 units (only 80 remain at source)
      const res = await transfersApi.create({
        sourceLocationId: sourceLocationId,
        destinationLocationId: destinationLocationId,
        notes: "Excessive transfer beyond available stock",
        items: [{ productId, quantity: 9999 }],
      });
      createdTransferIds.push(res.data.id);

      try {
        await transfersApi.process(res.data.id);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
        expect(err.message.toLowerCase()).toContain("insufficient stock");
      }
    });
  });

  // ── Cancel Transfer ────────────────────────────────────────────────────────
  describe("Cancel Transfer (POST /api/transfers/:id/cancel)", () => {
    it("should cancel a pending transfer", async () => {
      const res = await transfersApi.create({
        sourceLocationId: sourceLocationId,
        destinationLocationId: otherLocationId,
        items: [{ productId, quantity: 5 }],
      });
      createdTransferIds.push(res.data.id);

      const cancelRes = await transfersApi.cancel(res.data.id);
      expect(cancelRes.data.status).toBe("CANCELED");

      const check = await transfersApi.getById(res.data.id);
      expect(check.data.status).toBe("CANCELED");
    });

    it("should reject canceling an already DONE transfer", async () => {
      const doneTransferId = createdTransferIds[0]!;
      try {
        await transfersApi.cancel(doneTransferId);
        expect(true).toBe(false);
      } catch (err: any) {
        expect(err).toBeInstanceOf(ApiError);
        expect(err.status).toBe(400);
      }
    });
  });
});
