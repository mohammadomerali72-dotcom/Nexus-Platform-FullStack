const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender ID is required"],
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
    },
    content: {
      type: String,
      required: [true, "Message content is required"],
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"], // Increased for encrypted data
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document", "system"],
      default: "text",
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    isEncrypted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
messageSchema.index({ senderId: 1, receiverId: 1 })
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ isRead: 1 })
messageSchema.index({ createdAt: -1 })

// Generate conversation ID from two user IDs
messageSchema.statics.generateConversationId = (userId1, userId2) => [userId1, userId2].sort().join("_")

// Mark message as read
messageSchema.methods.markAsRead = function () {
  this.isRead = true
  this.readAt = new Date()
  return this.save()
}

module.exports = mongoose.model("Message", messageSchema)






