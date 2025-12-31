"use client"

import { useEffect } from "react"
import type { Message } from "../types"
import { useSocketContext } from "../context/SocketContext"

interface UseSocketProps {
  onMessageReceived: (message: Message) => void
  onMessageRead?: (messageId: string) => void
}

export const useSocket = ({ onMessageReceived, onMessageRead }: UseSocketProps) => {
  const { socket, isConnected } = useSocketContext()

  useEffect(() => {
    if (!socket) return

   

    // Set up event listeners
    const handleReceiveMessage = (message: any) => {
  
      onMessageReceived(message)
    }

    const handleMessageRead = (data: { messageId: string }) => {
      
      if (onMessageRead) {
        onMessageRead(data.messageId)
      }
    }

    socket.on("receive_message", handleReceiveMessage)
    socket.on("message_read", handleMessageRead)

    // Clean up listeners on unmount
    return () => {
      socket.off("receive_message", handleReceiveMessage)
      socket.off("message_read", handleMessageRead)
    }
  }, [socket, onMessageReceived, onMessageRead])

  // Function to send a message via socket
  const sendMessage = (message: any) => {
    if (socket) {
 
      socket.emit("send_message", message)
    }
  }

  // Function to mark a message as read via socket
  const markAsRead = (messageId: string) => {
    if (socket) {
      
      socket.emit("mark_as_read", { messageId })
    }
  }

  return {
    sendMessage,
    markAsRead,
    isConnected,
  }
}

