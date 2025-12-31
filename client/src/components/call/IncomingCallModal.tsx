"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Phone, PhoneOff, Video } from "lucide-react"
import { Avatar } from "../ui/Avatar"
import type { User } from "../../types"

interface IncomingCallModalProps {
  caller: User
  callType: "audio" | "video"
  onAccept: () => void
  onDecline: () => void
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({ caller, callType, onAccept, onDecline }) => {
  const [isRinging, setIsRinging] = useState(true)

  useEffect(() => {
    // Play ringtone (you can add actual audio here)
    const interval = setInterval(() => {
      setIsRinging((prev) => !prev)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 animate-fade-in">
      <div className="text-center">
        {/* Caller Avatar with pulse animation */}
        <div className={`mb-8 inline-block ${isRinging ? "animate-pulse" : ""}`}>
          <Avatar
            src={caller.avatarUrl}
            alt={caller.name}
            size="xl"
            status={caller.isOnline ? "online" : "offline"}
            className="ring-4 ring-white shadow-2xl"
          />
        </div>

        {/* Caller Info */}
        <h2 className="text-3xl font-semibold text-white mb-2">{caller.name}</h2>
        <p className="text-lg text-gray-300 mb-8">Incoming {callType} call...</p>

        {/* Call Actions */}
        <div className="flex justify-center space-x-8">
          {/* Decline Button */}
          <button onClick={onDecline} className="flex flex-col items-center group" aria-label="Decline call">
            <div className="w-16 h-16 rounded-full bg-error-500 flex items-center justify-center mb-2 group-hover:bg-error-600 transition-colors shadow-lg">
              <PhoneOff size={28} className="text-white" />
            </div>
            <span className="text-sm text-white">Decline</span>
          </button>

          {/* Accept Button */}
          <button onClick={onAccept} className="flex flex-col items-center group" aria-label="Accept call">
            <div className="w-16 h-16 rounded-full bg-success-500 flex items-center justify-center mb-2 group-hover:bg-success-600 transition-colors shadow-lg">
              {callType === "video" ? (
                <Video size={28} className="text-white" />
              ) : (
                <Phone size={28} className="text-white" />
              )}
            </div>
            <span className="text-sm text-white">Accept</span>
          </button>
        </div>
      </div>
    </div>
  )
}
