import axios from 'axios'

const normalizeApiBaseUrl = (rawUrl) => {
  if (!rawUrl) return rawUrl

  const url = String(rawUrl).trim()

  if (url.startsWith('ttps://')) {
    console.warn(
      '[api] VITE_API_BASE_URL looks malformed (missing leading "h"). Auto-fixing.'
    )
    return `h${url}`
  }

  if (/^https?:\/\//i.test(url)) return url

  // Allow relative API base for dev/proxy setups.
  if (url.startsWith('/')) return url

  // Protocol-relative URL.
  if (url.startsWith('//')) return `${window.location.protocol}${url}`

  // If user supplied a host without protocol, assume http for localhost and https otherwise.
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)
  return `${isLocalhost ? 'http' : 'https'}://${url}`
}

const API_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    '/api/v1'
)

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: never retry on 401; clear auth and let the app handle logged-out state.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.dispatchEvent(new Event('auth:logout'))
    }

    return Promise.reject(error)
  }
)

export default api
