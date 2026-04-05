import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken, setToken, clearToken, isTokenExpired } from '@/lib/tokenStorage'
import apiClient from '@/lib/apiClient'
import type { User } from '@/types/api'

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  status: AuthStatus
  user: User | null
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<User | null>(null)
  const navigate = useNavigate()

  // Bootstrap verification - runs once on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const token = getToken()

      // Check if token exists and is not expired
      if (!token || isTokenExpired(token)) {
        clearToken()
        setStatus('unauthenticated')
        return
      }

      try {
        const response = await apiClient.get('/auth/verify')
        setUser(response.data.user)
        setStatus('authenticated')
      } catch (error) {
        clearToken()
        setStatus('unauthenticated')
      }
    }

    verifyAuth()
  }, [])

  // Listen for auth:logout events (from 401 interceptor)
  useEffect(() => {
    const handleLogout = () => {
      setUser(null)
      setStatus('unauthenticated')
      navigate('/login', { replace: true })
    }

    window.addEventListener('auth:logout', handleLogout)

    return () => {
      window.removeEventListener('auth:logout', handleLogout)
    }
  }, [navigate])

  const logout = () => {
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
    navigate('/login', { replace: true })
  }

  return (
    <AuthContext.Provider value={{ status, user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
