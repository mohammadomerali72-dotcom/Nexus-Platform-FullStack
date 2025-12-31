import api from "./api"
import type { Deal, DealStatus } from "../types"

export interface DealsQuery {
  search?: string
  status?: DealStatus[]
}

export const dealService = {
  async list(params: DealsQuery = {}): Promise<Deal[]> {
    try {
      const queryParams = new URLSearchParams()
      if (params.search) queryParams.append('search', params.search)
      if (params.status && params.status.length > 0) {
        queryParams.append('status', params.status.join(','))
      }

      const response = await api.get(`/deals?${queryParams.toString()}`)
      return response.data.deals || []
    } catch (error: any) {
      console.error('Error fetching deals:', error)
      throw new Error(error.response?.data?.message || 'Failed to fetch deals')
    }
  },

  async create(payload: {
    startup: { name: string; logo?: string; industry?: string }
    amount: string
    equity: string
    status?: DealStatus
    stage?: string
    lastActivity?: string
  }): Promise<Deal> {
    try {
      // Prepare the data exactly as backend expects
      const dealData = {
        startup: {
          name: payload.startup.name,
          ...(payload.startup.logo && { logo: payload.startup.logo }),
          ...(payload.startup.industry && { industry: payload.startup.industry })
        },
        amount: payload.amount,
        equity: payload.equity,
        status: payload.status || 'Due Diligence',
        ...(payload.stage && { stage: payload.stage }),
        ...(payload.lastActivity && { lastActivity: payload.lastActivity })
      }

      const response = await api.post('/deals', dealData)
      return response.data.deal
    } catch (error: any) {
      console.error('Error creating deal:', error)
      
      // More detailed error message
      let errorMessage = 'Failed to create deal'
      if (error.response) {
        if (error.response.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data?.errors) {
          errorMessage = error.response.data.errors[0]?.msg || 'Validation failed'
        }
      } else if (error.request) {
        errorMessage = 'Network error: Could not connect to server'
      }
      
      throw new Error(errorMessage)
    }
  }
}
