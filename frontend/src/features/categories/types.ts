/**
 * Categories Types & Data Contracts
 * Mirrors backend Category schema and routes.
 */

export interface ApiCategory {
  id: string
  name: string
  code?: string
  description?: string | null
  color?: string | null
  isActive: boolean
  parentCategoryId?: string | null
  parentCategory?: {
    id: string
    name: string
  } | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ApiListCategoriesResponse {
  data: ApiCategory[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiCategoryResponse {
  data: ApiCategory
}

export interface CreateCategoryPayload {
  name: string
  code?: string
  description?: string | null
  color?: string | null
  parentCategoryId?: string | null
  isActive?: boolean
}

export interface UpdateCategoryPayload {
  name?: string
  code?: string
  description?: string | null
  color?: string | null
  parentCategoryId?: string | null
  isActive?: boolean
}

export interface ListCategoriesParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  parentCategoryId?: string | null
}

export interface CategoryFiltersState {
  search: string
  status: 'all' | 'active' | 'inactive'
  parentCategory: string
}
