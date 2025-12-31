const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 1. USER REGISTRATION ---
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Hash password for security (Milestone 7)
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            role 
        });

        res.status(201).json({ message: "User registered successfully", user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 2. USER LOGIN WITH 2FA MOCKUP ---
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });

        // Check if user exists and password is correct
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        // --- MILESTONE 7: 2FA MOCKUP ---
        // Generate a random 6-digit code
        const mockOTP = Math.floor(100000 + Math.random() * 900000);
        
        // Log to terminal (In a real app, this would be sent via Nodemailer/SMS)
        console.log("-----------------------------------------");
        console.log(`[SECURITY] 2FA OTP for ${user.email}: ${mockOTP}`);
        console.log("-----------------------------------------");

        // Generate JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // Return response
        res.json({ 
            token, 
            role: user.role, 
            name: user.name,
            message: "Login successful. 2FA code simulated in terminal." 
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};