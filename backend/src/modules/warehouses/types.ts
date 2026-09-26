import { Warehouse } from "../../db/schema/warehouses";

export type WarehouseDetails = Warehouse;

export interface CreateWarehouseInput {
  name: string;
  shortCode: string;
  description?: string;
  address?: string;
  isActive?: boolean;
}

export interface UpdateWarehouseInput {
  name?: string;
  shortCode?: string;
  description?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface ListWarehousesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
