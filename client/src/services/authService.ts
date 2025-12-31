import api from "./api"
import type { User, UserRole } from "../types"

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  confirmPassword: string // Added confirmPassword field
  role: UserRole
}

export const authService = {
  // Login user
  login: async (email: string, password: string, role: UserRole): Promise<LoginResponse> => {
    const response = await api.post("/auth/login", { email, password, role })
    return response.data
  },

  // Register user
  register: async (data: RegisterData): Promise<LoginResponse> => {
    const response = await api.post("/auth/register", data)
    return response.data
  },

  // Forgot password
  forgotPassword: async (email: string): Promise<void> => {
    await api.post("/auth/forgot-password", { email })
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post("/auth/reset-password", { token, newPassword })
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await api.post("/auth/refresh", { refreshToken })
    return response.data
  },

  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get("/auth/me")
    return response.data.user
  },

  // Update user profile
  updateProfile: async (userId: string, updates: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, updates)
    return response.data.user
  },

changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
  // Example implementation, adjust endpoint and payload as needed
  await api.post("/auth/change-password", { currentPassword, newPassword })
}
}

