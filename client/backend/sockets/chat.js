const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const Message = require("../models/Message")
const User = require("../models/User")
const { encryptMessage, decryptMessage } = require("../utils/encryption")

// Keep online users globally here instead of server.js
const onlineUsers = new Map()

module.exports = function registerChatSocket(io) {
  // ✅ Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        socket.userId = decoded.userId
        next()
      } catch (err) {
        next(new Error("Authentication error"))
      }
    } else {
      next(new Error("Authentication error"))
    }
  })

  // ✅ Main connection handler
  io.on("connection", (socket) => {
    // Add user to online users
    onlineUsers.set(socket.userId, socket.id)

    // Update DB status
    User.findByIdAndUpdate(socket.userId, { isOnline: true }).catch(() => {})

    // Broadcast online status
    io.emit("user_online", { userId: socket.userId })

    // Join personal room
    socket.join(socket.userId)

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { receiverId, content, messageType = "text", replyTo } = data
        const senderId = socket.userId
        const receiver = await User.findById(receiverId)
        if (!receiver) return socket.emit("error", { message: "Receiver not found" })

        const conversationId = Message.generateConversationId(senderId, receiverId)
        const encryptedContent = encryptMessage(content)
        const contentHash = crypto.createHash("sha256").update(content, "utf8").digest("hex")
        const recentSince = new Date(Date.now() - 5000)

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
            content: encryptedContent,
            messageType,
            conversationId,
            replyTo,
            isEncrypted: true,
            contentHash,
          })

          await message.save()
          await message.populate("senderId", "name avatarUrl")
          await message.populate("receiverId", "name avatarUrl")
          if (replyTo) await message.populate("replyTo")
        }

        const messageForDelivery = message.toObject()
        messageForDelivery.content = content

        socket.to(receiverId).emit("receive_message", messageForDelivery)
        socket.emit("message_sent", messageForDelivery)

        io.to(senderId).emit("conversation_updated")
        io.to(receiverId).emit("conversation_updated")
      } catch (err) {
        console.error("Socket message save error:", err)
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    // Handle marking messages as read
    socket.on("mark_as_read", async ({ messageId }) => {
      try {
        const message = await Message.findById(messageId)
        if (!message) return socket.emit("error", { message: "Message not found" })
        if (message.receiverId.toString() !== socket.userId)
          return socket.emit("error", { message: "Not authorized" })

        message.isRead = true
        message.readAt = new Date()
        await message.save()

        socket.to(message.senderId.toString()).emit("message_read", { messageId })
      } catch (err) {
        console.error("Error marking message as read:", err)
        socket.emit("error", { message: "Failed to mark message as read" })
      }
    })

    // Typing indicator
    socket.on("typing", (data) => {
      socket.to(data.receiverId).emit("user_typing", {
        senderId: socket.userId,
        isTyping: data.isTyping,
      })
    })

    // Disconnect handler
    socket.on("disconnect", () => {
      onlineUsers.delete(socket.userId)
      User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() }).catch(() => {})
      io.emit("user_offline", { userId: socket.userId })
    })
  })
}
