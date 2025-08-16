'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, AuthUser, LoginCredentials, RegisterCredentials, PasswordlessRequest, PasswordlessVerification } from '@/lib/api'
import { apiClient } from '@/lib/apiClient'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>
  signUp: (credentials: RegisterCredentials) => Promise<{ error?: string }>
  signOut: () => Promise<{ error?: string }>
  sendPasswordlessCode: (request: PasswordlessRequest) => Promise<{ error?: string }>
  verifyPasswordlessCode: (request: PasswordlessVerification) => Promise<{ error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      console.log('🔍 AuthProvider - Initializing auth...');
      try {
        const token = localStorage.getItem('metricsoft_auth_token')
        const userData = localStorage.getItem('metricsoft_user')
        
        console.log('🔍 AuthProvider - Token exists:', !!token);
        console.log('🔍 AuthProvider - User data exists:', !!userData);
        
        if (token && userData) {
          const user = JSON.parse(userData)
          console.log('🔍 AuthProvider - Parsed user:', user);
          setUser(user)
          // Set the token in the API client
          apiClient.setAuthToken(token)
        }
      } catch (error) {
        console.error('🔍 AuthProvider - Error during auth init:', error)
        localStorage.removeItem('metricsoft_auth_token')
        localStorage.removeItem('metricsoft_user')
        apiClient.clearAuthToken()
      } finally {
        console.log('🔍 AuthProvider - Setting loading to false');
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      const result = await authApi.login(credentials)
      
      if (!result.success || !result.data) {
        return { error: result.error || 'Login failed' }
      }

      const { user, token } = result.data
      
      // Store auth data
      localStorage.setItem('metricsoft_auth_token', token)
      localStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      // Set the token in the API client
      apiClient.setAuthToken(token)
      
      return {}
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { error: error.response?.data?.error || 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (credentials: RegisterCredentials) => {
    setLoading(true)
    try {
      const result = await authApi.register(credentials)
      
      if (!result.success || !result.data) {
        return { error: result.error || 'Registration failed' }
      }

      const { user, token } = result.data
      
      // Store auth data
      localStorage.setItem('metricsoft_auth_token', token)
      localStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      // Set the token in the API client
      apiClient.setAuthToken(token)
      
      return {}
    } catch (error: any) {
      console.error('Sign up error:', error)
      return { error: error.response?.data?.error || 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const sendPasswordlessCode = async (request: PasswordlessRequest) => {
    try {
      const result = await authApi.sendPasswordlessCode(request)
      
      if (!result.success) {
        // Handle both string and object errors
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Failed to send code'
        return { error: errorMessage }
      }
      
      return {}
    } catch (error: any) {
      console.error('Send passwordless code error:', error)
      // Handle axios error structure and new error structure
      const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.error || 
                           error.message ||
                           'An unexpected error occurred'
      return { error: errorMessage }
    }
  }

  const verifyPasswordlessCode = async (request: PasswordlessVerification) => {
    setLoading(true)
    try {
      const result = await authApi.verifyPasswordlessCode(request)
      
      if (!result.success || !result.data) {
        const errorMessage = typeof result.error === 'string' 
          ? result.error 
          : (result.error as any)?.message || 'Verification failed'
        return { error: errorMessage }
      }

      const { user, token } = result.data
      
      // Store auth data
      localStorage.setItem('metricsoft_auth_token', token)
      localStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      // Set the token in the API client
      apiClient.setAuthToken(token)
      
      return {}
    } catch (error: any) {
      console.error('Verify passwordless code error:', error)
      const errorMessage = error.response?.data?.error?.message || 
                           error.response?.data?.error || 
                           error.message ||
                           'An unexpected error occurred'
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      localStorage.removeItem('metricsoft_auth_token')
      localStorage.removeItem('metricsoft_user')
      setUser(null)
      // Clear the token from the API client
      apiClient.clearAuthToken()
      return {}
    } catch (error) {
      console.error('Sign out error:', error)
      return { error: 'An unexpected error occurred' }
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordlessCode,
    verifyPasswordlessCode
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
