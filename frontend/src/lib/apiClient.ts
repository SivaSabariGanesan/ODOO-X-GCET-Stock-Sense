/**
 * Base API Client
 * Wraps the native Fetch API with:
 *  - Automatic Bearer token from localStorage
 *  - JSON serialization / deserialization
 *  - Typed ApiError for non-2xx responses
 *  - VITE_API_BASE_URL env-driven base URL
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000'
const AUTH_TOKEN_KEY = 'stocksense_auth_token'

// ---------------------------------------------------------------------------
// Typed API Error
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number
  data?: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

let memoryToken: string | null = null

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  memoryToken = token
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    }
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  memoryToken = null
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  /** Skip auth token injection (e.g. login endpoint) */
  skipAuth?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, skipAuth = false } = options

  // Build URL with query params
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v))
      }
    })
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  if (!skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })

  let json: unknown
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    json = await response.json()
  }

  if (!response.ok) {
    const errJson = json as { message?: string; error?: string } | undefined
    const message =
      errJson?.message || errJson?.error || `Request failed: ${response.status} ${response.statusText}`
    throw new ApiError(message, response.status, json)
  }

  return json as T
}

// ---------------------------------------------------------------------------
// Convenience Methods
// ---------------------------------------------------------------------------
export const apiClient = {
  get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return request<T>(path, { method: 'GET', params })
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body })
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PATCH', body })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body })
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
  postPublic<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body, skipAuth: true })
  },
}
