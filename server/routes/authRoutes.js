/**
 * AUTHENTICATION & PROFILE MANAGEMENT ROUTES
 * Technology: Express.js with Sequelize ORM
 * Features: Secure Registration, Login, and Profile Discovery Logic
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const User = require('../models/User'); 

/**
 * SECURITY MIDDLEWARE: Validation Handler
 * Ensures that incoming data meets business rules before processing.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            status: "error",
            message: "Validation Failed",
            errors: errors.array() 
        });
    }
    next();
};

// --- 1. CORE AUTHENTICATION ROUTES (Milestone 2 & 7) ---

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new Investor or Entrepreneur in the database
 */
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Full name is required'),
        body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('role').isIn(['Investor', 'Entrepreneur']).withMessage('Role must be Investor or Entrepreneur')
    ],
    validate,
    authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates user and returns JWT token + 2FA simulation
 */
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validate,
    authController.login
);


// --- 2. PROFILE DISCOVERY & RETRIEVAL (Fixes "0 Results" and "Not Found" errors) ---

/**
 * @route   GET /api/auth/entrepreneurs
 * @desc    Fetches list of all Entrepreneurs for the Investor dashboard
 */
router.get('/entrepreneurs', async (req, res) => {
    try {
        const startups = await User.findAll({ 
            where: { role: 'Entrepreneur' },
            attributes: { exclude: ['password'] } // Security: Hide sensitive data
        });
        res.status(200).json(startups);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/**
 * @route   GET /api/auth/investors
 * @desc    Fetches list of all Investors for the Entrepreneur dashboard
 */
router.get('/investors', async (req, res) => {
    try {
        const investors = await User.findAll({ 
            where: { role: 'Investor' },
            attributes: { exclude: ['password'] }
        });
        res.status(200).json(investors);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/**
 * @route   GET /api/users/:id OR /api/auth/user/:id
 * @desc    Fetches detailed profile for a specific user by MySQL Primary Key
 * @note    This handles the "View Profile" button click from the frontend
 */
const getSingleUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(404).json({ 
                status: "error",
                message: "User profile not found in MySQL" 
            });
        }
        
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

// Registered on two paths to ensure total frontend compatibility
router.get('/user/:id', getSingleUser);
router.get('/:id', getSingleUser);

module.exports = router;