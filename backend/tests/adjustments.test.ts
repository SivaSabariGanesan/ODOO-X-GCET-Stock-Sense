import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { inventoryAdjustments } from "../src/db/schema/inventory-adjustments.js";
import { inventoryAdjustmentItems } from "../src/db/schema/inventory-adjustment-items.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray, and } from "drizzle-orm";
import { AdjustmentService } from "../src/modules/adjustments/service.js";
import { InventoryService } from "../src/modules/inventory/service.js";

const TEST_PREFIX = `test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_adj_user@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseAId = "";
let warehouseBId = "";
let locationAId = "";
let locationBId = "";
let uomId = "";
let productId1 = "";
let productId2 = "";
let createdAdjustmentIds: string[] = [];

describe("StockSense Inventory Adjustment Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Adjustment Module Tester",
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

    // 2. Insert test warehouses A and B
    const [whA] = await db
      .insert(warehouses)
      .values({
        name: `Warehouse A ${TEST_PREFIX}`,
        shortCode: `WHA${Date.now().toString().slice(-5)}`,
        createdBy: userId,
      })
      .returning();
    warehouseAId = whA.id;

    const [whB] = await db
      .insert(warehouses)
      .values({
        name: `Warehouse B ${TEST_PREFIX}`,
        shortCode: `WHB${Date.now().toString().slice(-5)}`,
        createdBy: userId,
      })
      .returning();
    warehouseBId = whB.id;

    // 3. Insert test locations under warehouses A and B
    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseAId,
        name: `Location A ${TEST_PREFIX}`,
        fullPath: `WH-A/LOC-A_${TEST_PREFIX}`,
        createdBy: userId,
      })
      .returning();
    locationAId = locA.id;

    const [locB] = await db
      .insert(locations)
      .values({
        warehouseId: warehouseBId,
        name: `Location B ${TEST_PREFIX}`,
        fullPath: `WH-B/LOC-B_${TEST_PREFIX}`,
        createdBy: userId,
      })
      .returning();
    locationBId = locB.id;

    // 4. Insert test UOM
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Unit ${TEST_PREFIX}`,
        abbreviation: `U${Date.now().toString().slice(-4)}`,
        createdBy: userId,
      })
      .returning();
    uomId = uom.id;

    // 5. Insert test products
    const [p1] = await db
      .insert(products)
      .values({
        name: `Adj Product A ${TEST_PREFIX}`,
        sku: `SKU_ADJ_A_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId1 = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        name: `Adj Product B ${TEST_PREFIX}`,
        sku: `SKU_ADJ_B_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId2 = p2.id;
  });

  afterAll(async () => {
    // Clean up created adjustments & items
    if (createdAdjustmentIds.length > 0) {
      await db
        .delete(inventoryAdjustmentItems)
        .where(inArray(inventoryAdjustmentItems.adjustmentId, createdAdjustmentIds));
      await db
        .delete(inventoryAdjustments)
        .where(inArray(inventoryAdjustments.id, createdAdjustmentIds));
    }

    // Clean up stock balances & stock movements for test products
    if (uomId) {
      const testProducts = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.uomId, uomId));
      const testProdIds = testProducts.map((p) => p.id);

      if (testProdIds.length > 0) {
        await db
          .delete(stockMovements)
          .where(inArray(stockMovements.productId, testProdIds));
        await db
          .delete(stockBalances)
          .where(inArray(stockBalances.productId, testProdIds));
        await db.delete(products).where(inArray(products.id, testProdIds));
      }
      await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    }

    if (warehouseAId) {
      await db.delete(locations).where(eq(locations.warehouseId, warehouseAId));
      await db.delete(warehouses).where(eq(warehouses.id, warehouseAId));
    }
    if (warehouseBId) {
      await db.delete(locations).where(eq(locations.warehouseId, warehouseBId));
      await db.delete(warehouses).where(eq(warehouses.id, warehouseBId));
    }
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Adjustment Header CRUD
  // -------------------------------------------------------------------------
  describe("Adjustment Header CRUD", () => {
    it("should create an inventory adjustment document without initial items", async () => {
      const res = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Annual Physical Stock Audit",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.status).toBe("DRAFT");
      expect(data.data.locationId).toBe(locationAId);

      createdAdjustmentIds.push(data.data.id);
    });

    it("should create an inventory adjustment with initial line items", async () => {
      const res = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Damaged goods count",
          items: [
            {
              productId: productId1,
              countedQuantity: 37,
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.items.length).toBe(1);
      expect(parseFloat(data.data.items[0].countedQuantity)).toBe(37);

      createdAdjustmentIds.push(data.data.id);
    });

    it("should reject creation with a non-existent location", async () => {
      const res = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      expect(res.status).toBe(404);
    });

    it("should list inventory adjustments with pagination and status filters", async () => {
      const res = await app.request("/api/adjustments?page=1&limit=10", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it("should retrieve an inventory adjustment by ID with details", async () => {
      const adjId = createdAdjustmentIds[0];
      const res = await app.request(`/api/adjustments/${adjId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.id).toBe(adjId);
      expect(data.data.location).toBeDefined();
    });

    it("should update inventory adjustment header fields", async () => {
      const adjId = createdAdjustmentIds[0];
      const res = await app.request(`/api/adjustments/${adjId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          reason: "Updated reason for stock reconciliation",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.reason).toBe("Updated reason for stock reconciliation");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Adjustment Items Management
  // -------------------------------------------------------------------------
  describe("Adjustment Items Management", () => {
    let activeAdjId: string;
    let createdItemId: string;

    beforeAll(async () => {
      const res = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
        }),
      });
      activeAdjId = (await res.json()).data.id;
      createdAdjustmentIds.push(activeAdjId);
    });

    it("should add a line item to an existing inventory adjustment", async () => {
      const res = await app.request(`/api/adjustments/${activeAdjId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: productId1,
          countedQuantity: 50,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.id).toBeDefined();
      expect(parseFloat(data.data.countedQuantity)).toBe(50);
      createdItemId = data.data.id;
    });

    it("should update physical counted quantity of an adjustment item", async () => {
      const res = await app.request(
        `/api/adjustments/${activeAdjId}/items/${createdItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            countedQuantity: 45,
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(parseFloat(data.data.countedQuantity)).toBe(45);
    });

    it("should remove an item from the inventory adjustment", async () => {
      const res = await app.request(
        `/api/adjustments/${activeAdjId}/items/${createdItemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(res.status).toBe(200);

      const getRes = await app.request(`/api/adjustments/${activeAdjId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const getData = await getRes.json();
      expect(getData.data.items.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Preview Endpoint (Read-Only)
  // -------------------------------------------------------------------------
  describe("Preview Endpoint (Read-Only Comparison)", () => {
    it("should return read-only preview of system stock vs physical count without mutating stock or status", async () => {
      // Receive 40 KG initial stock at Location A
      await InventoryService.receiveStock({
        items: [
          {
            productId: productId1,
            destinationLocationId: locationAId,
            quantity: 40,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: productId1,
        createdBy: userId,
      });

      // Create adjustment with physical count = 37 KG (Difference = -3)
      const createRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          items: [{ productId: productId1, countedQuantity: 37 }],
        }),
      });
      const previewAdjId = (await createRes.json()).data.id;
      createdAdjustmentIds.push(previewAdjId);

      // GET preview
      const prevRes = await app.request(`/api/adjustments/${previewAdjId}/preview`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(prevRes.status).toBe(200);
      const prevData = await prevRes.json();
      expect(prevData.data.items[0].systemQuantity).toBe(40);
      expect(prevData.data.items[0].countedQuantity).toBe(37);
      expect(prevData.data.items[0].difference).toBe(-3);

      // Verify stock balance is STILL 40 KG (not mutated by preview)
      const balance = await InventoryService.getStockBalance(productId1, locationAId);
      expect(balance).toBe(40);

      // Verify adjustment status is STILL DRAFT
      const adj = await AdjustmentService.getAdjustment(previewAdjId);
      expect(adj.status).toBe("DRAFT");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Positive, Negative & Zero Adjustment Processing
  // -------------------------------------------------------------------------
  describe("Stock Processing (Positive, Negative & Zero Differences)", () => {
    it("should process a negative adjustment (Shrinkage/Loss: 40 KG -> 37 KG, diff = -3)", async () => {
      // Create adjustment with physical count = 37 KG (System = 40 KG)
      const createRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Loss audit",
          items: [{ productId: productId1, countedQuantity: 37 }],
        }),
      });
      const negAdjId = (await createRes.json()).data.id;
      createdAdjustmentIds.push(negAdjId);

      const procRes = await app.request(`/api/adjustments/${negAdjId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(procRes.status).toBe(200);
      const procData = await procRes.json();
      expect(procData.data.status).toBe("DONE");
      expect(parseFloat(procData.data.items[0].difference)).toBe(-3);

      // Verify Stock Balance updated to 37 KG
      const balance = await InventoryService.getStockBalance(productId1, locationAId);
      expect(balance).toBe(37);

      // Verify Stock Movement logged (-3 KG shrinkage)
      const movements = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.referenceType, "INVENTORY_ADJUSTMENT"),
            eq(stockMovements.referenceId, negAdjId)
          )
        );
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe("ADJUSTMENT");
      expect(movements[0].sourceLocationId).toBe(locationAId);
      expect(parseFloat(movements[0].quantity)).toBe(3);
    });

    it("should process a positive adjustment (Surplus: 37 KG -> 45 KG, diff = +8)", async () => {
      // Create adjustment with physical count = 45 KG (System is now 37 KG)
      const createRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Found unrecorded box",
          items: [{ productId: productId1, countedQuantity: 45 }],
        }),
      });
      const posAdjId = (await createRes.json()).data.id;
      createdAdjustmentIds.push(posAdjId);

      const procRes = await app.request(`/api/adjustments/${posAdjId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(procRes.status).toBe(200);
      const procData = await procRes.json();
      expect(procData.data.status).toBe("DONE");
      expect(parseFloat(procData.data.items[0].difference)).toBe(8);

      // Verify Stock Balance updated to 45 KG
      const balance = await InventoryService.getStockBalance(productId1, locationAId);
      expect(balance).toBe(45);

      // Verify Stock Movement logged (+8 KG surplus)
      const movements = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.referenceType, "INVENTORY_ADJUSTMENT"),
            eq(stockMovements.referenceId, posAdjId)
          )
        );
      expect(movements.length).toBe(1);
      expect(movements[0].movementType).toBe("ADJUSTMENT");
      expect(movements[0].destinationLocationId).toBe(locationAId);
      expect(parseFloat(movements[0].quantity)).toBe(8);
    });

    it("should handle zero-difference adjustment (Current = 45 KG, Physical = 45 KG, diff = 0)", async () => {
      const createRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Stock match audit",
          items: [{ productId: productId1, countedQuantity: 45 }],
        }),
      });
      const zeroAdjId = (await createRes.json()).data.id;
      createdAdjustmentIds.push(zeroAdjId);

      const procRes = await app.request(`/api/adjustments/${zeroAdjId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(procRes.status).toBe(200);
      const procData = await procRes.json();
      expect(procData.data.status).toBe("DONE");
      expect(parseFloat(procData.data.items[0].difference)).toBe(0);

      // Stock balance remains 45 KG
      const balance = await InventoryService.getStockBalance(productId1, locationAId);
      expect(balance).toBe(45);
    });

    it("should enforce idempotency by rejecting a second process attempt on a DONE adjustment", async () => {
      const lastId = createdAdjustmentIds[createdAdjustmentIds.length - 1];
      const res = await app.request(`/api/adjustments/${lastId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(409);
    });

    it("should handle concurrent processing attempts safely", async () => {
      const createRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          items: [{ productId: productId1, countedQuantity: 40 }],
        }),
      });
      const concurId = (await createRes.json()).data.id;
      createdAdjustmentIds.push(concurId);

      const [res1, res2] = await Promise.all([
        app.request(`/api/adjustments/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        app.request(`/api/adjustments/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Stock updated ONCE to 40 KG
      const balance = await InventoryService.getStockBalance(productId1, locationAId);
      expect(balance).toBe(40);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Complete E2E Inventory Scenario Integration
  // -------------------------------------------------------------------------
  describe("E2E Inventory Lifecycle Integration", () => {
    it("should execute complete flow: Receipt (+100) -> Transfer (40) -> Delivery (20) -> Adjustment (-3 = 37)", async () => {
      // Create fresh product for clean E2E test
      const [e2eProd] = await db
        .insert(products)
        .values({
          name: `E2E Full Product ${TEST_PREFIX}`,
          sku: `SKU_FULL_E2E_${TEST_PREFIX}_${Date.now()}`,
          uomId: uomId,
          createdBy: userId,
        })
        .returning();
      const e2eProdId = e2eProd.id;

      // 1. Receipt: +100 KG to Warehouse A (Location A)
      await InventoryService.receiveStock({
        items: [{ productId: e2eProdId, destinationLocationId: locationAId, quantity: 100 }],
        referenceType: "RECEIPT",
        referenceId: e2eProdId,
        createdBy: userId,
      });
      expect(await InventoryService.getStockBalance(e2eProdId, locationAId)).toBe(100);

      // 2. Transfer: 40 KG from Location A -> Location B
      await InventoryService.transferStock({
        items: [
          {
            productId: e2eProdId,
            sourceLocationId: locationAId,
            destinationLocationId: locationBId,
            quantity: 40,
          },
        ],
        referenceType: "INTERNAL_TRANSFER",
        referenceId: e2eProdId,
        createdBy: userId,
      });
      expect(await InventoryService.getStockBalance(e2eProdId, locationAId)).toBe(60);
      expect(await InventoryService.getStockBalance(e2eProdId, locationBId)).toBe(40);

      // 3. Delivery: 20 KG out of Location A
      await InventoryService.deliverStock({
        items: [{ productId: e2eProdId, sourceLocationId: locationAId, quantity: 20 }],
        referenceType: "DELIVERY",
        referenceId: e2eProdId,
        createdBy: userId,
      });
      expect(await InventoryService.getStockBalance(e2eProdId, locationAId)).toBe(40);
      expect(await InventoryService.getStockBalance(e2eProdId, locationBId)).toBe(40);

      // 4. Adjustment: Physical count = 37 KG at Location A (Difference = -3 KG)
      const adjRes = await app.request("/api/adjustments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          locationId: locationAId,
          reason: "Final stock audit reconciliation",
          items: [{ productId: e2eProdId, countedQuantity: 37 }],
        }),
      });
      const adjId = (await adjRes.json()).data.id;
      createdAdjustmentIds.push(adjId);

      const procRes = await app.request(`/api/adjustments/${adjId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(200);

      // Verify Final Balances: Location A = 37 KG, Location B = 40 KG, Total = 77 KG
      const finalBalA = await InventoryService.getStockBalance(e2eProdId, locationAId);
      const finalBalB = await InventoryService.getStockBalance(e2eProdId, locationBId);

      expect(finalBalA).toBe(37);
      expect(finalBalB).toBe(40);
      expect(finalBalA + finalBalB).toBe(77);
    });
  });
});
