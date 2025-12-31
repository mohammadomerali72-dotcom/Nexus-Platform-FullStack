"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Send, Phone, Video, Info, Smile, MessageCircle, ArrowLeft } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { ChatMessage } from "../../components/chat/ChatMessage"
import { ChatUserList } from "../../components/chat/ChatUserList"
import { useAuth } from "../../context/AuthContext"
import type { Message, ChatConversation, User, MessageUser, UserRole } from "../../types"
import messageService, { type BackendConversation, type BackendMessage } from "../../services/messageService"
import { useSocket } from "../../hooks/useSocket"
import { userService } from "../../services/userService"
import { useCallManager } from "../../hooks/useCallManager"

export const ChatPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [chatPartner, setChatPartner] = useState<User | null>(null)
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const { initiateCall } = useCallManager()

  const handleMessageReceived = useCallback(
    (messageData: any) => {
      const transformedMessage = transformMessage(messageData)
      setMessages((prev) => [...prev, transformedMessage])

      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.otherUser.id === transformedMessage.senderId) {
            return {
              ...conv,
              lastMessage: transformedMessage,
              unreadCount: conv.otherUser.id === currentUser?.id ? conv.unreadCount : conv.unreadCount + 1,
            }
          }
          return conv
        }),
      )
    },
    [currentUser],
  )

  const handleMessageRead = useCallback((messageId: string) => {
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isRead: true } : msg)))
  }, [])

  const { sendMessage: sendSocketMessage, markAsRead } = useSocket({
    onMessageReceived: handleMessageReceived,
    onMessageRead: handleMessageRead,
  })

  useEffect(() => {
    loadConversations()
    if (userId) {
      loadChatPartner()
    }
  }, [currentUser, userId])

  useEffect(() => {
    if (currentUser && userId) {
      loadMessages()
    }
  }, [currentUser, userId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadChatPartner = async () => {
    if (!userId) return

    try {
      const response = await userService.getUserById(userId)
      if (response.success && response.data) {
        setChatPartner(response.data as unknown as User)
      }
    } catch (error) {
      console.error("Failed to load chat partner:", error)
    }
  }

  const loadConversations = async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)
      const conversationsData = await messageService.getConversations()

      const transformedConversations: ChatConversation[] = conversationsData.map((conv: BackendConversation) => {
        const otherUser = conv.otherUser
        const lastMessage = conv.lastMessage ? transformMessage(conv.lastMessage) : undefined

        return {
          id: conv._id,
          participants: [currentUser.id, otherUser._id],
          lastMessage,
          unreadCount: conv.unreadCount,
          otherUser: {
            id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            avatarUrl: otherUser.avatarUrl,
            isOnline: otherUser.isOnline,
            lastSeen: otherUser.lastSeen ? otherUser.lastSeen : new Date().toISOString(), // ✅ toISOString
          },
          updatedAt: new Date(),
        }
      })

      setConversations(transformedConversations)
    } catch (error) {
      console.error("Failed to load conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async () => {
    if (!currentUser || !userId) return

    try {
      const response = await messageService.getMessages(userId, { page: 1, limit: 50 })
      const transformedMessages = response.messages.map(transformMessage)
      setMessages(transformedMessages)

      const unreadMessages = transformedMessages.filter((msg: BackendMessage) => !msg.isRead && msg.senderId !== currentUser.id)

      for (const message of unreadMessages) {
        try {
          await messageService.markMessageAsRead(message.id)
          markAsRead(message.id)
        } catch (error) {
          console.error("Failed to mark message as read:", error)
        }
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  

  const transformMessage = (backendMsg: BackendMessage): Message => {
  const senderId = typeof backendMsg.senderId === "object" ? backendMsg.senderId._id : backendMsg.senderId
  const receiverId = typeof backendMsg.receiverId === "object" ? backendMsg.receiverId._id : backendMsg.receiverId

  let sender: MessageUser | undefined, receiver: MessageUser | undefined

  if (typeof backendMsg.senderId === "object") {
    sender = {
      id: backendMsg.senderId._id,
      name: backendMsg.senderId.name || "Unknown User",
      avatarUrl: backendMsg.senderId.avatarUrl || "",
      email: backendMsg.senderId?.email ?? "",
      role: (backendMsg.senderId?.role as UserRole) ?? "",
    }
  }

  if (typeof backendMsg.receiverId === "object") {
    receiver = {
      id: backendMsg.receiverId._id,
      name: backendMsg.receiverId.name || "Unknown User",
      avatarUrl: backendMsg.receiverId.avatarUrl || "",
      email: backendMsg.receiverId?.email ?? "",
      role: (backendMsg.receiverId?.role as UserRole) ?? "",
    }
  }

  return {
    id: backendMsg._id,
    senderId,
    receiverId,
    content: backendMsg.content || "",
    messageType: backendMsg.messageType as any,
    isRead: backendMsg.isRead ?? false,
    readAt: backendMsg.readAt ? new Date(backendMsg.readAt).toISOString() : undefined,
    isEdited: backendMsg.isEdited ?? false,
    editedAt: backendMsg.editedAt ? new Date(backendMsg.editedAt).toISOString() : undefined,
    replyTo: backendMsg.replyTo,
    conversationId: backendMsg.conversationId,
    createdAt: new Date(backendMsg.createdAt).toISOString(),
    timestamp: backendMsg.createdAt ? new Date(backendMsg.createdAt).toISOString() : new Date().toISOString(),
    sender,
    receiver,
    isEncrypted: backendMsg.isEncrypted ?? false,
  }
}


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !currentUser || !userId) return

    try {
      const messageData = {
        receiverId: userId,
        content: newMessage,
        messageType: "text" as const,
      }

      sendSocketMessage(messageData)

      const sentMessage = await messageService.sendMessage(messageData)
      const transformedMessage = transformMessage(sentMessage)

      setMessages((prev) => [...prev, transformedMessage])
      setNewMessage("")

      loadConversations()
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleVoiceCall = () => {
    if (userId) {
      initiateCall(userId, "audio")
    }
  }

  const handleVideoCall = () => {
    if (userId) {
      initiateCall(userId, "video")
    }
  }

  if (!currentUser) return null

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
      <div className="hidden md:block w-1/3 lg:w-1/4 border-r border-gray-200">
        <ChatUserList conversations={conversations} />
      </div>

      <div className="flex-1 flex flex-col">
        {userId && chatPartner ? (
          <>
            <div className="border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center">
                <Button variant="ghost" size="sm" className="md:hidden mr-2" onClick={() => navigate(-1)}>
                  <ArrowLeft size={18} />
                </Button>

                <Avatar
                  src={chatPartner.avatarUrl}
                  alt={chatPartner.name}
                  size="md"
                  status={chatPartner.isOnline ? "online" : "offline"}
                  className="mr-3"
                />

                <div>
                  <h2 className="text-lg font-medium text-gray-900">{chatPartner.name}</h2>
                  <p className="text-sm text-gray-500">{chatPartner.isOnline ? "Online" : "Offline"}</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Voice call"
                  onClick={handleVoiceCall}
                >
                  <Phone size={18} />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full p-2"
                  aria-label="Video call"
                  onClick={handleVideoCall}
                >
                  <Video size={18} />
                </Button>

                <Button variant="ghost" size="sm" className="rounded-full p-2" aria-label="Info">
                  <Info size={18} />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isCurrentUser={message.senderId === currentUser.id}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <MessageCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700">No messages yet</h3>
                  <p className="text-gray-500 mt-1">Send a message to start the conversation</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Button type="button" variant="ghost" size="sm" className="rounded-full p-2" aria-label="Add emoji">
                  <Smile size={20} />
                </Button>

                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  fullWidth
                  className="flex-1"
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={!newMessage.trim()}
                  className="rounded-full p-2 w-10 h-10 flex items-center justify-center"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageCircle size={48} className="text-gray-400" />
            </div>
            <h2 className="text-xl font-medium text-gray-700">Select a conversation</h2>
            <p className="text-gray-500 mt-2 text-center">Choose a contact from the list to start chatting</p>
          </div>
        )}
      </div>
    </div>
  )
}

