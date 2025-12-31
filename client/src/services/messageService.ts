import apiService from "./api"
import { API_ENDPOINTS } from "./api-config"

export interface SendMessageData {
  receiverId: string
  content: string
  messageType?: "text" | "image" | "document"
  replyTo?: string
}

export interface MessageFilters {
  page?: number
  limit?: number
}

export interface BackendMessage {
  _id: string
  senderId: string | { _id: string; name: string; avatarUrl: string;   email?: string
        role?: string }
  receiverId: string | { _id: string; name: string; avatarUrl: string;  email?: string
        role?: string }
  content: string
  messageType: string
  isRead: boolean
  readAt?: string
  isEdited: boolean
  editedAt?: string
  replyTo?: any
  conversationId: string
  createdAt: string
  updatedAt: string
  attachments?: any[]
  isEncrypted?: boolean
}

export interface BackendConversation {
  _id: string
  lastMessage: BackendMessage
  unreadCount: number
  otherUser: any
}

class MessageService {
  // Get user's conversations
  async getConversations(): Promise<any[]> {
    try {
      const res = await apiService.get(API_ENDPOINTS.MESSAGES.CONVERSATIONS)
      return res.data.conversations || []
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
      return []
    }
  }

  // Get messages with a specific user
  async getMessages(userId: string, filters: MessageFilters = {}) {
    try {
      // Fix the query parameter formatting
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const queryString = params.toString();
      const url = `${API_ENDPOINTS.MESSAGES.BY_USER(userId)}${queryString ? `?${queryString}` : ''}`;
      
      const res = await apiService.get(url)
      return {
        messages: res.data.messages || [],
        pagination: res.data.pagination || {}
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
      return { messages: [], pagination: {} }
    }
  }

  // Send a message
  async sendMessage(data: SendMessageData) {
    try {
      const res = await apiService.post(API_ENDPOINTS.MESSAGES.SEND, data)
      return res.data.data
    } catch (error) {
      console.error("Failed to send message:", error)
      throw error
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId: string) {
    try {
      return await apiService.put(API_ENDPOINTS.MESSAGES.MARK_READ(messageId))
    } catch (error) {
      console.error("Failed to mark message as read:", error)
      throw error
    }
  }
}

export default new MessageService()



