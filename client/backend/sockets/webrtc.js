module.exports = function registerWebRTC(io) {
  const ROOM_PREFIX = "webrtc:"

  io.on("connection", (socket) => {
    

    socket.on("call:initiate", async ({ userId, roomId, callType }) => {
      try {
       

        // Find the recipient's socket by iterating through all connected sockets
        let recipientSocketId = null
        const sockets = await io.fetchSockets()

        for (const s of sockets) {
          if (s.userId === userId) {
            recipientSocketId = s.id
            break
          }
        }

        

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("call:incoming", {
            callerId: socket.userId,
            roomId,
            callType,
          })
         
        } else {
          
          socket.emit("call:failed", { message: "User is not online" })
        }
      } catch (err) {
        console.error("[v0] [webrtc] call initiation error:", err)
        socket.emit("webrtc:error", { message: "Failed to initiate call" })
      }
    })

    socket.on("call:accept", async ({ roomId, callerId }) => {
      try {
     

        let callerSocketId = null
        const sockets = await io.fetchSockets()

        for (const s of sockets) {
          if (s.userId === callerId) {
            callerSocketId = s.id
            break
          }
        }

       

        if (callerSocketId) {
          io.to(callerSocketId).emit("call:accepted", {
            roomId,
            acceptedBy: socket.userId,
          })
        }
      } catch (err) {
        console.error("[webrtc] call accept error:", err)
      }
    })

    socket.on("call:decline", async ({ roomId, callerId }) => {
      try {
       

        let callerSocketId = null
        const sockets = await io.fetchSockets()

        for (const s of sockets) {
          if (s.userId === callerId) {
            callerSocketId = s.id
            break
          }
        }


        if (callerSocketId) {
          io.to(callerSocketId).emit("call:declined", {
            roomId,
            declinedBy: socket.userId,
          })
          
        }
      } catch (err) {
        console.error("[webrtc] call decline error:", err)
      }
    })

    socket.on("webrtc:join", ({ roomId }) => {
      try {
        if (!roomId) return socket.emit("webrtc:error", { message: "roomId required" })
        const roomName = ROOM_PREFIX + roomId
        const room = io.sockets.adapter.rooms.get(roomName)
        const currentCount = room ? room.size : 0

       

        if (currentCount >= 2) {
          socket.emit("webrtc:full", { roomId })
          return
        }

        socket.join(roomName)
        socket.emit("webrtc:joined", { roomId })

        const updatedRoom = io.sockets.adapter.rooms.get(roomName)
        const size = updatedRoom ? updatedRoom.size : 1

        

        if (size === 2) {
          io.to(roomName).emit("webrtc:ready", { roomId })
          socket.emit("webrtc:init", { roomId })
          socket.to(roomName).emit("webrtc:peer-joined", { roomId })
        }
      } catch (err) {
        console.error("[v0] [webrtc] join error:", err)
        socket.emit("webrtc:error", { message: "Failed to join room" })
      }
    })

    socket.on("webrtc:offer", ({ roomId, sdp }) => {
      const roomName = ROOM_PREFIX + roomId
      socket.to(roomName).emit("webrtc:offer", { sdp })
    })

    socket.on("webrtc:answer", ({ roomId, sdp }) => {
      const roomName = ROOM_PREFIX + roomId
      socket.to(roomName).emit("webrtc:answer", { sdp })
    })

    socket.on("webrtc:ice", ({ roomId, candidate }) => {
      const roomName = ROOM_PREFIX + roomId
      socket.to(roomName).emit("webrtc:ice", { candidate })
    })

    socket.on("webrtc:leave", ({ roomId }) => {
      const roomName = ROOM_PREFIX + roomId
      socket.leave(roomName)
      socket.to(roomName).emit("webrtc:peer-left", { roomId })
    })

    socket.on("disconnect", () => {
      try {
        for (const roomName of socket.rooms) {
          if (roomName.startsWith(ROOM_PREFIX)) {
            socket.to(roomName).emit("webrtc:peer-left", { roomId: roomName.replace(ROOM_PREFIX, "") })
          }
        }
      } catch (err) {
        console.error("[v0] [webrtc] disconnect cleanup error:", err)
      }
    })
  })
}


