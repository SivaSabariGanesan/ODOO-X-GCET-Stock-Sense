/**
 * Units of Measure (UOM) Types & Data Contracts
 * Mirrors backend UnitOfMeasure schema and routes.
 */

export interface ApiUom {
  id: string
  name: string
  abbreviation: string
  description?: string | null
  measureType?: string | null
  isActive: boolean
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

export interface ApiListUomsResponse {
  data: ApiUom[]
  meta: ApiPagination
  pagination: ApiPagination
}

export interface ApiUomResponse {
  data: ApiUom
}

export interface CreateUomPayload {
  name: string
  abbreviation: string
  description?: string | null
  measureType?: string | null
  isActive?: boolean
}

export interface UpdateUomPayload {
  name?: string
  abbreviation?: string
  description?: string | null
  measureType?: string | null
  isActive?: boolean
}

export interface ListUomsParams {
  page?: number
  limit?: number
  search?: string
  measureType?: string
  isActive?: boolean
}

export interface UomFiltersState {
  search: string
  measureType: string
  status: 'all' | 'active' | 'inactive'
}
