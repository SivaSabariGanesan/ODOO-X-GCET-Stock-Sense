import { ReferenceType, MovementType } from "../../db/schema/stock-movements";

// ---------------------------------------------------------------------------
// Inventory Service DTOs & Types
// ---------------------------------------------------------------------------

export interface ReceiveStockItemInput {
  productId: string;
  destinationLocationId: string;
  quantity: string | number;
  sourceLocationId?: string | null;
  unitPrice?: string | number | null;
  notes?: string | null;
}

export interface ReceiveStockInput {
  items: ReceiveStockItemInput[];
  referenceType: ReferenceType; // e.g. "RECEIPT"
  referenceId: string;          // e.g. receiptId
  movementType?: MovementType;  // Default: "RECEIPT"
  createdBy?: string | null;
}

export interface DeliverStockItemInput {
  productId: string;
  sourceLocationId: string;
  quantity: string | number;
  destinationLocationId?: string | null;
  unitPrice?: string | number | null;
  notes?: string | null;
}

export interface DeliverStockInput {
  items: DeliverStockItemInput[];
  referenceType: ReferenceType; // e.g. "DELIVERY"
  referenceId: string;          // e.g. deliveryId
  movementType?: MovementType;  // Default: "DELIVERY"
  createdBy?: string | null;
}

export interface TransferStockItemInput {
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: string | number;
  notes?: string | null;
}

export interface TransferStockInput {
  items: TransferStockItemInput[];
  referenceType: ReferenceType; // e.g. "INTERNAL_TRANSFER"
  referenceId: string;          // e.g. transferId
  movementType?: MovementType;  // Default: "TRANSFER"
  createdBy?: string | null;
}

export interface StockBalanceDTO {
  id: string;
  productId: string;
  locationId: string;
  quantity: string;
  reservedQuantity: string;
  lastMovedAt: Date;
}


