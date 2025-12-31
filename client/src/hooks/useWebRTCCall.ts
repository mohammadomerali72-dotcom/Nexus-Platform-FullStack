"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

type MediaState = {
  audioEnabled: boolean
  videoEnabled: boolean
}

export function useWebRTCCall() {
  const socketRef = useRef<Socket | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [mediaState, setMediaState] = useState<MediaState>({ audioEnabled: true, videoEnabled: true })
  const [status, setStatus] = useState<
    "idle" | "joining" | "waiting" | "connecting" | "in-call" | "ended" | "full" | "error"
  >("idle")
  const [error, setError] = useState<string | null>(null)

  const socketUrl = useMemo(() => import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", [])
  const token =
    typeof window !== "undefined"
      ? (() => {
          const raw = localStorage.getItem("business_nexus_token")
          if (!raw) return null
          const cleaned = raw.trim().replace(/^["']|["']$/g, "")
          return cleaned.split(".").length === 3 ? cleaned : null
        })()
      : null

  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    })

    pc.onicecandidate = (e) => {
      if (e.candidate && roomId && socketRef.current) {
        socketRef.current.emit("webrtc:ice", { roomId, candidate: e.candidate })
      }
    }

    pc.ontrack = (e) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream()
      e.streams[0].getTracks().forEach((t) => remoteStreamRef.current!.addTrack(t))
      setStatus("in-call")
    }

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState
      if (state === "connected") setStatus("in-call")
      if (state === "disconnected" || state === "failed" || state === "closed") {
        endCall()
      }
    }

    pcRef.current = pc
    return pc
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const initMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    localStreamRef.current = stream
    return stream
  }, [])

  const ensureSocket = useCallback(() => {
    if (socketRef.current?.connected) return socketRef.current
    const s = io(socketUrl, { auth: { token }, transports: ["websocket", "polling"] })
    socketRef.current = s
    s.on("connect", () => setConnected(true))
    s.on("disconnect", () => setConnected(false))
    s.on("webrtc:full", () => {
      setStatus("full")
      setError("Room is full (2 participants max).")
    })
    s.on("webrtc:error", (payload: any) => {
      setStatus("error")
      setError(payload?.message || "Unexpected error")
    })
    s.on("webrtc:joined", () => setStatus("waiting"))
    s.on("webrtc:ready", () => setStatus("connecting"))
    s.on("webrtc:init", async () => {
      if (!pcRef.current) createPeer()
      const pc = pcRef.current!
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!))
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      s.emit("webrtc:offer", { roomId, sdp: offer })
    })
    s.on("webrtc:offer", async ({ sdp }) => {
      if (!pcRef.current) createPeer()
      const pc = pcRef.current!
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      localStreamRef.current?.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      s.emit("webrtc:answer", { roomId, sdp: answer })
    })
    s.on("webrtc:answer", async ({ sdp }) => {
      if (!pcRef.current) return
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp))
    })
    s.on("webrtc:ice", async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.error("[webrtc] addIceCandidate error", err)
      }
    })
    s.on("webrtc:peer-left", () => {
      endCall()
    })
    return s
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl, token, roomId])

  const joinRoom = useCallback(
    async (room: string) => {
      try {
        setError(null)
        setStatus("joining")
        setRoomId(room)
        await initMedia()
        const s = ensureSocket()
        s.emit("webrtc:join", { roomId: room })
      } catch (err: any) {
        console.error("[webrtc] joinRoom error", err)
        setError(err?.message || "Failed to start media")
        setStatus("error")
      }
    },
    [ensureSocket, initMedia],
  )

  const toggleAudio = useCallback(() => {
    const enabled = !mediaState.audioEnabled
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = enabled))
    setMediaState((s) => ({ ...s, audioEnabled: enabled }))
  }, [mediaState.audioEnabled])

  const toggleVideo = useCallback(() => {
    const enabled = !mediaState.videoEnabled
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = enabled))
    setMediaState((s) => ({ ...s, videoEnabled: enabled }))
  }, [mediaState.videoEnabled])

  const endCall = useCallback(() => {
    try {
      if (roomId && socketRef.current) socketRef.current.emit("webrtc:leave", { roomId })
      pcRef.current?.getSenders().forEach((sender) => {
        try {
          sender.track?.stop()
        } catch {}
      })
      pcRef.current?.close()
      pcRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
      remoteStreamRef.current = null
    } finally {
      setStatus("ended")
    }
  }, [roomId])

  useEffect(() => {
    return () => {
      try {
        endCall()
      } catch {}
      try {
        socketRef.current?.off()
      } catch {}
    }
  }, [endCall])

  return {
    status,
    error,
    connected,
    mediaState,
    getLocalStream: () => localStreamRef.current,
    getRemoteStream: () => remoteStreamRef.current,
    joinRoom,
    toggleAudio,
    toggleVideo,
    endCall,
  }
}
