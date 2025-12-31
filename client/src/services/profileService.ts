import apiService from "./api"
import { API_ENDPOINTS } from "./api-config"

export interface EntrepreneurProfileData {
  startupName: string
  industry: string
  foundedYear: number
  teamSize: number
  fundingNeeded: string
  fundingStage: string
  pitchSummary: string
  businessModel: string
  revenueModel?: string
  targetMarket?: string
  competitiveAdvantage?: string
  currentRevenue?: string
  monthlyGrowthRate?: number
  customerCount?: number
  keyMetrics?: Array<{
    name: string
    value: string
    description?: string
  }>
  teamMembers?: Array<{
    name: string
    role: string
    bio?: string
    linkedin?: string
  }>
}

export interface InvestorProfileData {
  investorType: string
  investmentInterests: string[]
  investmentStage: string[]
  minimumInvestment: string
  maximumInvestment: string
  totalInvestments: number
  portfolioCompanies?: Array<{
    name: string
    industry?: string
    investmentAmount?: string
    investmentDate?: string
    currentStatus?: string
    description?: string
    website?: string
    isPublic?: boolean
  }>
  investmentCriteria?: {
    geographicFocus?: string[]
    businessModels?: string[]
    revenueRequirement?: string
    teamSizePreference?: {
      min?: number
      max?: number
    }
    fundingStagePreference?: string[]
    otherCriteria?: string
  }
  expertise?: Array<{
    area: string
    level: string
    description?: string
  }>
  mentorshipOffered?: boolean
  mentorshipAreas?: string[]
  availabilityStatus?: string
  responseTime?: string
}

class ProfileService {
  // Entrepreneur Profile Methods
  async createEntrepreneurProfile(data: EntrepreneurProfileData) {
    return apiService.post(API_ENDPOINTS.PROFILES.ENTREPRENEUR(), data)
  }

  async getEntrepreneurProfile(userId: string) {
    try {
      // First try the specific profile endpoint
      return await apiService.get(API_ENDPOINTS.PROFILES.ENTREPRENEUR(userId))
    } catch (error) {
      console.warn("Profile endpoint failed, trying user endpoint:", error)
      // Fallback to user endpoint if profile endpoint fails
      return apiService.get(API_ENDPOINTS.USERS.BY_ID(userId))
    }
  }

  async updateEntrepreneurProfile(userId: string, data: Partial<EntrepreneurProfileData>) {
    try {
      return await apiService.put(API_ENDPOINTS.PROFILES.ENTREPRENEUR(userId), data)
    } catch (error) {
      console.warn("Profile endpoint failed, trying user endpoint:", error)
      return apiService.put(API_ENDPOINTS.USERS.BY_ID(userId), data)
    }
  }

  async uploadEntrepreneurDocument(
    userId: string,
    file: File,
    documentData: {
      name?: string
      type?: string
      isPublic?: boolean
    },
  ) {
    const formData = new FormData()
    formData.append("document", file)

    Object.entries(documentData).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value.toString())
      }
    })

    return apiService.post(API_ENDPOINTS.PROFILES.ENTREPRENEUR_DOCUMENTS(userId), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  }

  // Investor Profile Methods
  async createInvestorProfile(data: InvestorProfileData) {
    return apiService.post(API_ENDPOINTS.PROFILES.INVESTOR(), data)
  }

  async getInvestorProfile(userId: string) {
    try {
      return await apiService.get(API_ENDPOINTS.PROFILES.INVESTOR(userId))
    } catch (error) {
      console.warn("Profile endpoint failed, trying user endpoint:", error)
      return apiService.get(API_ENDPOINTS.USERS.BY_ID(userId))
    }
  }

  async updateInvestorProfile(userId: string, data: Partial<InvestorProfileData>) {
    try {
      return await apiService.put(API_ENDPOINTS.PROFILES.INVESTOR(userId), data)
    } catch (error) {
      console.warn("Profile endpoint failed, trying user endpoint:", error)
      return apiService.put(API_ENDPOINTS.USERS.BY_ID(userId), data)
    }
  }

  async addPortfolioCompany(
    userId: string,
    companyData: {
      name: string
      industry?: string
      investmentAmount?: string
      investmentDate?: string
      currentStatus?: string
      description?: string
      website?: string
      isPublic?: boolean
    },
  ) {
    return apiService.post(API_ENDPOINTS.PROFILES.INVESTOR_PORTFOLIO(userId), companyData)
  }

  // General Profile Methods
  async getProfileStats() {
    return apiService.get(API_ENDPOINTS.PROFILES.STATS)
  }

  async uploadAvatar(userId: string, file: File) {
    const formData = new FormData()
    formData.append("avatar", file)

    return apiService.post(API_ENDPOINTS.USERS.AVATAR(userId), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  }
}

export default new ProfileService()
