import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status } = useAuth()

  if (status === 'loading') {
    return null
  }

  if (status === 'unauthenticated') {
    const targetPath = window.location.pathname + window.location.search
    if (targetPath && !targetPath.startsWith('/login')) {
      sessionStorage.setItem('redirectPath', targetPath)
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
