import { MovementType, ReferenceType } from "../../db/schema/stock-movements";

// ---------------------------------------------------------------------------
// Dashboard DTOs & Types
// ---------------------------------------------------------------------------

export interface StockByUom {
  uomId: string;
  uomName: string;
  uomAbbreviation: string;
  totalQuantity: string;
  totalReservedQuantity: string;
}

export interface DashboardSummary {
  totalProducts: number;
  totalWarehouses: number;
  totalLocations: number;
  totalStockItems: number;
  lowStockCount: number;
  recentMovementsCount: number;
  stockByUom: StockByUom[];
}

export interface LowStockItem {
  ruleId: string;
  productId: string;
  productName: string;
  productSku: string;
  uom: {
    id: string;
    name: string;
    abbreviation: string;
  };
  warehouse: {
    id: string;
    name: string;
    shortCode: string;
  };
  location: {
    id: string;
    name: string;
    fullPath: string;
  };
  minQuantity: string;
  maxQuantity: string | null;
  reorderQty: string;
  currentQuantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  shortageQuantity: string;
}

export interface PaginatedLowStockResponse {
  data: LowStockItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardWarehouseSummary {
  id: string;
  name: string;
  shortCode: string;
  isActive: boolean;
  locationCount: number;
  totalStockItems: number;
  lowStockCount: number;
  stockByUom: Array<{
    uomId: string;
    uomName: string;
    uomAbbreviation: string;
    quantity: string;
  }>;
}

export interface DashboardStockQuery {
  page?: number;
  limit?: number;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  categoryId?: string;
  search?: string;
  lowStock?: boolean;
}

export interface DashboardLowStockQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  locationId?: string;
  productId?: string;
  search?: string;
}

export interface DashboardMovementsQuery {
  page?: number;
  limit?: number;
  productId?: string;
  warehouseId?: string;
  locationId?: string;
  movementType?: MovementType;
  referenceType?: ReferenceType;
  fromDate?: string;
  toDate?: string;
  search?: string;
}
