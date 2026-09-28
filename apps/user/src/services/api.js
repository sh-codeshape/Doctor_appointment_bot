import axios from 'axios'
import toast from 'react-hot-toast'

/**
 * Axios instance — single point of configuration.
 * 
 * All service modules import this instead of raw axios.
 * When the backend is ready:
 *   1. Set VITE_API_BASE_URL in .env
 *   2. Set VITE_USE_MOCK=false
 *   3. That's it — all services will hit real endpoints
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: Attach JWT ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('docbot_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: Handle errors globally ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong'
    const status = error.response?.status

    if (status === 401) {
      // Token expired or invalid — redirect to login
      localStorage.removeItem('docbot_token')
      localStorage.removeItem('docbot_user')
      window.location.href = '/login'
      toast.error('Session expired. Please log in again.')
    } else if (status === 403) {
      toast.error('You do not have permission to do this.')
    } else if (status >= 500) {
      toast.error('Server error. Please try again later.')
    }

    return Promise.reject(error)
  }
)

/**
 * Helper: Check if we're in mock mode.
 * Services use this to return mock data instead of hitting the API.
 */
export const isMockMode = () => import.meta.env.VITE_USE_MOCK === 'true'

export default api
