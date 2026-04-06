import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { setToken, clearToken } from '@/lib/tokenStorage'
import apiClient from '@/lib/apiClient'
import { Loader2 } from 'lucide-react'

const AuthCallbackPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Read URL params synchronously
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')

        if (!token) {
          setError('No token received from OAuth callback')
          setIsLoading(false)
          return
        }

        // Strip token from browser history immediately
        window.history.replaceState({}, document.title, window.location.pathname)

        // Store token
        setToken(token)

        // Validate token with backend
        await apiClient.get('/auth/verify')

        // On success, navigate to dashboard
        navigate('/', { replace: true })
      } catch (err) {
        clearToken()
        setError('Authentication failed. Please try again.')
        setIsLoading(false)
      }
    }

    handleCallback()
  }, [navigate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-6 w-6 text-zinc-500 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">Signing you in...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default AuthCallbackPage
