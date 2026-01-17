/**
 * NEXUS PLATFORM - CORE ENGINE
 * Technology Stack: Node.js, Express, Sequelize (MySQL), Socket.io
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// 1. DATABASE AND ROUTE IMPORTS
const { connectDB, sequelize } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const documentRoutes = require('./routes/documentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// 2. INITIALIZATION
const app = express();
const server = http.createServer(app);

// 3. PRE-START SYSTEM CHECKS
// Milestone 5: Ensure 'uploads' directory exists for Document Storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 4. MIDDLEWARE & SECURITY
// CORS Config allows the Vite Frontend (Port 5173) to communicate with this Backend
app.use(cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Milestone 5: Serving static files so the frontend can preview documents
app.use('/uploads', express.static(uploadDir));

// 5. PRIMARY API ROUTES
// Backend Health Check
app.get('/', (req, res) => {
    res.status(200).send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 100px;">
            <h1>Nexus Backend is Live</h1>
            <p>Status: Connected to MySQL via XAMPP</p>
            <hr style="width: 400px; margin: 20px auto; border: 0; border-top: 1px solid #eee;">
            <p>API version 1.0.0 | Ready for Frontend requests on Port 5173</p>
        </div>
    `);
});

// FEATURE ROUTING
app.use('/api/auth', authRoutes);         // Milestone 2: User Auth
app.use('/api/users', authRoutes);        // ALIAS: Matches Frontend Profile Lookup
app.use('/api/meetings', meetingRoutes); // Milestone 3: Scheduling Logic
app.use('/api/documents', documentRoutes); // Milestone 5: Document Chamber
app.use('/api/payments', paymentRoutes);   // Milestone 6: Payment Simulation

// 6. MILESTONE 4: VIDEO CALL SIGNALING (SOCKET.IO)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`Socket Connected: ${socket.id}`);

    // Join a collaboration room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
    });

    // Signaling: Passing camera/audio metadata between users
    socket.on('signal', (data) => {
        io.to(data.roomId).emit('signal', {
            signal: data.signal,
            from: socket.id
        });
    });

    socket.on('disconnect', () => {
        console.log('Socket Disconnected');
    });
});

// 7. SERVER STARTUP SEQUENCE
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Sync models with MySQL database
        await sequelize.sync({ alter: true });
        
        server.listen(PORT, () => {
            connectDB(); // Run standard connection check from db.js
            console.log('-----------------------------------------');
            console.log(`SERVER RUNNING ON PORT: ${PORT}`);
            console.log('DATABASE: XAMPP MySQL Connected');
            console.log('REAL-TIME: Socket.io Signaling Ready');
            console.log('-----------------------------------------');
        });
    } catch (error) {
        console.error("Critical Error: Server failed to start:", error);
        process.exit(1);
    }
};

startServer();

// Global Exception Handling
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection Error:', reason);
});