import type { StockBalance } from "../../db/schema/stock-balances.js";

export interface StockBalanceDetails extends StockBalance {
  productName?: string;
  productSku?: string;
  uomName?: string;
  uomAbbreviation?: string;
  locationName?: string;
  locationFullPath?: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouseShortCode?: string;
  availableQuantity?: string;
}

export interface IncreaseStockInput {
  productId: string;
  locationId: string;
  quantity: number | string;
}

export interface DecreaseStockInput {
  productId: string;
  locationId: string;
  quantity: number | string;
}

export interface SetStockInput {
  productId: string;
  locationId: string;
  quantity: number | string;
}

export interface ReserveStockInput {
  productId: string;
  locationId: string;
  quantity: number | string;
}

export interface UnreserveStockInput {
  productId: string;
  locationId: string;
  quantity: number | string;
}

export interface TransferStockPrimitiveInput {
  productId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number | string;
}

export interface ListBalancesQuery {
  page?: number;
  limit?: number;
  productId?: string;
  locationId?: string;
  warehouseId?: string;
  categoryId?: string;
  search?: string;
  hasStock?: boolean;
  minQuantity?: number | string;
  maxQuantity?: number | string;
  sortBy?: "quantity" | "lastMovedAt" | "createdAt" | "productName";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedBalancesResponse {
  data: StockBalanceDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
