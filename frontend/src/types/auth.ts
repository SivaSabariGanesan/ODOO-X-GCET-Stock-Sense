export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'inventory_manager' | 'warehouse_operator'
  avatarUrl?: string
  warehouseId?: string
  warehouseName?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}
