import { InternalTransfer, InternalTransferStatus } from "../../db/schema/internal-transfers";
import { InternalTransferItem } from "../../db/schema/internal-transfer-items";
import { Product } from "../../db/schema/products";
import { Location } from "../../db/schema/locations";

// ---------------------------------------------------------------------------
// Internal Transfer DTOs & Types
// ---------------------------------------------------------------------------

export interface InternalTransferItemWithRelations extends InternalTransferItem {
  product?: Product;
}

export interface InternalTransferWithDetails extends InternalTransfer {
  sourceLocation?: Location;
  destinationLocation?: Location;
  items: InternalTransferItemWithRelations[];
}

export interface CreateInternalTransferItemInput {
  productId: string;
  quantity: number | string;
}

export interface CreateInternalTransferInput {
  transferNumber?: string;
  notes?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  items?: CreateInternalTransferItemInput[];
}

export interface UpdateInternalTransferInput {
  notes?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
}

export interface UpdateInternalTransferItemInput {
  quantity: number | string;
}

export interface ListInternalTransfersQuery {
  page?: number;
  limit?: number;
  status?: InternalTransferStatus;
  sourceLocationId?: string;
  destinationLocationId?: string;
  search?: string;
}

export interface InternalTransferValidationResult {
  valid: boolean;
  transfer: InternalTransferWithDetails;
  errors: string[];
}
