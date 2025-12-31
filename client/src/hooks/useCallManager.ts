"use client"

import { useState, useCallback, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import type { User } from "../types"
import { useSocketContext } from "../context/SocketContext"
import toast from "react-hot-toast"

interface IncomingCall {
  caller: User
  roomId: string
  callType: "audio" | "video"
}

export const useCallManager = () => {
  const navigate = useNavigate()
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)
  const { socket } = useSocketContext()

  useEffect(() => {
    if (!socket) {
      console.log("No socket available for call manager")
      return
    }

    

    const handleIncomingCall = async (data: any) => {
      const { callerId, roomId, callType } = data

      const rawToken = localStorage.getItem("business_nexus_token")
      const cleanToken = (t: string | null) => {
        if (!t) return null
        const cleaned = t.trim().replace(/^["']|["']$/g, "")
        const parts = cleaned.split(".")
        if (parts.length !== 3) return null
        return cleaned
      }
      const token = cleanToken(rawToken)

      // Fetch caller info
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${callerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (response.ok) {
          const callerData = await response.json()
          setIncomingCall({
            caller: callerData.data,
            roomId,
            callType,
          })
        } else {
          console.error("Failed to fetch caller info, status:", response.status)
        }
      } catch (error) {
        console.error("Failed to fetch caller info:", error)
      }
    }

    const handleCallDeclined = () => {
      toast.error("Call was declined")
    }

    const handleCallAccepted = () => {
      toast.success("Call accepted")
    }

    const handleCallFailed = (data: any) => {
      toast.error(data.message || "Call failed")
    }

    socket.on("call:incoming", handleIncomingCall)
    socket.on("call:declined", handleCallDeclined)
    socket.on("call:accepted", handleCallAccepted)
    socket.on("call:failed", handleCallFailed)

    return () => {
      socket.off("call:incoming", handleIncomingCall)
      socket.off("call:declined", handleCallDeclined)
      socket.off("call:accepted", handleCallAccepted)
      socket.off("call:failed", handleCallFailed)
    }
  }, [socket])

  const initiateCall = useCallback(
    (userId: string, callType: "audio" | "video") => {
      const roomId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`



      if (socket) {
        socket.emit("call:initiate", { userId, roomId, callType })
      } else {
        console.error("Socket not connected, cannot initiate call")
      }

      // Navigate to full-screen call page
      navigate(`/calls/${callType}/${roomId}/${userId}`)
    },
    [navigate, socket],
  )

  const acceptCall = useCallback(() => {
    if (!incomingCall) return

    const { roomId, callType, caller } = incomingCall


    if (socket) {
      socket.emit("call:accept", { roomId, callerId: caller.id })
      console.log("Call:accept event emitted")
    }

    navigate(`/calls/${callType}/${roomId}/${caller.id}`)
    setIncomingCall(null)
  }, [incomingCall, navigate, socket])

  const declineCall = useCallback(() => {
    if (!incomingCall) return

 

    if (socket) {
      socket.emit("call:decline", {
        roomId: incomingCall.roomId,
        callerId: incomingCall.caller.id,
      })
      console.log("Call:decline event emitted")
    }

    setIncomingCall(null)
  }, [incomingCall, socket])

  return {
    incomingCall,
    initiateCall,
    acceptCall,
    declineCall,
  }
}

