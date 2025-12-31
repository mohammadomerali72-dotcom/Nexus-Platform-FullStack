const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient ID is required"],
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    type: {
      type: String,
      enum: ["message", "collaboration_request", "meeting", "call", "connection", "investment"],
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    content: {
      type: String,
      required: [true, "Notification content is required"],
      trim: true,
      maxlength: [500, "Content cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["new", "read"],
      default: "new",
    },
    readAt: {
      type: Date,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      // This can reference different models based on type
      // For messages: Message ID
      // For collaboration requests: CollaborationRequest ID
      // For meetings: Meeting ID
    },
    relatedModel: {
      type: String,
      enum: ["Message", "CollaborationRequest", "Meeting"],
    },
    metadata: {
      // Additional data specific to notification type
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 })
notificationSchema.index({ recipientId: 1, createdAt: -1 })
notificationSchema.index({ status: 1 })
notificationSchema.index({ type: 1 })

// Method to mark notification as read
notificationSchema.methods.markAsRead = function () {
  this.status = "read"
  this.readAt = new Date()
  return this.save()
}

// Static method to create notification
notificationSchema.statics.createNotification = async function (data) {
  const notification = new this(data)
  return await notification.save()
}

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({ recipientId: userId, status: "new" })
}

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { recipientId: userId, status: "new" },
    {
      status: "read",
      readAt: new Date(),
    },
  )
}

// Static method to get notifications for user with pagination
notificationSchema.statics.getNotificationsForUser = function (userId, options = {}) {
  const { page = 1, limit = 20, status } = options
  const skip = (page - 1) * limit

  const query = { recipientId: userId }
  if (status) {
    query.status = status
  }

  return this.find(query).populate("senderId", "name avatarUrl role").sort({ createdAt: -1 }).skip(skip).limit(limit)
}

module.exports = mongoose.model("Notification", notificationSchema)
