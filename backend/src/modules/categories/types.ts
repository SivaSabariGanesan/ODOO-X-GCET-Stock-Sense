import { Category } from "../../db/schema/categories";

export type CategoryDetails = Category;

export interface CreateCategoryInput {
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  color?: string | null;
  isActive?: boolean;
}

export interface ListCategoriesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}
