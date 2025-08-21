'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, AuthUser, LoginCredentials, RegisterCredentials, PasswordlessRequest, PasswordlessVerification } from '@/lib/api'
import { apiClient, useApi } from '@/lib/apiClient'
import { ErrorHandler, FrontendErrorCode } from '@/lib/errorHandler'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  clearError: () => void
  signIn: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  signUp: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  updateUser: (userData: Partial<AuthUser>) => Promise<{ success: boolean; error?: string }>
  sendPasswordlessCode: (request: PasswordlessRequest) => Promise<{ success: boolean; error?: string }>
  verifyPasswordlessCode: (request: PasswordlessVerification) => Promise<{ success: boolean; error?: string }>
  isOnline: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Ignore localStorage errors
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(key)
    } catch {
      // Ignore localStorage errors
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected')
  const [isClient, setIsClient] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const api = useApi()

  const clearError = () => setError(null)

  const handleAuthError = (error: any, context: string): string => {
    const authError = ErrorHandler.handleApiError(error, {
      component: 'AuthProvider',
      action: context
    })
    
    const userMessage = ErrorHandler.getUserFriendlyMessage(authError)
    setError(userMessage)
    
    return userMessage
  }

  // Helper to get CSRF token from cookie
  const getCSRFToken = (): string | null => {
    if (typeof document === 'undefined') return null
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('csrf-token='))
      ?.split('=')[1] || null
  }

  // Set client flag to prevent SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Only run auth initialization on client side
    if (!isClient) return

    const initAuth = async () => {
      console.log('🔍 AuthProvider - Initializing auth...');
      try {
        // Check for CSRF token in cookies
        const token = getCSRFToken()
        if (token) {
          setCsrfToken(token)
          console.log('🔍 AuthProvider - CSRF token found in cookies');
        }

        // Try to validate existing session with the backend
        const response = await fetch('/api/users/profile', {
          credentials: 'include', // Include HTTP-only cookies
          headers: {
            'x-csrf-token': token || '', // Send CSRF token in header
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            console.log('🔍 AuthProvider - Valid session found:', result.data);
            setUser({
              id: result.data.id,
              email: result.data.email,
              name: result.data.name,
              tenantId: result.data.tenantId,
              roles: result.data.roles || [],
              profilePicture: result.data.profilePicture,
              createdAt: result.data.createdAt,
              updatedAt: result.data.updatedAt
            });
            if (result.csrfToken) {
              setCsrfToken(result.csrfToken);
            }
          }
        } else {
          console.log('🔍 AuthProvider - No valid session found');
        }
      } catch (error) {
        console.error('🔍 AuthProvider - Error during auth init:', error)
      } finally {
        console.log('🔍 AuthProvider - Setting loading to false');
        setLoading(false)
      }
    }

    initAuth()
  }, [isClient])

  const signIn = async (credentials: LoginCredentials) => {
    setLoading(true)
    clearError()
    
    try {
      const result = await authApi.login(credentials)
      
      if (!result.success || !result.data) {
        const errorMessage = handleAuthError(result, 'signIn')
        return { success: false, error: errorMessage }
      }

      const { user, token } = result.data
      
      // Store auth data (TODO: Replace with HTTP-only cookies)
      safeLocalStorage.setItem('metricsoft_auth_token', token)
      safeLocalStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      // Set the token in the API client
      apiClient.setAuthToken(token)
      
      return { success: true }
    } catch (error: any) {
      console.error('Sign in error:', error)
      const errorMessage = handleAuthError(error, 'signIn')
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (credentials: RegisterCredentials) => {
    setLoading(true)
    clearError()
    
    try {
      const result = await authApi.register(credentials)
      
      if (!result.success || !result.data) {
        const errorMessage = handleAuthError(result, 'signUp')
        return { success: false, error: errorMessage }
      }

      const { user, token } = result.data
      
      // Store auth data (TODO: Replace with HTTP-only cookies)
      safeLocalStorage.setItem('metricsoft_auth_token', token)
      safeLocalStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      // Set the token in the API client
      apiClient.setAuthToken(token)
      
      return { success: true }
    } catch (error: any) {
      console.error('Sign up error:', error)
      const errorMessage = handleAuthError(error, 'signUp')
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userData: Partial<AuthUser>) => {
    setLoading(true)
    clearError()
    
    try {
      // Update user profile via API
      const result = await api.put('/users/profile', userData)
      
      if (!result.success) {
        const errorMessage = handleAuthError(result, 'updateUser')
        return { success: false, error: errorMessage }
      }

      // Use the updated user data from the API response
      if (result.data && (result.data as any).user) {
        const updatedUser = (result.data as any).user as AuthUser
        safeLocalStorage.setItem('metricsoft_user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      } else {
        // Fallback: merge the provided data with existing user
        const updatedUser = { ...user, ...userData } as AuthUser
        safeLocalStorage.setItem('metricsoft_user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Update user error:', error)
      const errorMessage = handleAuthError(error, 'updateUser')
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const sendPasswordlessCode = async (request: PasswordlessRequest) => {
    clearError()
    
    try {
      const result = await authApi.sendPasswordlessCode(request)
      
      if (!result.success) {
        // Handle both string and object errors
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Failed to send code'
        const authErrorMessage = handleAuthError({ error: errorMessage }, 'sendPasswordlessCode')
        return { success: false, error: authErrorMessage }
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Send passwordless code error:', error)
      // Handle axios error structure and new error structure
      const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.error || 
                           error.message ||
                           'An unexpected error occurred'
      const authErrorMessage = handleAuthError(error, 'sendPasswordlessCode')
      return { success: false, error: authErrorMessage }
    }
  }

  const verifyPasswordlessCode = async (request: PasswordlessVerification) => {
    setLoading(true)
    clearError()
    
    try {
      const response = await fetch('/api/auth/passwordless', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include HTTP-only cookies
        body: JSON.stringify({
          action: 'verify',
          email: request.email,
          code: request.code
        })
      })

      const result = await response.json()
      
      if (!response.ok || !result.success || !result.data) {
        const errorMessage = result.error || 'Verification failed'
        const authErrorMessage = handleAuthError({ error: errorMessage }, 'verifyPasswordlessCode')
        return { success: false, error: authErrorMessage }
      }

      const { user } = result.data
      
      // Set user state (no localStorage needed - cookies handle auth!)
      setUser(user)
      
      // Store CSRF token for future API calls
      if (result.csrfToken) {
        setCsrfToken(result.csrfToken)
      }
      
      return { success: true }
    } catch (error: any) {
      console.error('Verify passwordless code error:', error)
      const errorMessage = error.message || 'An unexpected error occurred'
      const authErrorMessage = handleAuthError(error, 'verifyPasswordlessCode')
      return { success: false, error: authErrorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      // Call logout endpoint to clear HTTP-only cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include HTTP-only cookies
        headers: {
          'x-csrf-token': csrfToken || '', // Send CSRF token if available
        }
      })

      // Clear local state regardless of response
      setUser(null)
      setCsrfToken(null)
      
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      // Still clear local state even if logout request fails
      setUser(null)
      setCsrfToken(null)
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    clearError,
    signIn,
    signUp,
    signOut,
    updateUser,
    sendPasswordlessCode,
    verifyPasswordlessCode,
    isOnline,
    connectionStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
