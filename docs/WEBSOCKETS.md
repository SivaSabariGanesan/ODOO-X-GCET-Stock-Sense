# StockSense — Real-Time WebSocket Layer Specification

This document details the **Real-Time WebSocket Infrastructure** integrated into StockSense (`backend/src/modules/websocket/`).

---

## 1. Architecture Overview

StockSense implements an event-driven **Pub/Sub WebSocket Layer** on top of Bun and Hono WebSockets. Live events are broadcast to connected clients to update UI dashboards, stock counts, and movement history streams instantaneously without polling.

```text
┌─────────────────────────┐
│  Stock-Altering Action  │ (Receipt, Delivery, Transfer, Adjustment)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ PostgreSQL Transaction  │ db.transaction(async (tx) => { ... })
└────────────┬────────────┘
             │
             ├───────────────────► [COMMIT SUCCESS]
             │                            │
             ▼                            ▼
┌─────────────────────────┐      ┌──────────────────────────┐
│ PostgreSQL DB Updated   │      │   EventBus Singleton     │
└─────────────────────────┘      └────────────┬─────────────┘
                                              │ Broadcast
                                              ▼
                                 ┌──────────────────────────┐
                                 │ WebSocket Clients        │
                                 │ (inventory, admin, user) │
                                 └──────────────────────────┘
```

---

## 2. Post-Commit Guarantee

To prevent notifying clients of phantom state changes:
1. All stock processing services (`ReceiptProcessingService`, `DeliveryProcessingService`, `TransferService`, `AdjustmentService`) execute database modifications inside single PostgreSQL transactions.
2. The `EventBus.publish()` call is executed **strictly after** the database transaction successfully commits.
3. If a transaction fails or rolls back, zero WebSocket events are published.

---

## 3. Connection Handshake & Authentication

- **Endpoint**: `GET /ws`
- **Protocol**: WebSocket (`ws://` or `wss://`)
- **Authentication**: Bearer JWT token passed as a query parameter or header during the WebSocket handshake (`ws://127.0.0.1:3001/ws?token=<JWT_TOKEN>`).
- **Connection Metadata**: Upon connection, the server registers the connection and assigns default pub/sub channels:
  - Global inventory channel: `inventory`
  - User channel: `user:<USER_ID>`
  - Role channel: `role:<ROLE>` (`role:admin`, `role:manager`, `role:user`)

---

## 4. Pub/Sub Channel Architecture

| Channel Name | Access Control | Event Types Broadcasted |
|---|---|---|
| `inventory` | All authenticated users | `INVENTORY_BALANCE_UPDATED`, `STOCK_MOVEMENT_RECORDED`, `RECEIPT_PROCESSED`, `DELIVERY_PROCESSED`, `TRANSFER_EXECUTED`, `ADJUSTMENT_APPLIED` |
| `role:admin` | `admin` role only | `LOW_STOCK_ALERT`, system audit alerts, administrative operations |
| `role:manager` | `admin` & `manager` roles | `LOW_STOCK_ALERT`, warehouse operation completions |
| `user:<USER_ID>` | Targeted user only | Account security alerts, verification status, personal task notifications |

---

## 5. Event Envelope Schemas

Every broadcast message follows a standardized `EventEnvelope` JSON structure:

```json
{
  "eventId": "evt_1790420000000_abc123",
  "eventType": "INVENTORY_BALANCE_UPDATED",
  "timestamp": "2026-09-26T16:58:00.000Z",
  "channel": "inventory",
  "payload": { ... }
}
```

### 5.1 `INVENTORY_BALANCE_UPDATED`
Broadcasted when physical stock quantity at a storage location changes.
```json
{
  "eventId": "evt_987654",
  "eventType": "INVENTORY_BALANCE_UPDATED",
  "timestamp": "2026-09-26T16:58:00.000Z",
  "channel": "inventory",
  "payload": {
    "productId": "p_123",
    "productSku": "RM-STEEL-001",
    "locationId": "loc_456",
    "locationName": "WH01 / Shelf A1",
    "previousQuantity": 100,
    "newQuantity": 150,
    "change": 50
  }
}
```

### 5.2 `STOCK_MOVEMENT_RECORDED`
Broadcasted when a new immutable audit ledger entry is appended.
```json
{
  "eventId": "evt_987655",
  "eventType": "STOCK_MOVEMENT_RECORDED",
  "timestamp": "2026-09-26T16:58:00.000Z",
  "channel": "inventory",
  "payload": {
    "movementId": "mov_789",
    "productName": "Steel Sheet",
    "movementType": "RECEIPT",
    "quantityChange": 50,
    "referenceNumber": "REC-2026-001"
  }
}
```

### 5.3 `LOW_STOCK_ALERT`
Broadcasted to `role:admin` and `role:manager` when stock drops below the minimum reorder threshold.
```json
{
  "eventId": "evt_987656",
  "eventType": "LOW_STOCK_ALERT",
  "timestamp": "2026-09-26T16:58:00.000Z",
  "channel": "role:admin",
  "payload": {
    "productId": "p_123",
    "productName": "Copper Wire",
    "currentStock": 8,
    "minQuantity": 20,
    "locationName": "Main Warehouse / Bin 02"
  }
}
```

---

## 6. Frontend Client Integration Example

```typescript
const token = localStorage.getItem("stocksense_token");
const ws = new WebSocket(`ws://127.0.0.1:3001/ws?token=${token}`);

ws.onopen = () => {
  console.log("Connected to StockSense Real-Time Event Stream");
};

ws.onmessage = (event) => {
  const envelope = JSON.parse(event.data);
  switch (envelope.eventType) {
    case "INVENTORY_BALANCE_UPDATED":
      updateStockBalanceUI(envelope.payload);
      break;
    case "LOW_STOCK_ALERT":
      triggerToastAlert(`Low Stock Warning: ${envelope.payload.productName}`);
      break;
  }
};
```
