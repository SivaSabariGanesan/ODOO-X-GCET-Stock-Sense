import { SafeUser } from "../auth/types";

// ---------------------------------------------------------------------------
// WebSocket Event Types & Envelopes
// ---------------------------------------------------------------------------

export type EventType =
  | "stock.received"
  | "stock.delivered"
  | "stock.transferred"
  | "stock.adjusted"
  | "inventory.updated"
  | "inventory.low_stock"
  | "system.notification";

export interface EventEnvelope<T = any> {
  type: EventType;
  eventId: string;
  timestamp: string;
  data: T;
}

export interface WsConnectionData {
  connectionId: string;
  user: SafeUser;
  connectedAt: Date;
  channels: Set<string>;
}

export type ClientMessage =
  | { type: "subscribe"; channel: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "ping" };

// ---------------------------------------------------------------------------
// Typed Payload DTOs
// ---------------------------------------------------------------------------

export interface StockReceivedEventData {
  receiptId: string;
  receiptNumber?: string;
  warehouseId?: string;
  items: Array<{
    productId: string;
    destinationLocationId: string;
    quantity: string;
  }>;
  processedBy?: string;
  timestamp: string;
}

export interface StockDeliveredEventData {
  deliveryId: string;
  deliveryNumber?: string;
  warehouseId?: string;
  items: Array<{
    productId: string;
    sourceLocationId: string;
    quantity: string;
  }>;
  processedBy?: string;
  timestamp: string;
}

export interface StockTransferredEventData {
  transferId: string;
  transferNumber?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  items: Array<{
    productId: string;
    quantity: string;
  }>;
  processedBy?: string;
  timestamp: string;
}

export interface StockAdjustedEventData {
  adjustmentId: string;
  adjustmentNumber?: string;
  locationId: string;
  items: Array<{
    productId: string;
    countedQuantity: string;
    previousQuantity?: string;
    difference?: string;
  }>;
  processedBy?: string;
  timestamp: string;
}

export interface InventoryUpdatedEventData {
  operationType: "RECEIPT" | "DELIVERY" | "TRANSFER" | "ADJUSTMENT";
  operationId: string;
  productId?: string;
  locationId?: string;
  warehouseId?: string;
  timestamp: string;
}

export interface InventoryLowStockEventData {
  productId: string;
  productName?: string;
  productSku?: string;
  locationId: string;
  warehouseId?: string;
  minQuantity: string;
  currentQuantity: string;
  shortageQuantity: string;
}
