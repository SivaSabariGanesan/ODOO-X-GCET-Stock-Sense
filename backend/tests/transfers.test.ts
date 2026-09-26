import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { internalTransfers } from "../src/db/schema/internal-transfers.js";
import { internalTransferItems } from "../src/db/schema/internal-transfer-items.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray, and } from "drizzle-orm";
import { TransferService } from "../src/modules/transfers/service.js";
import { InventoryService } from "../src/modules/inventory/service.js";

const TEST_PREFIX = `test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_transfer_user@example.com`;
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
let createdTransferIds: string[] = [];

describe("StockSense Internal Transfer Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Transfer Module Tester",
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
        name: `Transfer Product A ${TEST_PREFIX}`,
        sku: `SKU_TRF_A_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId1 = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        name: `Transfer Product B ${TEST_PREFIX}`,
        sku: `SKU_TRF_B_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId2 = p2.id;
  });

  afterAll(async () => {
    // Clean up created transfers & items
    if (createdTransferIds.length > 0) {
      await db
        .delete(internalTransferItems)
        .where(inArray(internalTransferItems.transferId, createdTransferIds));
      await db
        .delete(internalTransfers)
        .where(inArray(internalTransfers.id, createdTransferIds));
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
  // 1. Transfer Header CRUD
  // -------------------------------------------------------------------------
  describe("Transfer Header CRUD", () => {
    it("should create an internal transfer document without initial items", async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          notes: "Transfer without initial items",
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.id).toBeDefined();
      expect(data.data.status).toBe("DRAFT");
      expect(data.data.sourceLocationId).toBe(locationAId);
      expect(data.data.destinationLocationId).toBe(locationBId);

      createdTransferIds.push(data.data.id);
    });

    it("should create an internal transfer with initial line items in a single transaction", async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          notes: "Initial item transfer",
          items: [
            {
              productId: productId1,
              quantity: 25,
            },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.items.length).toBe(1);
      expect(parseFloat(data.data.items[0].quantity)).toBe(25);

      createdTransferIds.push(data.data.id);
    });

    it("should reject creation when source location equals destination location", async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationAId,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Validation failed");
    });

    it("should reject creation with a non-existent location", async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: "00000000-0000-0000-0000-000000000000",
        }),
      });

      expect(res.status).toBe(404);
    });

    it("should list internal transfers with pagination and status filters", async () => {
      const res = await app.request("/api/transfers?page=1&limit=10", {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it("should retrieve an internal transfer by ID with items and relational details", async () => {
      const transferId = createdTransferIds[0];
      const res = await app.request(`/api/transfers/${transferId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.id).toBe(transferId);
      expect(data.data.sourceLocation).toBeDefined();
      expect(data.data.destinationLocation).toBeDefined();
    });

    it("should update internal transfer header fields", async () => {
      const transferId = createdTransferIds[0];
      const res = await app.request(`/api/transfers/${transferId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: "Updated transfer notes",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.notes).toBe("Updated transfer notes");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Transfer Items Management
  // -------------------------------------------------------------------------
  describe("Transfer Items Management", () => {
    let activeTransferId: string;
    let createdItemId: string;

    beforeAll(async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
        }),
      });
      activeTransferId = (await res.json()).data.id;
      createdTransferIds.push(activeTransferId);
    });

    it("should add a line item to an existing internal transfer", async () => {
      const res = await app.request(`/api/transfers/${activeTransferId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: productId1,
          quantity: 15,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.id).toBeDefined();
      expect(parseFloat(data.data.quantity)).toBe(15);
      createdItemId = data.data.id;
    });

    it("should update quantity of an internal transfer item", async () => {
      const res = await app.request(
        `/api/transfers/${activeTransferId}/items/${createdItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            quantity: 40,
          }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(parseFloat(data.data.quantity)).toBe(40);
    });

    it("should remove an item from the internal transfer", async () => {
      const res = await app.request(
        `/api/transfers/${activeTransferId}/items/${createdItemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(res.status).toBe(200);

      const getRes = await app.request(`/api/transfers/${activeTransferId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const getData = await getRes.json();
      expect(getData.data.items.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Status Workflow & Immutability
  // -------------------------------------------------------------------------
  describe("Status Rules and Immutability", () => {
    let cancelTransferId: string;

    beforeAll(async () => {
      const res = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
        }),
      });
      cancelTransferId = (await res.json()).data.id;
      createdTransferIds.push(cancelTransferId);
    });

    it("should cancel a draft internal transfer", async () => {
      const res = await app.request(`/api/transfers/${cancelTransferId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.status).toBe("CANCELED");
    });

    it("should block edits on a CANCELED internal transfer", async () => {
      const res = await app.request(`/api/transfers/${cancelTransferId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: "Attempt edit" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });
  });

  // -------------------------------------------------------------------------
  // 4. Stock Processing & Inventory Engine Integration
  // -------------------------------------------------------------------------
  describe("Stock Processing & Inventory Engine Integration", () => {
    let procTransferId: string;

    it("should process a valid internal transfer, moving stock from Location A to Location B", async () => {
      // Step A: Stock initial 100 KG into Location A via receiveStock
      await InventoryService.receiveStock({
        items: [
          {
            productId: productId1,
            destinationLocationId: locationAId,
            quantity: 100,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: productId1,
        createdBy: userId,
      });

      // Step B: Create internal transfer for 40 KG (Location A -> Location B)
      const createRes = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          items: [
            {
              productId: productId1,
              quantity: 40,
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      procTransferId = (await createRes.json()).data.id;
      createdTransferIds.push(procTransferId);

      // Step C: Process transfer via API POST /api/transfers/:id/process
      const procRes = await app.request(`/api/transfers/${procTransferId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(200);
      const procData = await procRes.json();
      expect(procData.data.status).toBe("DONE");

      // Step D: Verify Location A stock balance decreased from 100 to 60 KG
      const [balA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(balA.quantity)).toBe(60);

      // Step E: Verify Location B stock balance increased to 40 KG
      const [balB] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationBId)
          )
        );
      expect(parseFloat(balB.quantity)).toBe(40);

      // Step F: Verify ledger movement record logged
      const movements = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.referenceType, "INTERNAL_TRANSFER"),
            eq(stockMovements.referenceId, procTransferId)
          )
        );
      expect(movements.length).toBe(1);
      expect(parseFloat(movements[0].quantity)).toBe(40);
      expect(movements[0].sourceLocationId).toBe(locationAId);
      expect(movements[0].destinationLocationId).toBe(locationBId);
    });

    it("should enforce idempotency by rejecting a second process attempt on a DONE transfer", async () => {
      const res = await app.request(`/api/transfers/${procTransferId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(409);

      // Verify balances remain Location A = 60 KG, Location B = 40 KG
      const [balA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(balA.quantity)).toBe(60);
    });

    it("should fail processing if requested transfer quantity exceeds available stock (Insufficient Stock)", async () => {
      // Location A has 60 KG available. Attempt to transfer 100 KG.
      const createRes = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          items: [
            {
              productId: productId1,
              quantity: 100,
            },
          ],
        }),
      });
      const exceedTransferId = (await createRes.json()).data.id;
      createdTransferIds.push(exceedTransferId);

      const procRes = await app.request(`/api/transfers/${exceedTransferId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(400);
      const procData = await procRes.json();
      expect(procData.error).toContain("Insufficient stock");

      // Verify balances remain untouched
      const [balA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(balA.quantity)).toBe(60);
    });

    it("should roll back complete transaction on multi-item failure (no partial stock movement)", async () => {
      // Product 1 has 60 KG at Location A. Product 2 has 5 KG at Location A.
      await InventoryService.receiveStock({
        items: [
          {
            productId: productId2,
            destinationLocationId: locationAId,
            quantity: 5,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: productId2,
        createdBy: userId,
      });

      // Transfer: Item 1 = 30 KG Product 1 (valid), Item 2 = 50 KG Product 2 (INSUFFICIENT)
      const createRes = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          items: [
            {
              productId: productId1,
              quantity: 30,
            },
            {
              productId: productId2,
              quantity: 50,
            },
          ],
        }),
      });
      const multiFailId = (await createRes.json()).data.id;
      createdTransferIds.push(multiFailId);

      const procRes = await app.request(`/api/transfers/${multiFailId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(400);

      // Verify complete ROLLBACK: Product 1 balance at Location A must STILL BE 60 KG
      const [balA1] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(balA1.quantity)).toBe(60);
    });

    it("should handle concurrent processing attempts safely without double stock movement", async () => {
      // Location A has 60 KG remaining. Transfer 10 KG.
      const createRes = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          items: [
            {
              productId: productId1,
              quantity: 10,
            },
          ],
        }),
      });
      const concurId = (await createRes.json()).data.id;
      createdTransferIds.push(concurId);

      const [res1, res2] = await Promise.all([
        app.request(`/api/transfers/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        app.request(`/api/transfers/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Stock moved ONCE: Location A = 50 KG, Location B = 50 KG
      const [balA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, productId1),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(balA.quantity)).toBe(50);
    });
  });

  // -------------------------------------------------------------------------
  // 5. E2E Inventory Scenario Integration
  // -------------------------------------------------------------------------
  describe("E2E Inventory Scenario Integration", () => {
    it("should execute full multi-step lifecycle: Receipt (+100) -> Transfer (40) -> Delivery (20)", async () => {
      // Create fresh product for clean E2E test
      const [e2eProd] = await db
        .insert(products)
        .values({
          name: `E2E Product ${TEST_PREFIX}`,
          sku: `SKU_E2E_${TEST_PREFIX}_${Date.now()}`,
          uomId: uomId,
          createdBy: userId,
        })
        .returning();
      const e2eProdId = e2eProd.id;

      // 1. Receipt: +100 KG into Location A
      await InventoryService.receiveStock({
        items: [
          {
            productId: e2eProdId,
            destinationLocationId: locationAId,
            quantity: 100,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: e2eProdId,
        createdBy: userId,
      });

      let [bA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, e2eProdId),
            eq(stockBalances.locationId, locationAId)
          )
        );
      expect(parseFloat(bA.quantity)).toBe(100);

      // 2. Transfer: Move 40 KG from Location A -> Location B
      const trfRes = await app.request("/api/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sourceLocationId: locationAId,
          destinationLocationId: locationBId,
          items: [{ productId: e2eProdId, quantity: 40 }],
        }),
      });
      const trfId = (await trfRes.json()).data.id;
      createdTransferIds.push(trfId);

      await app.request(`/api/transfers/${trfId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      [bA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, e2eProdId),
            eq(stockBalances.locationId, locationAId)
          )
        );
      let [bB] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, e2eProdId),
            eq(stockBalances.locationId, locationBId)
          )
        );
      expect(parseFloat(bA.quantity)).toBe(60);
      expect(parseFloat(bB.quantity)).toBe(40);

      // 3. Delivery: Deliver 20 KG out of Location A
      await InventoryService.deliverStock({
        items: [
          {
            productId: e2eProdId,
            sourceLocationId: locationAId,
            quantity: 20,
          },
        ],
        referenceType: "DELIVERY",
        referenceId: e2eProdId,
        createdBy: userId,
      });

      [bA] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, e2eProdId),
            eq(stockBalances.locationId, locationAId)
          )
        );
      [bB] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, e2eProdId),
            eq(stockBalances.locationId, locationBId)
          )
        );

      expect(parseFloat(bA.quantity)).toBe(40);
      expect(parseFloat(bB.quantity)).toBe(40);
    });
  });
});
