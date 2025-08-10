'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi, AuthUser, LoginCredentials, RegisterCredentials, PasswordlessRequest, PasswordlessVerification } from '@/lib/api'

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
      try {
        const token = localStorage.getItem('metricsoft_auth_token')
        const userData = localStorage.getItem('metricsoft_user')
        
        if (token && userData) {
          const user = JSON.parse(userData)
          setUser(user)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        localStorage.removeItem('metricsoft_auth_token')
        localStorage.removeItem('metricsoft_user')
      } finally {
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
        return { error: result.error || 'Failed to send code' }
      }
      
      return {}
    } catch (error: any) {
      console.error('Send passwordless code error:', error)
      return { error: error.response?.data?.error || 'An unexpected error occurred' }
    }
  }

  const verifyPasswordlessCode = async (request: PasswordlessVerification) => {
    setLoading(true)
    try {
      const result = await authApi.verifyPasswordlessCode(request)
      
      if (!result.success || !result.data) {
        return { error: result.error || 'Verification failed' }
      }

      const { user, token } = result.data
      
      // Store auth data
      localStorage.setItem('metricsoft_auth_token', token)
      localStorage.setItem('metricsoft_user', JSON.stringify(user))
      setUser(user)
      
      return {}
    } catch (error: any) {
      console.error('Verify passwordless code error:', error)
      return { error: error.response?.data?.error || 'An unexpected error occurred' }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      localStorage.removeItem('metricsoft_auth_token')
      localStorage.removeItem('metricsoft_user')
      setUser(null)
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
