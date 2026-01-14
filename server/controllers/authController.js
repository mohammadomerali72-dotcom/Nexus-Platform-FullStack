/**
 * AUTHENTICATION CONTROLLER
 * Handles User Registration and Login with simulated 2FA
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * 1. USER REGISTRATION
 * Validates existence, hashes password, and creates MySQL record
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ 
                status: "error",
                message: "User with this email already exists." 
            });
        }

        // Secure password hashing
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in database
        const user = await User.create({ 
            name, 
            email, 
            password: hashedPassword, 
            role 
        });

        // Professional response for Frontend AuthContext
        res.status(201).json({ 
            status: "success",
            message: "User registered successfully", 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Registration failed", 
            error: error.message 
        });
    }
};

/**
 * 2. USER LOGIN WITH 2FA MOCKUP
 * Authenticates user and generates a simulated 2FA code in terminal
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });

        // Validate user existence and password
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ 
                status: "error",
                message: "Invalid email or password" 
            });
        }

        // MILESTONE 7: 2FA MOCKUP
        // Generate a random 6-digit code for terminal logging
        const mockOTP = Math.floor(100000 + Math.random() * 900000);
        
        console.log("-----------------------------------------");
        console.log(`[SECURITY] 2FA OTP for ${user.email}: ${mockOTP}`);
        console.log("-----------------------------------------");

        // Generate secure JWT Token for session management
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Return standardized response for Frontend integration
        res.json({ 
            status: "success",
            token, 
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            message: "Login successful. 2FA code simulated in terminal logs." 
        });

    } catch (error) {
        res.status(500).json({ 
            status: "error", 
            message: "Login failed", 
            error: error.message 
        });
    }
};