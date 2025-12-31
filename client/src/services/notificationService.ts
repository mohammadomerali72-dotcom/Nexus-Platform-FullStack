import apiService from "./api"
import { API_ENDPOINTS } from "./api-config"

export interface Notification {
  _id: string
  recipientId: string
  senderId: {
    _id: string
    name: string
    avatarUrl: string
    role: string
  }
  type: "message" | "collaboration_request" | "meeting" | "call" | "connection" | "investment"
  title: string
  content: string
  status: "new" | "read"
  readAt?: string
  relatedId?: string
  relatedModel?: string
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface NotificationResponse {
  success: boolean
  data: {
    notifications: Notification[]
    pagination: {
      currentPage: number
      totalPages: number
      totalCount: number
      hasNext: boolean
      hasPrev: boolean
    }
    unreadCount: number
  }
  message?: string
}

export interface UnreadCountResponse {
  success: boolean
  data: {
    unreadCount: number
  }
}

class NotificationService {
  // Get notifications for current user
  static async getNotifications(
    options: {
      page?: number
      limit?: number
      status?: "new" | "read"
    } = {},
  ): Promise<NotificationResponse> {
    try {
      const { page = 1, limit = 20, status } = options
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (status) {
        params.append("status", status)
      }

      const response = await apiService.get(`${API_ENDPOINTS.NOTIFICATIONS.LIST}?${params}`)

      // ✅ Fix: unwrap properly
      return {
        success: response.data.success,
        data: response.data.data, // <-- use nested "data" field
      }
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error)
      return {
        success: false,
        data: {
          notifications: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          },
          unreadCount: 0,
        },
        message: error.response?.data?.message || "Failed to fetch notifications",
      }
    }
  }

  // Get unread notifications count - FIXED
  static async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await apiService.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT)
      
      // ✅ FIX: Properly extract the unreadCount from nested data structure
      return {
        success: response.data.success,
        data: {
          unreadCount: response.data.data?.unreadCount || 0
        },
      }
    } catch (error: any) {
      console.error("Failed to fetch unread count:", error)
      return {
        success: false,
        data: { unreadCount: 0 },
      }
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiService.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId))
      return { success: true }
    } catch (error: any) {
      console.error("Failed to mark notification as read:", error)
      return {
        success: false,
        message: error.response?.data?.message || "Failed to mark notification as read",
      }
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<{ success: boolean; message?: string }> {
    try {
      await apiService.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ)
      return { success: true }
    } catch (error: any) {
      console.error("Failed to mark all notifications as read:", error)
      return {
        success: false,
        message: error.response?.data?.message || "Failed to mark all notifications as read",
      }
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await apiService.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(notificationId))
      return { success: true }
    } catch (error: any) {
      console.error("Failed to delete notification:", error)
      return {
        success: false,
        message: error.response?.data?.message || "Failed to delete notification",
      }
    }
  }
}

export default NotificationService

