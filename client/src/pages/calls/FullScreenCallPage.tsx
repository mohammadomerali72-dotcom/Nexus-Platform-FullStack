"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useWebRTCCall } from "../../hooks/useWebRTCCall"
import { CallControls } from "../../components/call/CallControls"
import { Avatar } from "../../components/ui/Avatar"
import type { User } from "../../types"
import { userService } from "../../services/userService"

interface FullScreenCallPageProps {
  callType: "audio" | "video"
}

export const FullScreenCallPage: React.FC<FullScreenCallPageProps> = ({ callType }) => {
  const { roomId, userId } = useParams<{ roomId: string; userId: string }>()
  const navigate = useNavigate()
  const { status, error, mediaState, getLocalStream, getRemoteStream, joinRoom, toggleAudio, toggleVideo, endCall } =
    useWebRTCCall()

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [callPartner, setCallPartner] = useState<User | null>(null)
  const [speakerEnabled, setSpeakerEnabled] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  // Load call partner info
  useEffect(() => {
    if (userId) {
      loadCallPartner()
    }
  }, [userId])

  const loadCallPartner = async () => {
    if (!userId) return
    try {
      const response = await userService.getUserById(userId)
      if (response.success && response.data) {
        setCallPartner(response.data as unknown as User)
      }
    } catch (error) {
      console.error("Failed to load call partner:", error)
    }
  }

  // Join room
  useEffect(() => {
    if (!roomId || hasJoined) return
    joinRoom(roomId).then(() => setHasJoined(true))
  }, [roomId, hasJoined, joinRoom])

  // Update local video stream
  useEffect(() => {
    const local = getLocalStream()
    if (local && localVideoRef.current && callType === "video") {
      localVideoRef.current.srcObject = local
    }
  })

  // Update remote video stream
  useEffect(() => {
    const remote = getRemoteStream()
    if (remote && remoteVideoRef.current && callType === "video") {
      remoteVideoRef.current.srcObject = remote
    }
  })

  // Call duration timer
  useEffect(() => {
    if (status === "in-call") {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const handleEndCall = () => {
    endCall()
    navigate(-1)
  }

  const handleToggleSpeaker = () => {
    setSpeakerEnabled((prev) => !prev)
    // Implement actual speaker toggle logic here
  }

  const handleToggleMinimize = () => {
    setIsMinimized((prev) => !prev)
  }

  const getStatusText = () => {
    switch (status) {
      case "joining":
        return "Joining..."
      case "waiting":
        return "Ringing..."
      case "connecting":
        return "Connecting..."
      case "in-call":
        return formatDuration(callDuration)
      case "ended":
        return "Call ended"
      case "full":
        return "Room is full"
      case "error":
        return "Connection error"
      default:
        return "Initializing..."
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
      {/* Call Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex flex-col items-center">
          {callPartner && (
            <>
              <Avatar
                src={callPartner.avatarUrl}
                alt={callPartner.name}
                size="lg"
                status={callPartner.isOnline ? "online" : "offline"}
                className="mb-3"
              />
              <h2 className="text-2xl font-semibold text-white mb-1">{callPartner.name}</h2>
            </>
          )}
          <p className="text-lg text-gray-300">{getStatusText()}</p>
          {callPartner && !callPartner.isOnline && status !== "in-call" && (
            <p className="text-sm text-gray-400 mt-1">User is offline</p>
          )}
        </div>
      </div>

      {/* Video/Audio Display Area */}
      <div className="flex-1 relative">
        {callType === "video" ? (
          <>
            {/* Remote Video (Full Screen) */}
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              {status === "in-call" ? (
                <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
              ) : (
                <div className="text-center">
                  {callPartner && (
                    <Avatar src={callPartner.avatarUrl} alt={callPartner.name} size="xl" className="mx-auto mb-4" />
                  )}
                  <p className="text-white text-lg">{getStatusText()}</p>
                </div>
              )}
            </div>

            {/* Local Video (Picture-in-Picture) */}
            {!isMinimized && (
              <div className="absolute top-20 right-6 w-32 h-40 bg-gray-700 rounded-lg overflow-hidden shadow-2xl border-2 border-white">
                <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              </div>
            )}
          </>
        ) : (
          // Audio Call Display
          <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
            {callPartner && (
              <div className="text-center">
                <Avatar
                  src={callPartner.avatarUrl}
                  alt={callPartner.name}
                  size="xl"
                  className="mx-auto mb-6 ring-4 ring-white shadow-2xl"
                />
                <h2 className="text-3xl font-semibold text-white mb-2">{callPartner.name}</h2>
                <p className="text-xl text-white/80">{getStatusText()}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-error-500 text-white px-6 py-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}

      {/* Call Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent">
        <CallControls
          audioEnabled={mediaState.audioEnabled}
          videoEnabled={mediaState.videoEnabled}
          speakerEnabled={speakerEnabled}
          isMinimized={isMinimized}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleSpeaker={handleToggleSpeaker}
          onToggleMinimize={handleToggleMinimize}
          onEndCall={handleEndCall}
          callType={callType}
        />
      </div>
    </div>
  )
}
