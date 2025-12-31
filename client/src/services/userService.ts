import apiService from "./api"

export interface BaseUser {
  id: string
  name: string
  email?: string
  role: "entrepreneur" | "investor"
  avatarUrl?: string
  startupName?: string
  bio?: string
  location?: string
  industry?: string
  website?: string
  linkedin?: string
  twitter?: string
  isOnline?: boolean
  lastSeen?: Date
  createdAt?: Date
  updatedAt?: Date
  // Investor specific fields
  investmentStage?: string[]
  investmentInterests?: string[]
  minimumInvestment?: string
  maximumInvestment?: string
  totalInvestments?: number
  // Entrepreneur specific fields
  pitchSummary?: string
  fundingNeeded?: string
  teamSize?: number
  foundedYear?: number
}

function normalizeUser(u: any): BaseUser {
  return {
    id: u._id || u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarUrl: u.avatarUrl,
    startupName: u.startupName,
    bio: u.bio,
    location: u.location,
    industry: u.industry,
    website: u.website,
    linkedin: u.linkedin,
    twitter: u.twitter,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen ? new Date(u.lastSeen) : undefined,
    createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
    updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined,
    // Investor specific fields
    investmentStage: u.investmentStage || [],
    investmentInterests: u.investmentInterests || [],
    minimumInvestment: u.minimumInvestment,
    maximumInvestment: u.maximumInvestment,
    totalInvestments: u.totalInvestments || 0,
    // Entrepreneur specific fields
    pitchSummary: u.pitchSummary,
    fundingNeeded: u.fundingNeeded,
    teamSize: u.teamSize,
    foundedYear: u.foundedYear,
  }
}

export const userService = {
  async getUserById(id: string): Promise<{ success: boolean; data: BaseUser | null; error?: string }> {
    try {
      const res = await apiService.get(`/users/${id}`)

      // Handle different response formats
      let userData = null
      if (res.data.user) {
        userData = normalizeUser(res.data.user)
      } else if (res.data.data) {
        userData = normalizeUser(res.data.data)
      } else {
        userData = normalizeUser(res.data)
      }

      return {
        success: true,
        data: userData,
      }
    } catch (error: any) {
      console.error("Failed to get user by ID:", error)
      return {
        success: false,
        data: null,
        error: error.response?.data?.message || "Failed to fetch user",
      }
    }
  },

  async getUsers(params?: {
    role?: "entrepreneur" | "investor"
    limit?: number
    page?: number
    search?: string
    location?: string
    industry?: string
  }): Promise<{ success: boolean; data: BaseUser[]; error?: string }> {
    try {
      const queryParams = new URLSearchParams()
      if (params?.role) queryParams.append("role", params.role)
      if (params?.limit) queryParams.append("limit", params.limit.toString())
      if (params?.page) queryParams.append("page", params.page.toString())
      if (params?.search) queryParams.append("search", params.search)
      if (params?.location) queryParams.append("location", params.location)
      if (params?.industry) queryParams.append("industry", params.industry)

      const res = await apiService.get(`/users?${queryParams.toString()}`)

      // Handle different response formats
      let usersData = []
      if (res.data && Array.isArray(res.data)) {
        usersData = res.data.map(normalizeUser)
      } else if (res.data && Array.isArray(res.data.users)) {
        usersData = res.data.users.map(normalizeUser)
      } else if (res.data && Array.isArray(res.data.data)) {
        usersData = res.data.data.map(normalizeUser)
      }

      return {
        success: true,
        data: usersData,
      }
    } catch (error: any) {
      console.error("Failed to get users:", error)
      return {
        success: false,
        data: [],
        error: error.response?.data?.message || "Failed to fetch users",
      }
    }
  },

  async getUsersByRole(role: "entrepreneur" | "investor", limit?: number): Promise<BaseUser[]> {
    try {
      const response = await this.getUsers({ role, limit })
      return response.success ? response.data : []
    } catch (error) {
      console.error("Failed to get users by role:", error)
      return []
    }
  },

  async getAllUsers(): Promise<BaseUser[]> {
    try {
      const response = await this.getUsers()
      return response.success ? response.data : []
    } catch (error) {
      console.error("Failed to get all users:", error)
      return []
    }
  },

  async updateUser(
    id: string,
    userData: Partial<BaseUser>,
  ): Promise<{ success: boolean; data?: BaseUser; error?: string }> {
    try {
      const res = await apiService.put(`/users/${id}`, userData)

      let updatedUser = null
      if (res.data.user) {
        updatedUser = normalizeUser(res.data.user)
      } else if (res.data.data) {
        updatedUser = normalizeUser(res.data.data)
      } else {
        updatedUser = normalizeUser(res.data)
      }

      return {
        success: true,
        data: updatedUser,
      }
    } catch (error: any) {
      console.error("Failed to update user:", error)
      return {
        success: false,
        error: error.response?.data?.message || "Failed to update user",
      }
    }
  },

  async uploadAvatar(
    id: string,
    file: File,
  ): Promise<{ success: boolean; data?: { avatarUrl: string }; error?: string }> {
    try {
      const formData = new FormData()
      formData.append("avatar", file)

      const res = await apiService.post(`/users/${id}/avatar`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      })

      return {
        success: true,
        data: { avatarUrl: res.data.avatarUrl },
      }
    } catch (error: any) {
      console.error("Failed to upload avatar:", error)
      return {
        success: false,
        error: error.response?.data?.message || "Failed to upload avatar",
      }
    }
  },
}

export default userService



