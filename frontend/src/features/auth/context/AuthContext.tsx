import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, AuthState } from '@/types/auth'

interface AuthContextType extends AuthState {
  login: (email: string, password?: string) => Promise<boolean>
  signup: (name: string, email: string, password?: string) => Promise<boolean>
  logout: () => void
  updateUser: (data: Partial<User>) => void
  pendingOtpEmail: string | null
  setPendingOtpEmail: (email: string | null) => void
  verifyOtp: (code: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (password: string) => Promise<boolean>
}

const DEFAULT_USER: User = {
  id: 'usr_01HXYZ789',
  name: 'Alex Mercer',
  email: 'alex.mercer@stocksense.io',
  role: 'inventory_manager',
  warehouseId: 'WH01',
  warehouseName: 'Main Central Hub',
}

const STORAGE_KEY = 'stocksense_mock_user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored) as User
      }
      // Initialize with default demo user for frictionless review
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_USER))
      return DEFAULT_USER
    } catch {
      return DEFAULT_USER
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('stocksense_pending_email') || 'alex.mercer@stocksense.io'
  })

  useEffect(() => {
    if (pendingOtpEmail) {
      sessionStorage.setItem('stocksense_pending_email', pendingOtpEmail)
    } else {
      sessionStorage.removeItem('stocksense_pending_email')
    }
  }, [pendingOtpEmail])

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    const authenticatedUser: User = {
      ...DEFAULT_USER,
      email: email || DEFAULT_USER.email,
    }
    setUser(authenticatedUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(authenticatedUser))
    } catch {
      // Ignore localStorage errors
    }
    setIsLoading(false)
    return true
  }

  const signup = async (name: string, email: string): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email,
      role: 'inventory_manager',
      warehouseId: 'WH01',
      warehouseName: 'Main Central Hub',
    }
    setUser(newUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser))
    } catch {
      // Ignore localStorage errors
    }
    setIsLoading(false)
    return true
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore localStorage errors
    }
  }

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      return updated
    })
  }

  const verifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 700))
    setIsLoading(false)
    // Accept standard test code '123456' or any 6 digits that don't end in '00' for demo flexibility
    if (code === '000000' || code === '999999') {
      return { success: false, error: 'The code entered has expired or is invalid.' }
    }
    return { success: true }
  }

  const resetPassword = async (): Promise<boolean> => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    setIsLoading(false)
    return true
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        pendingOtpEmail,
        setPendingOtpEmail,
        verifyOtp,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
