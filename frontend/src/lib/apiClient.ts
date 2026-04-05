import axios from 'axios'
import { getToken, clearToken } from './tokenStorage'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken()
      // Dispatch event for AuthContext to handle redirect
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  }
)

export default apiClient
