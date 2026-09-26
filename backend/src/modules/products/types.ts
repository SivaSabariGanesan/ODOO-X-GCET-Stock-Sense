import { Product } from "../../db/schema/products";
import { Category } from "../../db/schema/categories";
import { UnitOfMeasure } from "../../db/schema/units-of-measure";

export interface ProductWithDetails extends Product {
  category?: Partial<Category> | null;
  uom?: Partial<UnitOfMeasure> | null;
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  categoryId?: string;
  uomId: string;
  barcode?: string;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string;
  categoryId?: string | null;
  uomId?: string;
  barcode?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ListProductsQuery {
  page?: number;
  limit?: number;
  search?: string;
  sku?: string;
  categoryId?: string;
  uomId?: string;
  isActive?: boolean;
}
