import axios from "axios"

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

const cleanToken = (token: string): string | null => {
  if (!token) return null

  // Remove quotes, whitespace, and other potential corrupting characters
  const cleaned = token.trim().replace(/^["']|["']$/g, "")

  // Basic JWT format validation (should have 3 parts separated by dots)
  const parts = cleaned.split(".")
  if (parts.length !== 3) {
    console.warn("[v0] Invalid JWT format detected, removing corrupted token")
    localStorage.removeItem("business_nexus_token")
    return null
  }

  return cleaned
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    try {
      const rawToken = localStorage.getItem("business_nexus_token")
      if (rawToken) {
        const token = cleanToken(rawToken)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
    } catch (error) {
      console.error("[v0] Error setting auth token:", error)
    }
    return config
  },
  (error) => {
    console.error("[v0] Request interceptor error:", error)
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      // Network error or server not responding
      console.error("[v0] Network error or server unavailable:", error.message)
      return Promise.reject(new Error("Network error: Please check your connection and try again"))
    }

    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem("business_nexus_refresh_token")
      if (refreshToken) {
        try {
          const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
            refreshToken,
          })

          const { token } = response.data
          localStorage.setItem("business_nexus_token", token)

          return api(originalRequest)
        } catch (refreshError) {
          console.error("[v0] Token refresh failed:", refreshError)
          // Refresh failed, clear storage but don't redirect immediately
          localStorage.removeItem("business_nexus_token")
          localStorage.removeItem("business_nexus_refresh_token")
          localStorage.removeItem("business_nexus_user")

          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login"
          }
        }
      }
    }

    return Promise.reject(error)
  },
)

export default api


