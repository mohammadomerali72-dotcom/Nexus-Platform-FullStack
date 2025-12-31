import apiService from "./api"
import { API_ENDPOINTS } from "./api-config"

export interface CreateCollaborationRequestData {
  entrepreneurId: string
  investorId: string
  requestType: "investment" | "mentorship" | "partnership" | "advisory"
  message: string
  proposedAmount?: string
  proposedTerms?: string
}

export interface CollaborationFilters {
  status?: "pending" | "accepted" | "rejected" | "withdrawn" | "expired"
  type?: "sent" | "received"
  investorId?: string
  entrepreneurId?: string
  page?: number
  limit?: number
}

export interface ScheduleMeetingData {
  scheduledFor: string
  duration: number
  location?: string
  meetingLink?: string
  agenda?: string
}

export interface MeetingResponse {
  response: "accepted" | "rejected" | "tentative"
}

class CollaborationService {
  
  // In collaborationService.ts, update the createRequest method
async createRequest(data: CreateCollaborationRequestData): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await apiService.post(API_ENDPOINTS.COLLABORATIONS.REQUEST, data)
    return { success: true, data: response.data }
  } catch (error: any) {
    console.error("Failed to create collaboration request:", error)
    
    // Handle specific error cases
    if (error.response?.status === 400) {
      return { 
        success: false, 
        error: error.response.data.message || "Bad request" 
      }
    }
    
    return { 
      success: false, 
      error: error.response?.data?.message || "Failed to create collaboration request" 
    }
  }
}



async getCollaborationRequests(filters: CollaborationFilters = {}): Promise<{ 
  success: boolean; 
  data?: any; 
  error?: string;
  requests?: any[];
  pagination?: any;
}> {
  try {
    const response = await apiService.get(API_ENDPOINTS.COLLABORATIONS.REQUESTS, {
      params: filters,
    });
    
    // Handle different response formats
    if (response.data && Array.isArray(response.data)) {
      return { 
        success: true, 
        data: response.data,
        requests: response.data 
      };
    } else if (response.data && response.data.requests) {
      return { 
        success: true, 
        data: response.data.requests,
        requests: response.data.requests,
        pagination: response.data.pagination
      };
    } else if (response.data && response.data.data) {
      return { 
        success: true, 
        data: response.data.data,
        requests: response.data.data 
      };
    } else {
      return { 
        success: false, 
        data: [], 
        requests: [],
        error: "Invalid response format" 
      };
    }
  } catch (error: any) {
    console.error("Failed to get collaboration requests:", error);
    return { 
      success: false, 
      data: [], 
      requests: [],
      error: error.response?.data?.message || "Failed to fetch collaboration requests" 
    };
  }
}

  // Update collaboration request
  async updateCollaborationRequest(requestId: string, updates: Partial<{ status: string }>) {
    try {
      const response = await apiService.put(`/collaborations/${requestId}`, updates)
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to update collaboration request:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to update collaboration request" 
      }
    }
  }

  // Accept collaboration request
  async acceptRequest(requestId: string, responseMessage?: string) {
    try {
      const response = await apiService.put(API_ENDPOINTS.COLLABORATIONS.ACCEPT(requestId), {
        responseMessage,
      })
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to accept request:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to accept request" 
      }
    }
  }

  // Reject collaboration request
  async rejectRequest(requestId: string, responseMessage?: string) {
    try {
      const response = await apiService.put(API_ENDPOINTS.COLLABORATIONS.REJECT(requestId), {
        responseMessage,
      })
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to reject request:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to reject request" 
      }
    }
  }

  // Get requests sent by a specific investor
  async getRequestsFromInvestor(investorId: string) {
    const res = await this.getCollaborationRequests({ type: "sent", investorId })
    return res.data || []
  }
  
  // Schedule a meeting for a collaboration request
  async scheduleMeeting(
    requestId: string, 
    meetingData: ScheduleMeetingData
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.post(
        `/collaborations/requests/${requestId}/schedule-meeting`,
        meetingData
      )
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to schedule meeting:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to schedule meeting" 
      }
    }
  }

  // Respond to a meeting invitation
  async respondToMeeting(
    requestId: string, 
    response: MeetingResponse
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiResponse = await apiService.put(
        `/collaborations/requests/${requestId}/respond-meeting`,
        response
      )
      return { success: true, data: apiResponse.data }
    } catch (error: any) {
      console.error("Failed to respond to meeting:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to respond to meeting" 
      }
    }
  }

  // Get meeting details
  async getMeetingDetails(
    requestId: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.get(
        `/collaborations/requests/${requestId}/meeting`
      )
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to get meeting details:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to get meeting details" 
      }
    }
  }

  // Check for meeting conflicts
  async checkMeetingConflict(
    scheduledFor: string,
    duration: number,
    excludeRequestId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.post(
        `/collaborations/check-conflict`,
        { scheduledFor, duration, excludeRequestId }
      )
      return { success: true, data: response.data }
    } catch (error: any) {
      console.error("Failed to check meeting conflict:", error)
      return { 
        success: false, 
        error: error.response?.data?.message || "Failed to check meeting conflict" 
      }
    }
  }
}


const collaborationService = new CollaborationService()
export { collaborationService }
export default collaborationService


