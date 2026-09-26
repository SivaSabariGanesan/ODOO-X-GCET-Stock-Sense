import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { deliveries } from "../src/db/schema/deliveries.js";
import { deliveryItems } from "../src/db/schema/delivery-items.js";
import { locations } from "../src/db/schema/locations.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { eq, inArray, and } from "drizzle-orm";

import { DeliveryCoreService } from "../src/modules/deliveries/service.js";
import { InventoryService } from "../src/modules/inventory/service.js";


const TEST_PREFIX = `test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_deliv_user@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let uomId = "";
let productId1 = "";
let productId2 = "";
let createdDeliveryIds: string[] = [];

describe("StockSense Delivery Core Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Delivery Core Tester",
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

    // 2. Insert test warehouse with uppercase shortCode
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Warehouse ${TEST_PREFIX}`,
        shortCode: `WH${Date.now().toString().slice(-6)}`,
        description: "Test Warehouse for Delivery Core",
        createdBy: userId,
      })
      .returning();
    warehouseId = wh.id;

    // 3. Insert test UOM
    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `Unit ${TEST_PREFIX}`,
        abbreviation: `U${Date.now().toString().slice(-4)}`,
        createdBy: userId,
      })
      .returning();
    uomId = uom.id;

    // 4. Insert test products
    const [p1] = await db
      .insert(products)
      .values({
        name: `Delivery Product A ${TEST_PREFIX}`,
        sku: `SKU_DEL_A_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId1 = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        name: `Delivery Product B ${TEST_PREFIX}`,
        sku: `SKU_DEL_B_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId2 = p2.id;
  });

  afterAll(async () => {
    // Clean up created deliveries & items
    if (createdDeliveryIds.length > 0) {
      await db
        .delete(deliveryItems)
        .where(inArray(deliveryItems.deliveryId, createdDeliveryIds));
      await db
        .delete(deliveries)
        .where(inArray(deliveries.id, createdDeliveryIds));
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

    if (warehouseId) {
      await db.delete(locations).where(eq(locations.warehouseId, warehouseId));
      await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    }
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });


  // -------------------------------------------------------------------------
  // 1. Delivery CRUD
  // -------------------------------------------------------------------------
  describe("Delivery Header CRUD", () => {
    it("should create a delivery document without initial items", async () => {
      const res = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          warehouseId: warehouseId,
          customerName: "Acme Logistics",
          customerReference: "PO-DEL-001",
          notes: "Initial delivery core test",
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.deliveryNumber).toContain("DEL");
      expect(data.status).toBe("DRAFT");
      expect(data.customerName).toBe("Acme Logistics");
      expect(data.items).toEqual([]);
      createdDeliveryIds.push(data.id);
    });

    it("should create a delivery with initial line items in a single transaction", async () => {
      const res = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          warehouseId: warehouseId,
          customerName: "Global Trade Inc",
          items: [
            { productId: productId1, quantity: 30, unitPrice: 50.0 },
            { productId: productId2, quantity: 20, unitPrice: 85.0 },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.items.length).toBe(2);

      const quantities = data.items.map((i: any) => Number(i.quantity));
      expect(quantities).toContain(30);
      expect(quantities).toContain(20);
      createdDeliveryIds.push(data.id);
    });

    it("should reject creation with non-existent warehouse", async () => {
      const res = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          warehouseId: "99999999-9999-9999-9999-999999999999",
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Warehouse");
    });

    it("should list deliveries with pagination and status filters", async () => {
      const res = await app.request(
        `/api/deliveries?warehouseId=${warehouseId}&status=DRAFT&page=1&limit=10`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.meta).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it("should retrieve a delivery by ID with items and relational details", async () => {
      const deliveryId = createdDeliveryIds[1];
      const res = await app.request(`/api/deliveries/${deliveryId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.id).toBe(deliveryId);
      expect(data.items.length).toBe(2);
    });

    it("should update delivery header fields", async () => {
      const deliveryId = createdDeliveryIds[0];
      const res = await app.request(`/api/deliveries/${deliveryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: "Updated delivery notes",
          customerName: "Acme Distribution",
        }),
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.notes).toBe("Updated delivery notes");
      expect(data.customerName).toBe("Acme Distribution");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Delivery Items Management
  // -------------------------------------------------------------------------
  describe("Delivery Items Management", () => {
    let testItemDeliveryId = "";
    let addedItemId = "";

    beforeAll(async () => {
      const delivery = await DeliveryCoreService.createDelivery(
        {
          warehouseId: warehouseId,
          customerName: "Item Test Customer",
        },
        userId
      );
      testItemDeliveryId = delivery.id;
      createdDeliveryIds.push(testItemDeliveryId);
    });

    it("should add a line item to an existing delivery", async () => {
      const res = await app.request(`/api/deliveries/${testItemDeliveryId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: productId1,
          quantity: 15,
          unitPrice: 45.0,
          notes: "First delivery item",
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.productId).toBe(productId1);
      expect(Number(data.quantity)).toBe(15);
      addedItemId = data.id;
    });

    it("should reject adding item with non-existent product", async () => {
      const res = await app.request(`/api/deliveries/${testItemDeliveryId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: "99999999-9999-9999-9999-999999999999",
          quantity: 5,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Product");
    });

    it("should update quantity and unit price of a delivery item", async () => {
      const res = await app.request(
        `/api/deliveries/${testItemDeliveryId}/items/${addedItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            quantity: 25,
            unitPrice: 42.5,
          }),
        }
      );

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(Number(data.quantity)).toBe(25);
      expect(Number(data.unitPrice)).toBe(42.5);
    });

    it("should remove an item from the delivery", async () => {
      const res = await app.request(
        `/api/deliveries/${testItemDeliveryId}/items/${addedItemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const delivery = await DeliveryCoreService.getDelivery(testItemDeliveryId);
      expect(delivery.items.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Pick & Pack Workflows
  // -------------------------------------------------------------------------
  describe("Pick & Pack Workflow Steps", () => {
    let workflowDeliveryId = "";

    beforeAll(async () => {
      const del = await DeliveryCoreService.createDelivery(
        {
          warehouseId: warehouseId,
          customerName: "Workflow Customer",
          items: [{ productId: productId1, quantity: 10 }],
        },
        userId
      );
      workflowDeliveryId = del.id;
      createdDeliveryIds.push(workflowDeliveryId);
    });

    it("should execute Pick operation (transitions status to WAITING, NO stock mutation)", async () => {
      const res = await app.request(`/api/deliveries/${workflowDeliveryId}/pick`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data, message } = await res.json();
      expect(message).toContain("picked successfully");
      expect(data.status).toBe("WAITING");

      // Verify stock balances and movements were NOT modified
      const testProdIds = [productId1, productId2].filter(Boolean);
      const balances = await db
        .select()
        .from(stockBalances)
        .where(inArray(stockBalances.productId, testProdIds));
      expect(balances.length).toBe(0);
    });

    it("should execute Pack operation (transitions status to READY, NO stock mutation)", async () => {
      const res = await app.request(`/api/deliveries/${workflowDeliveryId}/pack`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data, message } = await res.json();
      expect(message).toContain("packed successfully");
      expect(data.status).toBe("READY");

      // Verify stock balances were NOT modified
      const testProdIds = [productId1, productId2].filter(Boolean);
      const balances = await db
        .select()
        .from(stockBalances)
        .where(inArray(stockBalances.productId, testProdIds));
      expect(balances.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Delivery Business Validation
  // -------------------------------------------------------------------------
  describe("Delivery Business Validation", () => {
    let emptyDeliveryId = "";
    let validDeliveryId = "";

    beforeAll(async () => {
      const emptyDel = await DeliveryCoreService.createDelivery(
        { warehouseId: warehouseId, customerName: "Empty Delivery" },
        userId
      );
      emptyDeliveryId = emptyDel.id;
      createdDeliveryIds.push(emptyDeliveryId);

      const validDel = await DeliveryCoreService.createDelivery(
        {
          warehouseId: warehouseId,
          customerName: "Valid Delivery",
          items: [{ productId: productId1, quantity: 40 }],
        },
        userId
      );
      validDeliveryId = validDel.id;
      createdDeliveryIds.push(validDeliveryId);
    });

    it("should fail validation for an empty delivery (no items)", async () => {
      const res = await app.request(`/api/deliveries/${emptyDeliveryId}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("must contain at least one line item");
    });

    it("should successfully validate a complete delivery document and set status to READY", async () => {
      const res = await app.request(`/api/deliveries/${validDeliveryId}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.isValid).toBe(true);
      expect(data.delivery.status).toBe("READY");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Status Rules and Immutability
  // -------------------------------------------------------------------------
  describe("Status Rules and Immutability", () => {
    let cancelDeliveryId = "";

    beforeAll(async () => {
      const del = await DeliveryCoreService.createDelivery(
        { warehouseId: warehouseId },
        userId
      );
      cancelDeliveryId = del.id;
      createdDeliveryIds.push(cancelDeliveryId);
    });

    it("should cancel a draft delivery", async () => {
      const res = await app.request(`/api/deliveries/${cancelDeliveryId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.status).toBe("CANCELED");
    });

    it("should block edits on a CANCELED delivery", async () => {
      const res = await app.request(`/api/deliveries/${cancelDeliveryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: "Attempt edit canceled delivery" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });

    it("should block Pick on a CANCELED delivery", async () => {
      const res = await app.request(`/api/deliveries/${cancelDeliveryId}/pick`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });

    it("should block direct edits on a DONE delivery", async () => {
      // Manually set status to DONE in DB
      await db
        .update(deliveries)
        .set({ status: "DONE" })
        .where(eq(deliveries.id, cancelDeliveryId));

      const res = await app.request(`/api/deliveries/${cancelDeliveryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: "Attempt edit DONE delivery" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });
  });

  // -------------------------------------------------------------------------
  // 6. Stock Isolation Guarantee (CRITICAL ARCHITECTURE CHECK)
  // -------------------------------------------------------------------------
  describe("Stock Isolation Guarantee", () => {
    it("should explicitly verify that Delivery Core operations (Create, Pick, Pack, Validate) DO NOT mutate stock balances or stock ledger", async () => {
      const testProdIds = [productId1, productId2].filter(Boolean);
      const balances = await db
        .select()
        .from(stockBalances)
        .where(inArray(stockBalances.productId, testProdIds));

      const movements = await db
        .select()
        .from(stockMovements)
        .where(inArray(stockMovements.productId, testProdIds));

      // Verify ZERO stock balance mutations or stock movement logs created for these delivery products
      expect(balances.length).toBe(0);
      expect(movements.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 7. Delivery Module 2 — Delivery Processing (Stock Operation Layer)
  // -------------------------------------------------------------------------
  describe("Delivery Processing (Stock Mutation Layer)", () => {
    let procDeliveryId: string;
    let procProdId: string;
    let procLocId: string;

    beforeAll(async () => {
      // 1. Create a product for processing test
      const [prod] = await db
        .insert(products)
        .values({
          name: `Proc Product ${TEST_PREFIX}`,
          sku: `SKU_PROC_${TEST_PREFIX}_${Date.now()}`,
          uomId: uomId,
          createdBy: userId,
        })
        .returning();
      procProdId = prod.id;

      // 2. Create a location for processing test
      const [loc] = await db
        .insert(locations)
        .values({
          warehouseId: warehouseId,
          name: `Proc Location ${TEST_PREFIX}`,
          fullPath: `WH/PROC_${TEST_PREFIX}_${Date.now()}`,
          createdBy: userId,
        })
        .returning();
      procLocId = loc.id;
    });

    it("should process a valid delivery, decreasing stock balance and logging ledger movement", async () => {
      // Step A: Receive initial stock into inventory (100 KG)
      await InventoryService.receiveStock({
        items: [
          {
            productId: procProdId,
            destinationLocationId: procLocId,
            quantity: 100,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: procProdId,
        createdBy: userId,
      });

      // Step B: Create a delivery order for 30 KG
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/PROC/001_${Date.now()}`,
          warehouseId: warehouseId,
          customerName: "Proc Customer",
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 30,
              unitPrice: 15,
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      const createData = await createRes.json();
      procDeliveryId = createData.data.id;
      createdDeliveryIds.push(procDeliveryId);

      // Step C: Process delivery via API POST /api/deliveries/:id/process
      const procRes = await app.request(`/api/deliveries/${procDeliveryId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(200);
      const procData = await procRes.json();
      expect(procData.data.status).toBe("DONE");

      // Step D: Verify stock balance was decreased from 100 to 70 KG
      const [balance] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(balance.quantity)).toBe(70);

      // Step E: Verify ledger movement record logged
      const movements = await db
        .select()
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.referenceType, "DELIVERY"),
            eq(stockMovements.referenceId, procDeliveryId)
          )
        );
      expect(movements.length).toBe(1);
      expect(parseFloat(movements[0].quantity)).toBe(30);
      expect(movements[0].sourceLocationId).toBe(procLocId);
    });

    it("should enforce idempotency by rejecting a second process attempt on a DONE delivery", async () => {
      const res = await app.request(`/api/deliveries/${procDeliveryId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(res.status).toBe(409);

      // Verify stock balance remained 70 KG (not decreased again)
      const [balance] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(balance.quantity)).toBe(70);
    });

    it("should fail processing if requested delivery quantity exceeds available stock (Insufficient Stock)", async () => {
      // Current available stock is 70 KG. Attempt to deliver 100 KG.
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/EXCEED/001_${Date.now()}`,
          warehouseId: warehouseId,
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 100,
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      const exceedDeliveryId = (await createRes.json()).data.id;
      createdDeliveryIds.push(exceedDeliveryId);

      const procRes = await app.request(`/api/deliveries/${exceedDeliveryId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(400);
      const procData = await procRes.json();
      expect(procData.error).toContain("Insufficient stock");

      // Verify delivery is NOT marked DONE
      const deliv = await DeliveryCoreService.getDelivery(exceedDeliveryId);
      expect(deliv.status).not.toBe("DONE");

      // Verify stock balance remains 70 KG
      const [balance] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(balance.quantity)).toBe(70);
    });

    it("should roll back complete transaction on multi-item failure (no partial stock decrease)", async () => {
      // Create a second product with 10 KG stock
      const [prod2] = await db
        .insert(products)
        .values({
          name: `Proc Product 2 ${TEST_PREFIX}`,
          sku: `SKU_PROC2_${TEST_PREFIX}_${Date.now()}`,
          uomId: uomId,
          createdBy: userId,
        })
        .returning();
      const procProd2Id = prod2.id;

      await InventoryService.receiveStock({
        items: [
          {
            productId: procProd2Id,
            destinationLocationId: procLocId,
            quantity: 10,
          },
        ],
        referenceType: "RECEIPT",
        referenceId: procProd2Id,
        createdBy: userId,
      });

      // Delivery order: Item 1 = 20 KG of procProdId (valid, 70 available), Item 2 = 50 KG of procProd2Id (INSUFFICIENT, 10 available)
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/MULTI_FAIL/001_${Date.now()}`,
          warehouseId: warehouseId,
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 20,
            },
            {
              productId: procProd2Id,
              sourceLocationId: procLocId,
              quantity: 50,
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      const multiFailId = (await createRes.json()).data.id;
      createdDeliveryIds.push(multiFailId);

      const procRes = await app.request(`/api/deliveries/${multiFailId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(400);

      // Verify complete ROLLBACK: procProdId balance must STILL BE 70 KG (not 50 KG!)
      const [bal1] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(bal1.quantity)).toBe(70);

      // procProd2Id balance must STILL BE 10 KG
      const [bal2] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProd2Id),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(bal2.quantity)).toBe(10);
    });

    it("should process multi-item delivery successfully when all stock is available", async () => {
      // Find procProd2Id
      const [prod2] = await db
        .select()
        .from(products)
        .where(eq(products.name, `Proc Product 2 ${TEST_PREFIX}`))
        .limit(1);
      const procProd2Id = prod2.id;

      // ProcProd1 has 70 KG, ProcProd2 has 10 KG.
      // Order: ProcProd1 = 20 KG, ProcProd2 = 5 KG.
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/MULTI_PASS/001_${Date.now()}`,
          warehouseId: warehouseId,
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 20,
            },
            {
              productId: procProd2Id,
              sourceLocationId: procLocId,
              quantity: 5,
            },
          ],
        }),
      });
      expect(createRes.status).toBe(201);
      const multiPassId = (await createRes.json()).data.id;
      createdDeliveryIds.push(multiPassId);

      const procRes = await app.request(`/api/deliveries/${multiPassId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(200);

      // Balances after: ProcProd1 = 50 KG, ProcProd2 = 5 KG
      const [bal1] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(bal1.quantity)).toBe(50);

      const [bal2] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProd2Id),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(bal2.quantity)).toBe(5);
    });

    it("should reject processing a CANCELED delivery", async () => {
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/CANCEL/001_${Date.now()}`,
          warehouseId: warehouseId,
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 10,
            },
          ],
        }),
      });
      const cancelDelivId = (await createRes.json()).data.id;
      createdDeliveryIds.push(cancelDelivId);

      // Cancel delivery
      await app.request(`/api/deliveries/${cancelDelivId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      // Attempt process
      const procRes = await app.request(`/api/deliveries/${cancelDelivId}/process`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(procRes.status).toBe(400);
    });

    it("should handle concurrent processing attempts safely without double stock decrease", async () => {
      // ProcProd1 has 50 KG remaining.
      // Create delivery for 10 KG.
      const createRes = await app.request("/api/deliveries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          deliveryNumber: `DEL/CONCUR/001_${Date.now()}`,
          warehouseId: warehouseId,
          items: [
            {
              productId: procProdId,
              sourceLocationId: procLocId,
              quantity: 10,
            },
          ],
        }),
      });
      const concurId = (await createRes.json()).data.id;
      createdDeliveryIds.push(concurId);

      // Fire 2 concurrent process requests
      const [res1, res2] = await Promise.all([
        app.request(`/api/deliveries/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        app.request(`/api/deliveries/${concurId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verify stock decreased by 10 KG ONCE (50 -> 40 KG)
      const [balance] = await db
        .select()
        .from(stockBalances)
        .where(
          and(
            eq(stockBalances.productId, procProdId),
            eq(stockBalances.locationId, procLocId)
          )
        );
      expect(parseFloat(balance.quantity)).toBe(40);
    });
  });
});


