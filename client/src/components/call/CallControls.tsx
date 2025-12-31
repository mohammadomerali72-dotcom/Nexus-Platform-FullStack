"use client"

import type React from "react"
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, Maximize2, Minimize2 } from "lucide-react"

interface CallControlsProps {
  audioEnabled: boolean
  videoEnabled: boolean
  speakerEnabled: boolean
  isMinimized: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleSpeaker: () => void
  onToggleMinimize: () => void
  onEndCall: () => void
  callType: "audio" | "video"
}

export const CallControls: React.FC<CallControlsProps> = ({
  audioEnabled,
  videoEnabled,
  speakerEnabled,
  isMinimized,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onToggleMinimize,
  onEndCall,
  callType,
}) => {
  return (
    <div className="flex items-center justify-center space-x-4 p-6">
      {/* Audio Toggle */}
      <button
        onClick={onToggleAudio}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          audioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-error-500 hover:bg-error-600"
        }`}
        aria-label={audioEnabled ? "Mute" : "Unmute"}
      >
        {audioEnabled ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-white" />}
      </button>

      {/* Video Toggle (only for video calls) */}
      {callType === "video" && (
        <button
          onClick={onToggleVideo}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            videoEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-error-500 hover:bg-error-600"
          }`}
          aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? <Video size={24} className="text-white" /> : <VideoOff size={24} className="text-white" />}
        </button>
      )}

      {/* Speaker Toggle */}
      <button
        onClick={onToggleSpeaker}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
          speakerEnabled ? "bg-primary-500 hover:bg-primary-600" : "bg-gray-700 hover:bg-gray-600"
        }`}
        aria-label={speakerEnabled ? "Speaker on" : "Speaker off"}
      >
        <Volume2 size={24} className="text-white" />
      </button>

      {/* Minimize/Maximize Toggle */}
      <button
        onClick={onToggleMinimize}
        className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
        aria-label={isMinimized ? "Maximize" : "Minimize"}
      >
        {isMinimized ? <Maximize2 size={24} className="text-white" /> : <Minimize2 size={24} className="text-white" />}
      </button>

      {/* End Call */}
      <button
        onClick={onEndCall}
        className="w-14 h-14 rounded-full bg-error-500 hover:bg-error-600 flex items-center justify-center transition-colors"
        aria-label="End call"
      >
        <PhoneOff size={24} className="text-white" />
      </button>
    </div>
  )
}
