import type { ReorderRule } from "../../db/schema/reorder-rules.js";

export interface ReorderRuleDetails extends ReorderRule {
  productName?: string;
  productSku?: string;
  locationName?: string;
  locationFullPath?: string;
  warehouseId?: string;
  warehouseName?: string;
  warehouseShortCode?: string;
}

export interface CreateReorderRuleInput {
  productId: string;
  locationId: string;
  minQuantity?: number | string;
  maxQuantity?: number | string | null;
  reorderQty?: number | string;
  isActive?: boolean;
}

export interface UpdateReorderRuleInput {
  productId?: string;
  locationId?: string;
  minQuantity?: number | string;
  maxQuantity?: number | string | null;
  reorderQty?: number | string;
  isActive?: boolean;
}

export interface ListReorderRulesQuery {
  page?: number;
  limit?: number;
  productId?: string;
  locationId?: string;
  warehouseId?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: "minQuantity" | "maxQuantity" | "reorderQty" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedReorderRulesResponse {
  data: ReorderRuleDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
