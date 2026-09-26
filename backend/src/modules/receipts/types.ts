import { Receipt, ReceiptStatus } from "../../db/schema/receipts";
import { ReceiptItem } from "../../db/schema/receipt-items";

// ---------------------------------------------------------------------------
// Receipt Core Domain Types & Data Transfer Objects
// ---------------------------------------------------------------------------

export interface ReceiptItemWithRelations extends ReceiptItem {
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  destinationLocation?: {
    id: string;
    name: string;
    fullPath: string;
  };
}

export interface ReceiptWithDetails extends Receipt {
  warehouse?: {
    id: string;
    name: string;
    shortCode: string;
  };
  defaultLocation?: {
    id: string;
    name: string;
    fullPath: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  items: ReceiptItemWithRelations[];
}

export interface CreateReceiptItemInput {
  productId: string;
  destinationLocationId?: string;
  quantity: string | number;
  unitPrice?: string | number;
  notes?: string;
}

export interface CreateReceiptInput {
  receiptNumber?: string;
  supplierName?: string;
  supplierReference?: string;
  notes?: string;
  warehouseId: string;
  defaultLocationId?: string;
  items?: CreateReceiptItemInput[];
}

export interface UpdateReceiptInput {
  supplierName?: string;
  supplierReference?: string;
  notes?: string;
  warehouseId?: string;
  defaultLocationId?: string;
}

export interface UpdateReceiptItemInput {
  destinationLocationId?: string;
  quantity?: string | number;
}

export interface ListReceiptsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReceiptStatus;
  warehouseId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  receipt: ReceiptWithDetails;
  items: ReceiptItemWithRelations[];
}
