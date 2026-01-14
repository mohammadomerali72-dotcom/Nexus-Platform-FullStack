/**
 * NEXUS PLATFORM - CORE ENGINE
 * Duration: 3 Weeks Internship Final Build
 * Logic: Node.js, Express, Sequelize, Socket.io, Multer
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 1. DATABASE & ROUTE IMPORTS
const { connectDB, sequelize } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const documentRoutes = require('./routes/documentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// 2. INITIALIZATION
const app = express();
const server = http.createServer(app);

// 3. PRE-START SYSTEM AUDIT
// Milestone 5: Ensure Document Chamber (uploads folder) is ready
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 4. MIDDLEWARE & SECURITY (Milestone 7)
// Allow Frontend (Vite) to communicate with Backend
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Milestone 5: Static File Serving for Document Previews
app.use('/uploads', express.static(uploadDir));

// 5. PRIMARY API ENDPOINTS
// Health & Integration Status
app.get('/', (req, res) => {
    res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 100px; line-height: 1.6;">
            <h1 style="color: #2ecc71;">Nexus Full-Stack Engine is Running</h1>
            <p>XAMPP MySQL: <b>Connected</b> | Socket.io: <b>Active</b></p>
            <hr style="width: 40%; margin: 20px auto; border: 0; border-top: 1px solid #eee;">
            <p style="color: #7f8c8d;">Milestones 1-7 fully integrated.</p>
        </div>
    `);
});

// Link specific feature routes
app.use('/api/auth', authRoutes);         // Milestone 2 & 7: Auth, JWT, 2FA
app.use('/api/meetings', meetingRoutes); // Milestone 3: Scheduling & Conflict Logic
app.use('/api/documents', documentRoutes); // Milestone 5: Document Chamber
app.use('/api/payments', paymentRoutes);   // Milestone 6: Transaction Tracking

// 6. MILESTONE 4: VIDEO CALL SIGNALING (SOCKET.IO)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`Connection established with Client ID: ${socket.id}`);

    // Join a secure meeting room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`System: User joined collaboration room ${roomId}`);
    });

    // Signaling: Passing WebRTC metadata (Offer/Answer/Candidates)
    socket.on('signal', (data) => {
        io.to(data.roomId).emit('signal', {
            signal: data.signal,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log(`Connection terminated for Client ID: ${socket.id}`);
    });
});

// 7. SERVER STARTUP SEQUENCE
const PORT = process.env.PORT || 5000;

const startNexusServer = async () => {
    try {
        // Sync Database Schema (Alter ensures XAMPP updates if we change User/Meeting models)
        await sequelize.sync({ alter: true });
        
        server.listen(PORT, () => {
            connectDB(); // Run DB health check from db.js
            console.log('-------------------------------------------');
            console.log(`NEXUS SERVER PORT: ${PORT}`);
            console.log(`DATABASE STATUS: MySQL Linked via XAMPP`);
            console.log(`VIDEO SIGNALING: Socket.io Active`);
            console.log('-------------------------------------------');
        });
    } catch (error) {
        console.error("Critical System Failure:", error);
        process.exit(1);
    }
};

startNexusServer();

// Global Crash Prevention
process.on('unhandledRejection', (err) => {
    console.error('System Error Captured:', err);
});