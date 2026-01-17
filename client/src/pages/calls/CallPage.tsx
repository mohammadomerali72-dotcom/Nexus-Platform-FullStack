"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useWebRTCCall } from "../../hooks/useWebRTCCall"
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, AlertCircle } from "lucide-react"

/**
 * CALL PAGE COMPONENT
 * Milestone 4: WebRTC Video Calling Integration
 */
export const CallPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  // MILESTONE 4: Connect to your Socket.io signaling server
  const { 
    status, 
    error,
    mediaState, 
    getLocalStream, 
    getRemoteStream, 
    joinRoom, 
    toggleAudio, 
    toggleVideo, 
    endCall 
  } = useWebRTCCall()

  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const [hasJoined, setHasJoined] = useState(false)

  // 1. Signaling Logic
  useEffect(() => {
    if (roomId && !hasJoined) {
      joinRoom(roomId).then(() => setHasJoined(true))
    }
  }, [roomId, hasJoined, joinRoom])

  // 2. Video Stream Handling
  useEffect(() => {
    const local = getLocalStream()
    if (local && localVideoRef.current) localVideoRef.current.srcObject = local
    
    const remote = getRemoteStream()
    if (remote && remoteVideoRef.current) remoteVideoRef.current.srcObject = remote
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-2xl">
          <div className="flex items-center gap-3">
            <Monitor className="text-blue-500" size={24} />
            <h1 className="text-lg font-bold tracking-tight">Meeting Room: {roomId}</h1>
          </div>
          
          <div className="flex items-center gap-3 bg-gray-800 px-4 py-2 rounded-full border border-gray-700">
            <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
            <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">{status}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-3 bg-red-900/20 border border-red-500 rounded-lg text-xs text-red-200">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-gray-800 aspect-video shadow-2xl">
            <video ref={localVideoRef} className="w-full h-full object-cover mirror" autoPlay playsInline muted />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-lg text-[10px] font-bold">You (Local)</div>
            {!mediaState.videoEnabled && (
               <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                 <VideoOff size={48} className="text-gray-700" />
               </div>
            )}
          </div>

          <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-gray-800 aspect-video shadow-2xl flex items-center justify-center">
            <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
            {status !== 'connected' && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center text-center p-6">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500 mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Waiting for partner...</p>
              </div>
            )}
          </div>
        </div>

        {/* Call Controls */}
        <div className="mt-12 flex justify-center items-center gap-6 bg-gray-900/80 backdrop-blur-xl w-max mx-auto p-4 rounded-[2rem] border border-gray-700 shadow-2xl">
          <button onClick={toggleAudio} className={`p-4 rounded-2xl transition-all ${mediaState.audioEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600'}`}>
            {mediaState.audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          
          <button onClick={toggleVideo} className={`p-4 rounded-2xl transition-all ${mediaState.videoEnabled ? 'bg-gray-800 hover:bg-gray-700' : 'bg-red-600'}`}>
            {mediaState.videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>

          <div className="w-[1px] h-10 bg-gray-800" />

          <button onClick={() => { endCall(); navigate(-1); }} className="p-4 rounded-2xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-transform active:scale-95">
            <PhoneOff size={24} />
          </button>
        </div>

      </div>
    </div>
  )
}