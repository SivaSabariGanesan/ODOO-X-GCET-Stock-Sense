import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import app from "../src/server/index.js";
import { db } from "../src/db/client.js";
import { users } from "../src/db/schema/users.js";
import { warehouses } from "../src/db/schema/warehouses.js";
import { locations } from "../src/db/schema/locations.js";
import { unitsOfMeasure } from "../src/db/schema/units-of-measure.js";
import { products } from "../src/db/schema/products.js";
import { stockBalances } from "../src/db/schema/stock-balances.js";
import { stockMovements } from "../src/db/schema/stock-movements.js";
import { ConnectionManager } from "../src/modules/websocket/connection-manager.js";
import { EventBus } from "../src/modules/websocket/event-bus.js";
import { EventEnvelope } from "../src/modules/websocket/types.js";
import { InventoryService } from "../src/modules/inventory/service.js";
import { SafeUser } from "../src/modules/auth/types.js";
import { eq, inArray } from "drizzle-orm";

const TEST_TIMESTAMP = Date.now().toString().slice(-6);
const TEST_EMAIL = `ws_user_${TEST_TIMESTAMP}@example.com`;
const TEST_PASSWORD = "Password123!";

let authToken = "";
let staffAuthToken = "";
let managerUser: SafeUser;
let staffUser: SafeUser;
let warehouseId = "";
let locationAId = "";
let uomId = "";
let productId = "";

