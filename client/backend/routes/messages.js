const express = require("express")
const Message = require("../models/Message")
const User = require("../models/User")
const mongoose = require("mongoose")
const { validateObjectId, handleValidationErrors } = require("../middleware/validation")
const { body, query } = require("express-validator")
const { encryptMessage, decryptMessage } = require("../utils/encryption") // Fixed import
const crypto = require("crypto") // Import crypto for content hashing
const NotificationService = require("../services/notificationService") // Added notification service import

const router = express.Router()

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user.id

    // Get all conversations for the user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: new mongoose.Types.ObjectId(userId) }, { receiverId: new mongoose.Types.ObjectId(userId) }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: "$conversationId",
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)] }, { $eq: ["$isRead", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.senderId",
          foreignField: "_id",
          as: "sender",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "lastMessage.receiverId",
          foreignField: "_id",
          as: "receiver",
        },
      },
      {
        $addFields: {
          otherUser: {
            $cond: [
              { $eq: ["$lastMessage.senderId", new mongoose.Types.ObjectId(userId)] },
              { $arrayElemAt: ["$receiver", 0] },
              { $arrayElemAt: ["$sender", 0] },
            ],
          },
        },
      },
      {
        $project: {
          conversationId: "$_id",
          lastMessage: 1,
          unreadCount: 1,
          otherUser: {
            _id: 1,
            name: 1,
            email: 1,
            avatarUrl: 1,
            isOnline: 1,
            lastSeen: 1,
          },
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ])

    // Decrypt last message content for each conversation
    const decryptedConversations = conversations.map((conv) => {
      if (conv.lastMessage && conv.lastMessage.content) {
        try {
          const decryptedContent = decryptMessage(conv.lastMessage.content)
          conv.lastMessage.content = decryptedContent
        } catch (error) {
          console.error("Error decrypting message:", error)
          conv.lastMessage.content = "[Encrypted message]"
        }
      }
      return conv
    })

    res.json({ conversations: decryptedConversations })
  } catch (error) {
    console.error("Get conversations error:", error)
    res.status(500).json({
      message: "Failed to fetch conversations",
      code: "FETCH_CONVERSATIONS_FAILED",
    })
  }
})

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and specified user
// @access  Private
router.get(
  "/:userId",
  validateObjectId("userId"),
  [query("page").optional().isInt({ min: 1 }), query("limit").optional().isInt({ min: 1, max: 100 })],
  handleValidationErrors,
  async (req, res) => {
    try {
      const currentUserId = req.user.id
      const otherUserId = req.params.userId
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 50
      const skip = (page - 1) * limit

      const conversationId = Message.generateConversationId(currentUserId, otherUserId)

      // Get messages
      const messages = await Message.find({ conversationId })
        .populate("senderId", "name avatarUrl")
        .populate("receiverId", "name avatarUrl")
        .populate("replyTo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      // Decrypt message contents
      const decryptedMessages = messages.map((msg) => {
        if (msg.content) {
          try {
            const decryptedContent = decryptMessage(msg.content)
            msg.content = decryptedContent
          } catch (error) {
            console.error("Error decrypting message:", error)
            msg.content = "[Encrypted message]"
          }
        }
        return msg
      })

      // Get total count
      const total = await Message.countDocuments({ conversationId })

      // Mark messages as read
      await Message.updateMany(
        {
          conversationId,
          receiverId: currentUserId,
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      )

      res.json({
        messages: decryptedMessages.reverse(), // Reverse to show oldest first
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalMessages: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get messages error:", error)
      res.status(500).json({
        message: "Failed to fetch messages",
        code: "FETCH_MESSAGES_FAILED",
      })
    }
  },
)

// @route   POST /api/messages/send
// @desc    Send a message
// @access  Private
router.post(
  "/send",
  [
    body("receiverId").isMongoId().withMessage("Valid receiver ID is required"),
    body("content")
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage("Message content is required (1-2000 characters)"),
    body("messageType").optional().isIn(["text", "image", "document"]),
    body("replyTo").optional().isMongoId(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { receiverId, content, messageType = "text", replyTo } = req.body
      const senderId = req.user.id

      // Check if receiver exists
      const receiver = await User.findById(receiverId)
      if (!receiver) {
        return res.status(404).json({
          message: "Receiver not found",
          code: "RECEIVER_NOT_FOUND",
        })
      }

      const conversationId = Message.generateConversationId(senderId, receiverId)

      // Encrypt message content
      const encryptedContent = encryptMessage(content)

      // Compute contentHash of plaintext and dedupe against very recent messages
      const contentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex")
      const dedupeWindowMs = 5000
      const recentSince = new Date(Date.now() - dedupeWindowMs)

      let message =
        (await Message.findOne({
          senderId,
          receiverId,
          contentHash,
          createdAt: { $gt: recentSince },
        })
          .populate("senderId", "name avatarUrl")
          .populate("receiverId", "name avatarUrl")
          .populate("replyTo")) || null

      if (!message) {
        message = new Message({
          senderId,
          receiverId,
          content: encryptedContent, // Store encrypted content
          messageType,
          conversationId,
          replyTo,
          isEncrypted: true,
          contentHash, // Store hash for dedupe
        })

        await message.save()

        // Populate sender and receiver info
        await message.populate("senderId", "name avatarUrl")
        await message.populate("receiverId", "name avatarUrl")
        if (replyTo) {
          await message.populate("replyTo")
        }

        try {
          await NotificationService.createMessageNotification(senderId, receiverId, message._id, content)
        } catch (notificationError) {
          console.error("Failed to create message notification:", notificationError)
          // Don't fail the message send if notification fails
        }
      }

      // Create a copy for response with decrypted content
      const responseMessage = message.toObject()
      responseMessage.content = content // Send decrypted content in response

      // Emit real-time message via Socket.IO
      const io = req.app.get("io")
      if (io) {
        io.to(receiverId).emit("receive_message", responseMessage)
      }

      res.status(201).json({
        message: "Message sent successfully",
        data: responseMessage,
      })
    } catch (error) {
      console.error("Send message error:", error)
      res.status(500).json({
        message: "Failed to send message",
        code: "SEND_MESSAGE_FAILED",
      })
    }
  },
)

// @route   PUT /api/messages/:messageId/read
// @desc    Mark message as read
// @access  Private
router.put("/:messageId/read", validateObjectId("messageId"), async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId)

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
        code: "MESSAGE_NOT_FOUND",
      })
    }

    // Only receiver can mark message as read; if not receiver, no-op for stability
    if (message.receiverId.toString() !== req.user.id) {
      return res.json({
        message: "No action taken (not receiver)",
      })
    }

    await message.markAsRead()

    res.json({
      message: "Message marked as read",
    })
  } catch (error) {
    console.error("Mark message as read error:", error)
    res.status(500).json({
      message: "Failed to mark message as read",
      code: "MARK_READ_FAILED",
    })
  }
})

module.exports = router


