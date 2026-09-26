import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index";
import { db } from "../src/db/client";
import { users } from "../src/db/schema/users";
import { warehouses } from "../src/db/schema/warehouses";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure";
import { products } from "../src/db/schema/products";
import { receipts } from "../src/db/schema/receipts";
import { receiptItems } from "../src/db/schema/receipt-items";
import { stockBalances } from "../src/db/schema/stock-balances";
import { stockMovements } from "../src/db/schema/stock-movements";
import { eq, inArray } from "drizzle-orm";
import { ReceiptCoreService } from "../src/modules/receipts/service";

const TEST_PREFIX = `test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}_receipt_user@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let userId = "";
let warehouseId = "";
let uomId = "";
let productId1 = "";
let productId2 = "";
let createdReceiptIds: string[] = [];

describe("StockSense Receipt Core Module", () => {
  beforeAll(async () => {
    // 1. Create test user & authenticate
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Receipt Tester",
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

    // 2. Insert test warehouse
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `Warehouse ${TEST_PREFIX}`,
        shortCode: `WH${Date.now().toString().slice(-6)}`,
        description: "Test Warehouse for Receipt Core",
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
        name: `Product A ${TEST_PREFIX}`,
        sku: `SKU_A_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId1 = p1.id;

    const [p2] = await db
      .insert(products)
      .values({
        name: `Product B ${TEST_PREFIX}`,
        sku: `SKU_B_${TEST_PREFIX}`,
        uomId: uomId,
        createdBy: userId,
      })
      .returning();
    productId2 = p2.id;
  });

  afterAll(async () => {
    // Clean up created receipts & items
    if (createdReceiptIds.length > 0) {
      await db
        .delete(receiptItems)
        .where(inArray(receiptItems.receiptId, createdReceiptIds));
      await db
        .delete(receipts)
        .where(inArray(receipts.id, createdReceiptIds));
    }

    // Clean up test fixtures
    if (productId1) await db.delete(products).where(eq(products.id, productId1));
    if (productId2) await db.delete(products).where(eq(products.id, productId2));
    if (uomId) await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    if (warehouseId) await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });

  // -------------------------------------------------------------------------
  // 1. Receipt Creation & CRUD
  // -------------------------------------------------------------------------
  describe("Receipt CRUD", () => {
    it("should create a receipt without initial items", async () => {
      const res = await app.request("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
          notes: "Initial receipt core test",
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.receiptNumber).toContain("REC");
      expect(data.status).toBe("DRAFT");
      expect(data.warehouseId).toBe(warehouseId);
      expect(data.items).toEqual([]);
      createdReceiptIds.push(data.id);
    });

    it("should create a receipt with initial line items in a single transaction", async () => {
      const res = await app.request("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
          notes: "Receipt with items",
          items: [
            { productId: productId1, quantity: 50, unitPrice: 12.5 },
            { productId: productId2, quantity: 100, unitPrice: 8.0 },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.items.length).toBe(2);
      const quantities = data.items.map((i: any) => Number(i.quantity));
      expect(quantities).toContain(50);
      expect(quantities).toContain(100);
      createdReceiptIds.push(data.id);
    });

    it("should reject creation with non-existent warehouse", async () => {
      const res = await app.request("/api/receipts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: "99999999-9999-9999-9999-999999999999",
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Warehouse");
    });

    it("should list receipts with pagination and filters", async () => {
      const res = await app.request(
        `/api/receipts?warehouseId=${warehouseId}&status=DRAFT&page=1&limit=10`,
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
      expect(body.meta.page).toBe(1);
    });

    it("should retrieve a receipt by ID with its items", async () => {
      const receiptId = createdReceiptIds[1];
      const res = await app.request(`/api/receipts/${receiptId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.id).toBe(receiptId);
      expect(data.items.length).toBe(2);
    });

    it("should update receipt header fields", async () => {
      const receiptId = createdReceiptIds[0];
      const res = await app.request(`/api/receipts/${receiptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          notes: "Updated receipt notes",
        }),
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.notes).toBe("Updated receipt notes");
    });
  });

  // -------------------------------------------------------------------------
  // 2. Receipt Item Management
  // -------------------------------------------------------------------------
  describe("Receipt Items Management", () => {
    let testItemReceiptId = "";
    let addedItemId = "";

    beforeAll(async () => {
      const receipt = await ReceiptCoreService.createReceipt(
        {
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
        },
        userId
      );
      testItemReceiptId = receipt.id;
      createdReceiptIds.push(testItemReceiptId);
    });

    it("should add a line item to an existing receipt", async () => {
      const res = await app.request(`/api/receipts/${testItemReceiptId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: productId1,
          quantity: 25,
          unitPrice: 15.0,
          notes: "First item added",
        }),
      });

      expect(res.status).toBe(201);
      const { data } = await res.json();
      expect(data.id).toBeDefined();
      expect(data.productId).toBe(productId1);
      expect(Number(data.quantity)).toBe(25);
      addedItemId = data.id;
    });

    it("should reject adding item with non-existent product", async () => {
      const res = await app.request(`/api/receipts/${testItemReceiptId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          productId: "99999999-9999-9999-9999-999999999999",
          quantity: 10,
        }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain("Product");
    });

    it("should update quantity and unit price of an item", async () => {
      const res = await app.request(
        `/api/receipts/${testItemReceiptId}/items/${addedItemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            quantity: 40,
            unitPrice: 14.5,
          }),
        }
      );

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(Number(data.quantity)).toBe(40);
      expect(Number(data.unitPrice)).toBe(14.5);
    });

    it("should remove an item from the receipt", async () => {
      const res = await app.request(
        `/api/receipts/${testItemReceiptId}/items/${addedItemId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const receipt = await ReceiptCoreService.getReceipt(testItemReceiptId);
      expect(receipt.items.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Receipt Business Validation
  // -------------------------------------------------------------------------
  describe("Receipt Business Validation", () => {
    let emptyReceiptId = "";
    let validReceiptId = "";

    beforeAll(async () => {
      const emptyRec = await ReceiptCoreService.createReceipt(
        {
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
        },
        userId
      );
      emptyReceiptId = emptyRec.id;
      createdReceiptIds.push(emptyReceiptId);

      const validRec = await ReceiptCoreService.createReceipt(
        {
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
          items: [{ productId: productId1, quantity: 75, unitPrice: 20 }],
        },
        userId
      );
      validReceiptId = validRec.id;
      createdReceiptIds.push(validReceiptId);
    });

    it("should fail validation for an empty receipt (no items)", async () => {
      const res = await app.request(`/api/receipts/${emptyReceiptId}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("must contain at least one line item");
    });

    it("should successfully validate a complete receipt document and set status to READY", async () => {
      const res = await app.request(`/api/receipts/${validReceiptId}/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.isValid).toBe(true);
      expect(data.receipt.status).toBe("READY");
      expect(data.items.length).toBe(1);
      expect(data.items[0].productId).toBe(productId1);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Status Transitions & Immutability Rules
  // -------------------------------------------------------------------------
  describe("Status Rules and Immutability", () => {
    let cancelTestReceiptId = "";
    let readyReceiptId = "";

    beforeAll(async () => {
      const rec1 = await ReceiptCoreService.createReceipt(
        {
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
        },
        userId
      );
      cancelTestReceiptId = rec1.id;
      createdReceiptIds.push(cancelTestReceiptId);

      const rec2 = await ReceiptCoreService.createReceipt(
        {
          supplierId: "00000000-0000-0000-0000-000000000001",
          warehouseId: warehouseId,
          items: [{ productId: productId1, quantity: 10 }],
        },
        userId
      );
      readyReceiptId = rec2.id;
      createdReceiptIds.push(readyReceiptId);
    });

    it("should cancel a draft receipt", async () => {
      const res = await app.request(`/api/receipts/${cancelTestReceiptId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.status).toBe("CANCELED");
    });

    it("should block edits on a CANCELED receipt", async () => {
      const res = await app.request(`/api/receipts/${cancelTestReceiptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: "Attempt to edit canceled receipt" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });

    it("should block adding items to a CANCELED receipt", async () => {
      const res = await app.request(`/api/receipts/${cancelTestReceiptId}/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ productId: productId1, quantity: 5 }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });

    it("should block direct edits on a DONE receipt", async () => {
      // Manually set status to DONE in DB to simulate completion by Receipt Processing module
      await db
        .update(receipts)
        .set({ status: "DONE" })
        .where(eq(receipts.id, readyReceiptId));

      const res = await app.request(`/api/receipts/${readyReceiptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ notes: "Attempt to edit DONE receipt" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("locked");
    });
  });

  // -------------------------------------------------------------------------
  // 5. Stock Isolation Verification
  // -------------------------------------------------------------------------
  describe("Stock Isolation Guarantee", () => {
    it("should confirm Receipt Core operations leave stock tables completely untouched", async () => {
      const balances = await db.select().from(stockBalances);
      const movements = await db.select().from(stockMovements);

      // Verify no rows were created or mutated in stock balances/movements by Receipt Core
      expect(balances.length).toBe(0);
      expect(movements.length).toBe(0);
    });
  });
});
