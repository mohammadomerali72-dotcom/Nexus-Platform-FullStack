"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"
import type { User, UserRole, AuthContextType } from "../types"
import { authService } from "../services/authService"
import userService from "../services/userService"
import toast from "react-hot-toast"

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Local storage keys
const USER_STORAGE_KEY = "business_nexus_user"
const TOKEN_STORAGE_KEY = "business_nexus_token"
const REFRESH_TOKEN_STORAGE_KEY = "business_nexus_refresh_token"

// Helper function to normalize user data from backend
const normalizeUserData = (userData: any): User => {
  // Handle Mongoose _id field by converting it to id
  if (userData && userData._id && !userData.id) {
    return {
      ...userData,
      id: userData._id.toString(),
    }
  }
  return userData
}

// Auth Provider Component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for stored user on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY)
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)

        if (storedUser && storedToken) {
          try {
            const parsedUser = JSON.parse(storedUser)
            setUser(parsedUser)

            if (parsedUser?.id) {
              try {
                const currentUser = (await Promise.race([
                  authService.getCurrentUser(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), 5000)),
                ])) as User

                const normalizedUser = normalizeUserData(currentUser)
                setUser(normalizedUser)
                localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
              } catch (error) {
                console.warn("[v0] Failed to fetch current user, using stored user data:", error)
                // Keep the stored user data if API call fails
              }
            }
          } catch (parseError) {
            console.error("[v0] Failed to parse stored user data:", parseError)
            // Only clear storage if parsing fails
            localStorage.removeItem(USER_STORAGE_KEY)
            localStorage.removeItem(TOKEN_STORAGE_KEY)
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
          }
        }
      } catch (error) {
        console.error("[v0] Auth initialization error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true)

    try {
      const response = await authService.login(email, password, role)

      // Normalize user data to handle _id from backend
      const normalizedUser = normalizeUserData(response.user)

      if (!normalizedUser?.id) {
        throw new Error("Invalid user data received from server")
      }

      // Store user data and tokens
      setUser(normalizedUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken)

      toast.success("Successfully logged in!")
    } catch (error: any) {
      console.error("[v0] Login error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Login failed"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, role: UserRole): Promise<void> => {
    setIsLoading(true)

    try {
      const response = await authService.register({ name, email, password, confirmPassword: password, role })

      // Normalize user data to handle _id from backend
      const normalizedUser = normalizeUserData(response.user)

      if (!normalizedUser?.id) {
        throw new Error("Invalid user data received from server")
      }

      // Store user data and tokens
      setUser(normalizedUser)
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
      localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken)

      toast.success("Account created successfully!")
    } catch (error: any) {
      console.error("[v0] Registration error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Registration failed"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      await authService.forgotPassword(email)
      toast.success("Password reset instructions sent to your email")
    } catch (error: any) {
      console.error("[v0] Forgot password error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Failed to send reset email"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const resetPassword = async (token: string, newPassword: string): Promise<void> => {
    try {
      await authService.resetPassword(token, newPassword)
      toast.success("Password reset successfully")
    } catch (error: any) {
      console.error("[v0] Reset password error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Password reset failed"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const logout = (): void => {
    setUser(null)
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    toast.success("Logged out successfully")
  }

  const updateProfile = async (userId: string, updates: Partial<User>): Promise<void> => {
    if (!userId || userId === "undefined") {
      throw new Error("Invalid user ID provided")
    }

    try {
      const updatedUser = await authService.updateProfile(userId, updates)
      const normalizedUser = normalizeUserData(updatedUser)

      // Update current user if it's the same user
      if (user?.id === userId) {
        setUser(normalizedUser)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
      }

      toast.success("Profile updated successfully")
    } catch (error: any) {
      console.error("[v0] Update profile error:", error)
      const errorMessage = error.response?.data?.message || error.message || "Profile update failed"
      toast.error(errorMessage)
      throw new Error(errorMessage)
    }
  }

  const getUserId = (): string | null => {
    return user?.id || null
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await authService.changePassword(currentPassword, newPassword)
      toast.success("Password changed successfully")
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Password change failed"
      toast.error(msg)
      throw new Error(msg)
    }
  }


  const uploadAvatar = async (file: File): Promise<void> => {
    if (!user?.id) throw new Error("No user")
    try {
      const res = await userService.uploadAvatar(user.id, file)
      if (res.success && res.data?.avatarUrl) {
        const updated = { ...user, avatarUrl: res.data.avatarUrl }
        setUser(updated)
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated))
        toast.success("Profile photo updated")
      } else {
        throw new Error(res.error || "Avatar upload failed")
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || "Failed to upload avatar"
      toast.error(msg)
      throw new Error(msg)
    }
  }

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
    getUserId,
    changePassword,
    uploadAvatar,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook for using auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}


