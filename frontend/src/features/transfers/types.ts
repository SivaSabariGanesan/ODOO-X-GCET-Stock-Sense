/**
 * Internal Transfers Types
 *
 * Strongly typed models matching the backend Internal Transfers contracts
 * with view-model compatibility for UI components.
 */

// ---------------------------------------------------------------------------
// Backend API Contracts (mirrors backend/src/modules/transfers/)
// ---------------------------------------------------------------------------

export type ApiTransferStatus = 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';

export interface ApiTransferProduct {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  uomId?: string | null;
  uom?: {
    id?: string;
    name?: string;
    abbreviation?: string;
  };
}

export interface ApiTransferLocation {
  id: string;
  name: string;
  fullPath: string;
  warehouseId?: string | null;
  locationType?: string;
}

export interface ApiTransferItem {
  id: string;
  transferId: string;
  productId: string;
  quantity: string | number;
  createdAt: string;
  updatedAt: string;
  product?: ApiTransferProduct;
}

export interface ApiTransfer {
  id: string;
  transferNumber: string;
  notes?: string | null;
  sourceLocationId: string;
  destinationLocationId: string;
  status: ApiTransferStatus;
  createdBy?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceLocation?: ApiTransferLocation;
  destinationLocation?: ApiTransferLocation;
  items: ApiTransferItem[];
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListTransfersResponse {
  data: ApiTransfer[];
  meta: ApiPagination;
  pagination: ApiPagination;
}

export interface ApiTransferResponse {
  data: ApiTransfer;
  message?: string;
}

export interface ApiTransferValidationResult {
  data: {
    valid: boolean;
    errors: string[];
    transfer: ApiTransfer;
  };
}

// ---------------------------------------------------------------------------
// Request Payloads
// ---------------------------------------------------------------------------

export interface CreateTransferItemPayload {
  productId: string;
  quantity: number | string;
}

export interface CreateTransferPayload {
  transferNumber?: string;
  notes?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  items?: CreateTransferItemPayload[];
}

export interface UpdateTransferPayload {
  notes?: string;
  sourceLocationId?: string;
  destinationLocationId?: string;
}

export interface ListTransfersParams {
  page?: number;
  limit?: number;
  status?: ApiTransferStatus;
  sourceLocationId?: string;
  destinationLocationId?: string;
  search?: string;
}

// ---------------------------------------------------------------------------
// Legacy / UI View Models for Component Compatibility
// ---------------------------------------------------------------------------

export type TransferStatus = 'draft' | 'ready' | 'done' | 'cancelled';

export interface TransferLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  sourceLocation: string;
  destinationLocation: string;
  quantity: number;
  unit: string;
}

export interface TransferTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  user: string;
  statusFrom?: TransferStatus;
  statusTo?: TransferStatus;
}

export interface Transfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  sourceLocation: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  destinationLocation: string;
  itemCount: number;
  totalQuantity: number;
  scheduledDate: string;
  createdDate: string;
  status: TransferStatus;
  notes?: string;
  lines: TransferLineItem[];
  timeline: TransferTimelineEvent[];
}

export interface TransferFiltersState {
  search: string;
  status: string;
  sourceWarehouse: string;
  destinationWarehouse: string;
  dateFilter: string;
}
