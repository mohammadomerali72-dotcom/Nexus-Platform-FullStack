const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const path = require('path');
require('dotenv').config();

// --- 1. IMPORT DATABASE & ROUTES ---
const { connectDB, sequelize } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const documentRoutes = require('./routes/documentRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // Imported correctly

const app = express();
const server = http.createServer(app); 

// --- 2. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 3. API ROUTES (All defined BEFORE sync) ---
app.get('/', (req, res) => {
    res.send("<h1 style='color: #2ecc71; font-family: sans-serif;'> Nexus Full-Stack API is Running!</h1>");
});

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes); // MOVED UP HERE

// --- 4. VIDEO CALLING (SOCKET.IO) ---
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
    console.log('⚡ User connected:', socket.id);
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
    });
    socket.on('signal', (data) => {
        io.to(data.roomId).emit('signal', { signal: data.signal, from: socket.id });
    });
    socket.on('disconnect', () => console.log('❌ User disconnected'));
});

// --- 5. START SERVER & SYNC DATABASE ---
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(() => {
    server.listen(PORT, () => {
        connectDB();
        console.log(` Server listening on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error("❌ Database Sync Error:", err);
});