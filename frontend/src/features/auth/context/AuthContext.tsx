import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, AuthState } from '@/types/auth'
import { apiClient } from '@/lib/apiClient'
import { setAuthToken, clearAuthToken, getAuthToken } from '@/lib/apiClient'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Backend response shapes
// ---------------------------------------------------------------------------
interface LoginResponse {
  user: User
  token: string
}

interface RegisterResponse {
  user: User
}

// ---------------------------------------------------------------------------
// Storage key for persisting user profile (NOT the JWT — that lives in apiClient)
// ---------------------------------------------------------------------------
const USER_STORAGE_KEY = 'stocksense_user'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      return stored ? (JSON.parse(stored) as User) : null
    } catch {
      return null
    }
  })

  const [isLoading, setIsLoading] = useState(false)

  const [pendingOtpEmail, setPendingOtpEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('stocksense_pending_email') || null
  })

  // On mount: if we have a stored user but no token, clear the stale user
  useEffect(() => {
    if (user && !getAuthToken()) {
      setUser(null)
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (pendingOtpEmail) {
      sessionStorage.setItem('stocksense_pending_email', pendingOtpEmail)
    } else {
      sessionStorage.removeItem('stocksense_pending_email')
    }
  }, [pendingOtpEmail])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function persistUser(u: User) {
    setUser(u)
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(u))
    } catch {
      // ignore
    }
  }

  function clearUser() {
    setUser(null)
    try {
      localStorage.removeItem(USER_STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Login — calls real backend, stores JWT via setAuthToken
  // ---------------------------------------------------------------------------
  const login = async (email: string, password?: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const res = await apiClient.postPublic<LoginResponse>('/api/auth/login', {
        email,
        password,
      })
      setAuthToken(res.token)
      persistUser(res.user)
      return true
    } catch (err) {
      // Re-throw so the login page's catch block can show the error
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Signup — calls real backend register endpoint
  // ---------------------------------------------------------------------------
  const signup = async (name: string, email: string, password?: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      const res = await apiClient.postPublic<RegisterResponse>('/api/auth/register', {
        name,
        email,
        password,
      })
      // After register, log them in automatically
      persistUser(res.user)
      // Get a token by logging in immediately
      const loginRes = await apiClient.postPublic<LoginResponse>('/api/auth/login', {
        email,
        password,
      })
      setAuthToken(loginRes.token)
      persistUser(loginRes.user)
      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Logout — clears token and user, calls backend logout
  // ---------------------------------------------------------------------------
  const logout = () => {
    // Fire-and-forget backend logout (clears the httpOnly cookie)
    apiClient.post('/api/auth/logout').catch(() => {})
    clearAuthToken()
    clearUser()
  }

  // ---------------------------------------------------------------------------
  // Update user profile in context (for profile page saves)
  // ---------------------------------------------------------------------------
  const updateUser = (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...data }
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }

  // ---------------------------------------------------------------------------
  // OTP verification — calls real backend
  // ---------------------------------------------------------------------------
  const verifyOtp = async (code: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    try {
      await apiClient.postPublic('/api/auth/verify-otp', {
        email: pendingOtpEmail,
        otp: code,
      })
      return { success: true }
    } catch (err: any) {
      const message = err?.message || 'The code entered has expired or is invalid.'
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Reset password — calls real backend
  // ---------------------------------------------------------------------------
  const resetPassword = async (password: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      await apiClient.postPublic('/api/auth/reset-password', {
        email: pendingOtpEmail,
        password,
      })
      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user) && Boolean(getAuthToken()),
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
