"use client"

import type React from "react"
import { useState, useEffect } from "react"
// import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import messageService from "../../services/messageService"
import { ChatUserList } from "../../components/chat/ChatUserList"
import type { ChatConversation, Message } from "../../types"
import { MessageCircle } from "lucide-react"

export const MessagesPage: React.FC = () => {
  const { user } = useAuth()
  // const navigate = useNavigate()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const conversationsData = await messageService.getConversations()

      // Transform backend data to frontend format
      const transformedConversations: ChatConversation[] = conversationsData.map((conv: any) => {
        const otherUser = conv.otherUser

        // Ensure lastMessage satisfies the Message type
        const lastMessage: Message | undefined = conv.lastMessage
          ? {
              id: conv.lastMessage._id,
              senderId: conv.lastMessage.senderId,
              receiverId: conv.lastMessage.receiverId,
              content: conv.lastMessage.content,
              messageType: conv.lastMessage.messageType,
              isRead: conv.lastMessage.isRead,
              readAt: conv.lastMessage.readAt,
              isEdited: conv.lastMessage.isEdited,
              editedAt: conv.lastMessage.editedAt,
              replyTo: conv.lastMessage.replyTo,
              conversationId: conv.lastMessage.conversationId,
              createdAt: conv.lastMessage.createdAt,
              // ✅ FIX: ensure timestamp is always present
              timestamp: conv.lastMessage.timestamp ?? conv.lastMessage.createdAt ?? new Date().toISOString(),
            }
          : undefined

        return {
          id: conv._id,
          participants: [user!.id, otherUser._id],
          lastMessage,
          unreadCount: conv.unreadCount,
          otherUser: {
            id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            avatarUrl: otherUser.avatarUrl,
            isOnline: otherUser.isOnline,
            lastSeen: otherUser.lastSeen,
          },
          updatedAt: new Date(conv.updatedAt),
        }
      })

      setConversations(transformedConversations)
    } catch (error) {
      console.error("[v0] Failed to load conversations:", error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
      {isLoading ? (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      ) : conversations.length > 0 ? (
        <ChatUserList conversations={conversations} />
      ) : (
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="bg-gray-100 p-6 rounded-full mb-4">
            <MessageCircle size={32} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-900">No messages yet</h2>
          <p className="text-gray-600 text-center mt-2">
            Start connecting with entrepreneurs and investors to begin conversations
          </p>
        </div>
      )}
    </div>
  )
}

