const Notification = require("../models/Notification")

class NotificationService {
  // Create a new message notification
  static async createMessageNotification(senderId, recipientId, messageId, messageContent) {
    try {
      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "message",
        title: "New Message",
        content: `sent you a message: "${messageContent.substring(0, 50)}${messageContent.length > 50 ? "..." : ""}"`,
        relatedId: messageId,
        relatedModel: "Message",
        metadata: {
          messagePreview: messageContent.substring(0, 100),
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating message notification:", error)
      throw error
    }
  }

  // Create a collaboration request notification
  static async createCollaborationRequestNotification(senderId, recipientId, requestId, requestType) {
    try {
      const typeMessages = {
        investment: "sent you an investment request",
        mentorship: "sent you a mentorship request",
        partnership: "sent you a partnership request",
        advisory: "sent you an advisory request",
      }

      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "collaboration_request",
        title: "New Collaboration Request",
        content: typeMessages[requestType] || "sent you a collaboration request",
        relatedId: requestId,
        relatedModel: "CollaborationRequest",
        metadata: {
          requestType,
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating collaboration request notification:", error)
      throw error
    }
  }

  // Create a meeting notification
  static async createMeetingNotification(senderId, recipientId, requestId, meetingDetails) {
    try {
      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "meeting",
        title: "Meeting Scheduled",
        content: `scheduled a meeting with you for ${new Date(meetingDetails.scheduledFor).toLocaleDateString()}`,
        relatedId: requestId,
        relatedModel: "CollaborationRequest",
        metadata: {
          meetingDate: meetingDetails.scheduledFor,
          duration: meetingDetails.duration,
          location: meetingDetails.location,
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating meeting notification:", error)
      throw error
    }
  }

  // Create a call notification
  static async createCallNotification(senderId, recipientId, callType = "voice") {
    try {
      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "call",
        title: callType === "video" ? "Video Call" : "Voice Call",
        content: `is calling you`,
        metadata: {
          callType,
          timestamp: new Date(),
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating call notification:", error)
      throw error
    }
  }

  // Create a connection notification
  static async createConnectionNotification(senderId, recipientId, action = "request") {
    try {
      const actionMessages = {
        request: "sent you a connection request",
        accepted: "accepted your connection request",
        rejected: "declined your connection request",
      }

      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "connection",
        title: "Connection Update",
        content: actionMessages[action] || "updated your connection",
        metadata: {
          action,
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating connection notification:", error)
      throw error
    }
  }

  // Create an investment notification
  static async createInvestmentNotification(senderId, recipientId, action, amount = null) {
    try {
      const actionMessages = {
        interest: "showed interest in investing in your startup",
        offer: amount ? `made an investment offer of ${amount}` : "made an investment offer",
        accepted: "accepted your investment terms",
        rejected: "declined your investment offer",
      }

      const notification = await Notification.createNotification({
        recipientId,
        senderId,
        type: "investment",
        title: "Investment Update",
        content: actionMessages[action] || "updated your investment status",
        metadata: {
          action,
          amount,
        },
      })
      return notification
    } catch (error) {
      console.error("Error creating investment notification:", error)
      throw error
    }
  }

  // Get notifications for a user
  static async getNotificationsForUser(userId, options = {}) {
    try {
      return await Notification.getNotificationsForUser(userId, options)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      throw error
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipientId: userId,
      })

      if (!notification) {
        throw new Error("Notification not found")
      }

      return await notification.markAsRead()
    } catch (error) {
      console.error("Error marking notification as read:", error)
      throw error
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      return await Notification.markAllAsRead(userId)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
      throw error
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId) {
    try {
      return await Notification.getUnreadCount(userId)
    } catch (error) {
      console.error("Error getting unread count:", error)
      throw error
    }
  }
}

module.exports = NotificationService
