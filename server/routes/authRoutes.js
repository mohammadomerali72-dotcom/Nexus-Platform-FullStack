const express = require('express');
const { body, validationResult } = require('express-validator'); // Security Tools
const router = express.Router();
const { register, login } = require('../controllers/authController');

// --- SECURITY MIDDLEWARE: Checks for validation errors ---
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            status: "Error",
            message: "Validation Failed",
            errors: errors.array() 
        });
    }
    next();
};

// --- 1. REGISTER ROUTE (With Validation & Sanitization) ---
router.post(
    '/register',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        body('role').isIn(['Investor', 'Entrepreneur']).withMessage('Role must be Investor or Entrepreneur')
    ],
    validate, // Run the security check
    register
);

// --- 2. LOGIN ROUTE ---
router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
        body('password').notEmpty().withMessage('Password is required')
    ],
    validate, // Run the security check
    login
);

module.exports = router;