import { InventoryAdjustment, InventoryAdjustmentStatus } from "../../db/schema/inventory-adjustments";
import { InventoryAdjustmentItem } from "../../db/schema/inventory-adjustment-items";
import { Product } from "../../db/schema/products";
import { Location } from "../../db/schema/locations";

// ---------------------------------------------------------------------------
// Inventory Adjustment DTOs & Types
// ---------------------------------------------------------------------------

export interface InventoryAdjustmentItemWithRelations extends InventoryAdjustmentItem {
  product?: Product;
}

export interface InventoryAdjustmentWithDetails extends InventoryAdjustment {
  location?: Location;
  items: InventoryAdjustmentItemWithRelations[];
}

export interface CreateInventoryAdjustmentItemInput {
  productId: string;
  countedQuantity: number | string;
}

export interface CreateInventoryAdjustmentInput {
  adjustmentNumber?: string;
  reason?: string;
  locationId: string;
  items?: CreateInventoryAdjustmentItemInput[];
}

export interface UpdateInventoryAdjustmentInput {
  reason?: string;
  locationId?: string;
}

export interface UpdateInventoryAdjustmentItemInput {
  countedQuantity: number | string;
}

export interface ListInventoryAdjustmentsQuery {
  page?: number;
  limit?: number;
  status?: InventoryAdjustmentStatus;
  locationId?: string;
  search?: string;
}

export interface InventoryAdjustmentValidationResult {
  valid: boolean;
  adjustment: InventoryAdjustmentWithDetails;
  errors: string[];
}

export interface AdjustmentItemPreview {
  id: string;
  productId: string;
  productName?: string;
  systemQuantity: number;
  countedQuantity: number;
  difference: number;
}

export interface AdjustmentPreviewResult {
  adjustmentId: string;
  adjustmentNumber: string;
  locationId: string;
  locationName?: string;
  items: AdjustmentItemPreview[];
}
