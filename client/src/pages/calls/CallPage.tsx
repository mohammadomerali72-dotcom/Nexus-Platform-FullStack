"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useWebRTCCall } from "../../hooks/useWebRTCCall"
import { Button } from "../../components/ui/Button"

export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  const { status, error, mediaState, getLocalStream, getRemoteStream, joinRoom, toggleAudio, toggleVideo, endCall } =
    useWebRTCCall()

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const [hasJoined, setHasJoined] = useState(false)

  useEffect(() => {
    if (!roomId) return
    if (!hasJoined) {
      joinRoom(roomId).then(() => setHasJoined(true))
    }
  }, [roomId, hasJoined, joinRoom])

  useEffect(() => {
    const local = getLocalStream()
    if (local && localVideoRef.current) {
      localVideoRef.current.srcObject = local
    }
  })

  useEffect(() => {
    const remote = getRemoteStream()
    if (remote && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remote
    }
  })

  const leave = () => {
    endCall()
    navigate(-1)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Video Call</h1>
          <p className="text-sm text-gray-600">Room: {roomId}</p>
        </div>

        {error && <div className="mb-3 text-error-600">{error}</div>}
        {status === "full" && (
          <div className="mb-4">
            <Button variant="warning" onClick={() => navigate(-1)}>
              Room full — Go back
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-900 rounded-md overflow-hidden aspect-video flex items-center justify-center">
            <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          </div>
          <div className="bg-gray-900 rounded-md overflow-hidden aspect-video flex items-center justify-center">
            <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant={mediaState.audioEnabled ? "primary" : "secondary"} onClick={toggleAudio}>
            {mediaState.audioEnabled ? "Mute" : "Unmute"}
          </Button>
          <Button variant={mediaState.videoEnabled ? "primary" : "secondary"} onClick={toggleVideo}>
            {mediaState.videoEnabled ? "Camera Off" : "Camera On"}
          </Button>
          <Button variant="error" onClick={leave}>
            End Call
          </Button>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Status: {status}
          {status === "waiting" && " — Waiting for another participant to join..."}
          {status === "connecting" && " — Connecting..."}
        </div>
      </div>
    </div>
  )
}