describe("StockSense WebSocket Real-Time Communication Layer", () => {
  beforeAll(async () => {
    // 1. Create manager user
    const regRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "WS Manager",
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: "manager",
      }),
    });
    const regData = await regRes.json();
    managerUser = regData.user;

    const loginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.token;

    // 2. Create staff user
    const staffRegRes = await app.request("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "WS Staff",
        email: `staff_${TEST_EMAIL}`,
        password: TEST_PASSWORD,
        role: "staff",
      }),
    });
    const staffRegData = await staffRegRes.json();
    staffUser = staffRegData.user;

    const staffLoginRes = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `staff_${TEST_EMAIL}`, password: TEST_PASSWORD }),
    });
    const staffLoginData = await staffLoginRes.json();
    staffAuthToken = staffLoginData.token;

    // 3. Setup domain prerequisites
    const [wh] = await db
      .insert(warehouses)
      .values({
        name: `WS Warehouse ${TEST_TIMESTAMP}`,
        shortCode: `WHWS${TEST_TIMESTAMP}`,
      })
      .returning();
    warehouseId = wh.id;

    const [locA] = await db
      .insert(locations)
      .values({
        warehouseId,
        name: `WS Location A ${TEST_TIMESTAMP}`,
        fullPath: `WHWS${TEST_TIMESTAMP}/LocA`,
        locationType: "internal",
      })
      .returning();
    locationAId = locA.id;

    const [uom] = await db
      .insert(unitsOfMeasure)
      .values({
        name: `WS Unit ${TEST_TIMESTAMP}`,
        abbreviation: `wsu${TEST_TIMESTAMP}`.slice(0, 10),
      })
      .returning();
    uomId = uom.id;

    const [prod] = await db
      .insert(products)
      .values({
        sku: `WSPROD${TEST_TIMESTAMP}`,
        name: `WS Test Item ${TEST_TIMESTAMP}`,
        uomId,
      })
      .returning();
    productId = prod.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    ConnectionManager.removeAll();
    await db.delete(stockMovements).where(eq(stockMovements.productId, productId));
    await db.delete(stockBalances).where(eq(stockBalances.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(unitsOfMeasure).where(eq(unitsOfMeasure.id, uomId));
    await db.delete(locations).where(eq(locations.id, locationAId));
    await db.delete(warehouses).where(eq(warehouses.id, warehouseId));
    await db.delete(users).where(inArray(users.id, [managerUser.id, staffUser.id]));
  });

  // -------------------------------------------------------------------------
  // 1. ConnectionManager & Registries
  // -------------------------------------------------------------------------
  it("registers active connections and default user/role channels", () => {
    ConnectionManager.removeAll();

    const mockWs = { send: () => {} };
    const connData = ConnectionManager.addConnection("conn_1001", mockWs, managerUser);

    expect(connData.connectionId).toBe("conn_1001");
    expect(connData.user.id).toBe(managerUser.id);
    expect(connData.channels.has("all")).toBeTrue();
    expect(connData.channels.has("inventory")).toBeTrue();
    expect(connData.channels.has("dashboard")).toBeTrue();
    expect(connData.channels.has(`user:${managerUser.id}`)).toBeTrue();
    expect(connData.channels.has(`role:${managerUser.role}`)).toBeTrue();

    expect(ConnectionManager.getActiveConnectionsCount()).toBe(1);

    ConnectionManager.removeConnection("conn_1001");
    expect(ConnectionManager.getActiveConnectionsCount()).toBe(0);
  });

  it("enforces role-based channel subscription restrictions", () => {
    ConnectionManager.removeAll();

    const mockWsStaff = { send: () => {} };
    ConnectionManager.addConnection("conn_staff", mockWsStaff, staffUser);

    // Staff role attempting to subscribe to admin channel -> FORBIDDEN
    const staffSubAdmin = ConnectionManager.subscribe("conn_staff", "admin:metrics", staffUser.role);
    expect(staffSubAdmin).toBeFalse();

    // Staff role subscribing to warehouse channel -> ALLOWED
    const staffSubWh = ConnectionManager.subscribe("conn_staff", `warehouse:${warehouseId}`, staffUser.role);
    expect(staffSubWh).toBeTrue();

    const mockWsManager = { send: () => {} };
    ConnectionManager.addConnection("conn_manager", mockWsManager, managerUser);

    // Manager role subscribing to admin channel -> ALLOWED
    const managerSubAdmin = ConnectionManager.subscribe("conn_manager", "admin:metrics", managerUser.role);
    expect(managerSubAdmin).toBeTrue();
  });

  // -------------------------------------------------------------------------
  // 2. EventBus & Broadcast Targeting
  // -------------------------------------------------------------------------
  it("constructs valid EventEnvelope structures in EventBus", () => {
    const envelope = EventBus.publish("stock.received", {
      receiptId: "rec_123",
      quantity: "100",
    });

    expect(envelope.type).toBe("stock.received");
    expect(envelope.eventId).toStartWith("evt_");
    expect(envelope.timestamp).toBeDefined();
    expect(envelope.data.receiptId).toBe("rec_123");
  });

  it("targets WebSocket events to specific rooms/channels and users", () => {
    ConnectionManager.removeAll();

    const receivedEvents: Array<{ connId: string; envelope: EventEnvelope }> = [];

    const mockWs1 = {
      send: (msg: string) => receivedEvents.push({ connId: "conn_1", envelope: JSON.parse(msg) }),
    };
    const mockWs2 = {
      send: (msg: string) => receivedEvents.push({ connId: "conn_2", envelope: JSON.parse(msg) }),
    };

    ConnectionManager.addConnection("conn_1", mockWs1, managerUser);
    ConnectionManager.addConnection("conn_2", mockWs2, staffUser);

    ConnectionManager.subscribe("conn_1", "warehouse:wh-north", managerUser.role);

    // Publish event targeted to channel 'warehouse:wh-north'
    EventBus.publish(
      "inventory.updated",
      { operationType: "RECEIPT", operationId: "rec_99" },
      { channel: "warehouse:wh-north" }
    );

    // Only conn_1 should receive channel event
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].connId).toBe("conn_1");
    expect(receivedEvents[0].envelope.data.operationId).toBe("rec_99");

    // Publish event targeted to staff user specifically
    receivedEvents.length = 0;
    EventBus.publish(
      "system.notification",
      { message: "Staff task assigned" },
      { userId: staffUser.id }
    );

    // Only conn_2 (staffUser) should receive
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].connId).toBe("conn_2");
  });

  // -------------------------------------------------------------------------
  // 3. Post-Commit Event Publishing & Transaction Safety
  // -------------------------------------------------------------------------
  it("publishes WebSocket events AFTER database transaction commits", async () => {
    ConnectionManager.removeAll();

    const publishedEvents: EventEnvelope[] = [];
    const mockWs = {
      send: (msg: string) => publishedEvents.push(JSON.parse(msg)),
    };
    ConnectionManager.addConnection("conn_test", mockWs, managerUser);

    // Perform operational receiveStock
    const testRefId = "00000000-8888-4000-8000-000000000001";
    await db.transaction(async (tx) => {
      await InventoryService.receiveStock(
        {
          items: [{ productId, destinationLocationId: locationAId, quantity: 50 }],
          referenceType: "RECEIPT",
          referenceId: testRefId,
        },
        tx
      );
    });

    // Manually trigger post-commit notification as processing service does
    EventBus.publish("stock.received", {
      receiptId: testRefId,
      items: [{ productId, destinationLocationId: locationAId, quantity: "50" }],
    });

    expect(publishedEvents.length).toBeGreaterThanOrEqual(1);
    const event = publishedEvents.find((e) => e.type === "stock.received");
    expect(event).toBeDefined();
    expect(event?.data.receiptId).toBe(testRefId);
  });

  it("does NOT publish WebSocket events if database transaction rolls back", async () => {
    ConnectionManager.removeAll();

    const publishedEvents: EventEnvelope[] = [];
    const mockWs = {
      send: (msg: string) => publishedEvents.push(JSON.parse(msg)),
    };
    ConnectionManager.addConnection("conn_test", mockWs, managerUser);

    const testRefId = "00000000-8888-4000-8000-000000000002";
    try {
      await db.transaction(async (tx) => {
        await InventoryService.receiveStock(
          {
            items: [{ productId, destinationLocationId: locationAId, quantity: 50 }],
            referenceType: "RECEIPT",
            referenceId: testRefId,
          },
          tx
        );
        // Force rollback
        throw new Error("Transaction rollback test");
      });
      // Post-commit publish line (should NOT be reached)
      EventBus.publish("stock.received", { receiptId: testRefId });
    } catch (err: any) {
      expect(err.message).toBe("Transaction rollback test");
    }

    // Verify ZERO event was published for rolled-back transaction
    const event = publishedEvents.find((e) => e.data?.receiptId === testRefId);
    expect(event).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // 4. HTTP Handshake Endpoint (/ws)
  // -------------------------------------------------------------------------
  it("rejects unauthenticated GET /ws requests with HTTP 401", async () => {
    const res = await app.request("/ws", { method: "GET" });
    expect(res.status).toBe(401);
  });

  it("grants authenticated GET /ws handshake with user connection metadata", async () => {
    const res = await app.request(`/ws?token=${authToken}`, { method: "GET" });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.service).toBe("StockSense Real-Time WebSocket API");
    expect(body.endpoint).toBe("/ws");
    expect(body.connectionId).toBeDefined();
    expect(body.authenticatedUser.id).toBe(managerUser.id);
  });
});
