import { Delivery, DeliveryStatus } from "../../db/schema/deliveries.js";
import { DeliveryItem } from "../../db/schema/delivery-items.js";

// ---------------------------------------------------------------------------
// Delivery Core Domain Types & DTOs
// ---------------------------------------------------------------------------

export interface DeliveryItemWithRelations extends DeliveryItem {
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  sourceLocation?: {
    id: string;
    name: string;
    fullPath: string;
  };
}

export interface DeliveryWithDetails extends Delivery {
  warehouse?: {
    id: string;
    name: string;
    shortCode: string;
  };
  defaultSourceLocation?: {
    id: string;
    name: string;
    fullPath: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  items: DeliveryItemWithRelations[];
}

export interface CreateDeliveryItemInput {
  productId: string;
  sourceLocationId?: string;
  quantity: string | number;
  unitPrice?: string | number;
  notes?: string;
}

export interface CreateDeliveryInput {
  deliveryNumber?: string;
  customerName?: string;
  customerReference?: string;
  notes?: string;
  warehouseId: string;
  defaultSourceLocationId?: string;
  items?: CreateDeliveryItemInput[];
}

export interface UpdateDeliveryInput {
  customerName?: string;
  customerReference?: string;
  notes?: string;
  warehouseId?: string;
  defaultSourceLocationId?: string;
}

export interface UpdateDeliveryItemInput {
  sourceLocationId?: string;
  quantity?: string | number;
  unitPrice?: string | number;
  notes?: string;
}

export interface ListDeliveriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: DeliveryStatus;
  warehouseId?: string;
}

export interface DeliveryValidationResult {
  isValid: boolean;
  errors: string[];
  delivery: DeliveryWithDetails;
  items: DeliveryItemWithRelations[];
}
