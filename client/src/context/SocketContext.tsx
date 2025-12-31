"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuth } from "../context/AuthContext"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocketContext = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocketContext must be used within SocketProvider")
  }
  return context
}

interface SocketProviderProps {
  children: ReactNode
}

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const { user } = useAuth()
  const socketRef = useRef<Socket | null>(null)
  const isConnectedRef = useRef(false)

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        console.log("Disconnecting socket - user logged out")
        socketRef.current.disconnect()
        socketRef.current = null
        isConnectedRef.current = false
      }
      return
    }

    // Don't create multiple connections
    if (socketRef.current?.connected) {
      console.log("Socket already connected, reusing existing connection")
      return
    }

    const rawToken = localStorage.getItem("business_nexus_token")
    const cleanToken = (t: string | null) => {
      if (!t) return null
      const cleaned = t.trim().replace(/^["']|["']$/g, "")
      const parts = cleaned.split(".")
      if (parts.length !== 3) return null
      return cleaned
    }
    const token = cleanToken(rawToken)

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000"


    socketRef.current = io(socketUrl, {
      auth: {
        token: token || undefined,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current.on("connect", () => {
      isConnectedRef.current = true
    })

    socketRef.current.on("disconnect", () => {

      isConnectedRef.current = false
    })

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message)
    })

    return () => {
      if (socketRef.current) {
        console.log("Cleaning up socket connection")
        socketRef.current.disconnect()
        socketRef.current = null
        isConnectedRef.current = false
      }
    }
  }, [user])

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected: isConnectedRef.current,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}
