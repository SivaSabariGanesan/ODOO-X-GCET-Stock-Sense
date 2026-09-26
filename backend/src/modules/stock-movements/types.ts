import { StockMovement, MovementType, ReferenceType } from "../../db/schema/stock-movements";
import { Product } from "../../db/schema/products";
import { Location } from "../../db/schema/locations";
import { User } from "../../db/schema/users";

// ---------------------------------------------------------------------------
// Stock Movement / Ledger DTOs & Types
// ---------------------------------------------------------------------------

export interface StockMovementWithDetails extends StockMovement {
  product?: Product;
  sourceLocation?: Location;
  destinationLocation?: Location;
  creator?: Partial<User>;
}

export interface RecordMovementInput {
  productId: string;
  sourceLocationId?: string | null;
  destinationLocationId?: string | null;
  quantity: number | string;
  movementType: MovementType;
  referenceType: ReferenceType;
  referenceId: string;
  createdBy?: string | null;
}

export interface RecordTransferMovementsInput {
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number | string;
  referenceType?: ReferenceType;
  referenceId: string;
  createdBy?: string | null;
}

export interface ListStockMovementsQuery {
  page?: number;
  limit?: number;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
  movementType?: MovementType;
  referenceType?: ReferenceType;
  referenceId?: string;
  createdBy?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export interface PaginatedStockMovementsResponse {
  data: StockMovementWithDetails[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
