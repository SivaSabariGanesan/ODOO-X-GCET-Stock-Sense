import type { Location } from "../../db/schema/locations.js";

export interface LocationDetails extends Location {
  warehouseName?: string;
  warehouseShortCode?: string;
  parentName?: string;
  parentFullPath?: string;
  childrenCount?: number;
}

export interface CreateLocationInput {
  warehouseId: string;
  parentId?: string | null;
  name: string;
  fullPath?: string;
  locationType?: "internal" | "input" | "output" | "quality_control" | "virtual";
  isActive?: boolean;
}

export interface UpdateLocationInput {
  warehouseId?: string;
  parentId?: string | null;
  name?: string;
  fullPath?: string;
  locationType?: "internal" | "input" | "output" | "quality_control" | "virtual";
  isActive?: boolean;
}

export interface ListLocationsQuery {
  page?: number;
  limit?: number;
  warehouseId?: string;
  parentId?: string | null;
  search?: string;
  locationType?: string;
  isActive?: boolean;
  sortBy?: "name" | "fullPath" | "locationType" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface PaginatedLocationsResponse {
  data: LocationDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
