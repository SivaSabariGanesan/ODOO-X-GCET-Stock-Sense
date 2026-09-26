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

export interface StockBalanceDTO {
  id: string;
  productId: string;
  locationId: string;
  quantity: string;
  reservedQuantity: string;
  lastMovedAt: Date;
}
