const express = require("express")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const User = require("../models/User")
const { authenticateToken } = require("../middleware/auth")
const { validateRegistration, validateLogin, handleValidationErrors } = require("../middleware/validation")
const { body } = require("express-validator")
const {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  sanitizeInput,
  xssProtection,
} = require("../middleware/security")
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/emailService")

const router = express.Router()

router.use(sanitizeInput)
router.use(xssProtection)

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  })

  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || "30d",
  })

  return { accessToken, refreshToken }
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post("/register", validateRegistration, async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists with this email",
        code: "USER_EXISTS",
      })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role,
    })

    await user.save()

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id)

    // Add refresh token to user
    user.addRefreshToken(refreshToken)
    await user.save()

    // Remove password from response
    const userResponse = user.toJSON()

    res.status(201).json({
      message: "User registered successfully",
      user: userResponse,
      token: accessToken,
      refreshToken: refreshToken,
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({
      message: "Registration failed",
      code: "REGISTRATION_FAILED",
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password, role } = req.body

    // Find user by email and include password for comparison
    const user = await User.findByEmail(email).select("+password +loginAttempts +lockUntil")
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      })
    }

    if (user.isLocked) {
      return res.status(423).json({
        message: "Account is temporarily locked due to too many failed login attempts. Please try again later.",
        code: "ACCOUNT_LOCKED",
        lockUntil: user.lockUntil,
      })
    }

    // Check if role matches
    if (user.role !== role) {
      await user.incLoginAttempts()
      return res.status(401).json({
        message: "Invalid credentials for this role",
        code: "INVALID_ROLE",
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      await user.incLoginAttempts()
      return res.status(401).json({
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
      })
    }

    if (user.twoFactorEnabled) {
      // Generate OTP
      const otp = user.generateOTP()
      await user.save()

      // Send OTP via email
      const emailResult = await sendOTPEmail(user.email, user.name, otp)

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error)
        return res.status(500).json({
          message: "Failed to send verification code",
          code: "OTP_SEND_FAILED",
        })
      }

      // Return temporary token for OTP verification
      const tempToken = jwt.sign({ userId: user._id, step: "otp_verification" }, process.env.JWT_SECRET, {
        expiresIn: "10m",
      })

      return res.json({
        message: "Verification code sent to your email",
        requiresOTP: true,
        tempToken,
      })
    }

    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts()
    }

    // Update user online status
    user.isOnline = true
    user.lastSeen = new Date()

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id)

    // Add refresh token to user
    user.addRefreshToken(refreshToken)
    await user.save()

    // Remove password from response
    const userResponse = user.toJSON()

    res.json({
      message: "Login successful",
      user: userResponse,
      token: accessToken,
      refreshToken: refreshToken,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      message: "Login failed",
      code: "LOGIN_FAILED",
    })
  }
})

router.post(
  "/verify-otp",
  authLimiter,
  [
    body("tempToken").notEmpty().withMessage("Temporary token is required"),
    body("otp").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { tempToken, otp } = req.body

      // Verify temporary token
      let decoded
      try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET)
        if (decoded.step !== "otp_verification") {
          throw new Error("Invalid token type")
        }
      } catch (error) {
        return res.status(401).json({
          message: "Invalid or expired verification session",
          code: "INVALID_TEMP_TOKEN",
        })
      }

      // Get user with OTP data
      const user = await User.findById(decoded.userId).select("+otpCode +otpExpires +otpAttempts")
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        })
      }

      // Verify OTP
      const otpResult = await user.verifyOTP(otp)
      if (!otpResult.success) {
        return res.status(400).json({
          message: otpResult.message,
          code: "OTP_VERIFICATION_FAILED",
        })
      }

      // Reset login attempts on successful OTP verification
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts()
      }

      // Update user online status
      user.isOnline = true
      user.lastSeen = new Date()

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id)

      // Add refresh token to user
      user.addRefreshToken(refreshToken)
      await user.save()

      // Remove sensitive data from response
      const userResponse = user.toJSON()

      res.json({
        message: "Login successful",
        user: userResponse,
        token: accessToken,
        refreshToken: refreshToken,
      })
    } catch (error) {
      console.error("OTP verification error:", error)
      res.status(500).json({
        message: "OTP verification failed",
        code: "OTP_VERIFICATION_FAILED",
      })
    }
  },
)

router.post(
  "/resend-otp",
  otpLimiter,
  [body("tempToken").notEmpty().withMessage("Temporary token is required"), handleValidationErrors],
  async (req, res) => {
    try {
      const { tempToken } = req.body

      // Verify temporary token
      let decoded
      try {
        decoded = jwt.verify(tempToken, process.env.JWT_SECRET)
        if (decoded.step !== "otp_verification") {
          throw new Error("Invalid token type")
        }
      } catch (error) {
        return res.status(401).json({
          message: "Invalid or expired verification session",
          code: "INVALID_TEMP_TOKEN",
        })
      }

      // Get user
      const user = await User.findById(decoded.userId)
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        })
      }

      // Generate new OTP
      const otp = user.generateOTP()
      await user.save()

      // Send OTP via email
      const emailResult = await sendOTPEmail(user.email, user.name, otp)

      if (!emailResult.success) {
        console.error("Failed to send OTP email:", emailResult.error)
        return res.status(500).json({
          message: "Failed to send verification code",
          code: "OTP_SEND_FAILED",
        })
      }

      res.json({
        message: "Verification code sent successfully",
      })
    } catch (error) {
      console.error("Resend OTP error:", error)
      res.status(500).json({
        message: "Failed to resend verification code",
        code: "RESEND_OTP_FAILED",
      })
    }
  },
)

router.post("/enable-2fa", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        message: "Two-factor authentication is already enabled",
        code: "2FA_ALREADY_ENABLED",
      })
    }

    // Enable 2FA
    user.twoFactorEnabled = true
    await user.save()

    res.json({
      message: "Two-factor authentication enabled successfully",
      twoFactorEnabled: true,
    })
  } catch (error) {
    console.error("Enable 2FA error:", error)
    res.status(500).json({
      message: "Failed to enable two-factor authentication",
      code: "ENABLE_2FA_FAILED",
    })
  }
})

router.post(
  "/disable-2fa",
  authenticateToken,
  [body("password").notEmpty().withMessage("Password is required"), handleValidationErrors],
  async (req, res) => {
    try {
      const { password } = req.body

      // Get user with password
      const user = await User.findById(req.user._id).select("+password")
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        })
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password)
      if (!isPasswordValid) {
        return res.status(401).json({
          message: "Invalid password",
          code: "INVALID_PASSWORD",
        })
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          message: "Two-factor authentication is not enabled",
          code: "2FA_NOT_ENABLED",
        })
      }

      // Disable 2FA
      user.twoFactorEnabled = false
      user.twoFactorSecret = undefined
      user.twoFactorBackupCodes = undefined
      await user.save()

      res.json({
        message: "Two-factor authentication disabled successfully",
        twoFactorEnabled: false,
      })
    } catch (error) {
      console.error("Disable 2FA error:", error)
      res.status(500).json({
        message: "Failed to disable two-factor authentication",
        code: "DISABLE_2FA_FAILED",
      })
    }
  },
)

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(401).json({
        message: "Refresh token required",
        code: "REFRESH_TOKEN_REQUIRED",
      })
    }

    // Validate token format
    if (typeof refreshToken !== "string" || refreshToken.trim() === "") {
      return res.status(401).json({
        message: "Invalid refresh token format",
        code: "INVALID_TOKEN_FORMAT",
      })
    }

    // Clean the token (remove any extra whitespace or quotes)
    const cleanToken = refreshToken.trim().replace(/^["']|["']$/g, "")

    // Verify refresh token with better error handling
    let decoded
    try {
      decoded = jwt.verify(cleanToken, process.env.JWT_REFRESH_SECRET)
    } catch (jwtError) {
      console.error("JWT verification error:", jwtError.message)
      if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({
          message: "Invalid refresh token",
          code: "INVALID_REFRESH_TOKEN",
        })
      }
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Refresh token expired",
          code: "REFRESH_TOKEN_EXPIRED",
        })
      }
      throw jwtError
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    const tokenExists = user.refreshTokens.some((rt) => rt.token === cleanToken)
    if (!tokenExists) {
      return res.status(401).json({
        message: "Invalid refresh token",
        code: "INVALID_REFRESH_TOKEN",
      })
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id)

    // Replace old refresh token with new one
    user.removeRefreshToken(cleanToken)
    user.addRefreshToken(newRefreshToken)
    await user.save()

    res.json({
      message: "Token refreshed successfully",
      token: accessToken,
      refreshToken: newRefreshToken,
    })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({
      message: "Token refresh failed",
      code: "TOKEN_REFRESH_FAILED",
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body
    const user = req.user

    // Update user online status
    user.isOnline = false
    user.lastSeen = new Date()

    // Remove refresh token if provided
    if (refreshToken) {
      user.removeRefreshToken(refreshToken)
    }

    await user.save()

    res.json({
      message: "Logout successful",
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      message: "Logout failed",
      code: "LOGOUT_FAILED",
    })
  }
})

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  "/forgot-password",
  passwordResetLimiter,
  [body("email").isEmail().normalizeEmail().withMessage("Please provide a valid email"), handleValidationErrors],
  async (req, res) => {
    try {
      const { email } = req.body

      const user = await User.findByEmail(email)
      if (!user) {
        // Don't reveal if user exists or not
        return res.json({
          message: "If an account with that email exists, we've sent a password reset link",
        })
      }

      // Generate reset token
      const resetToken = user.createPasswordResetToken()
      await user.save({ validateBeforeSave: false })

      const emailResult = await sendPasswordResetEmail(user.email, user.name, resetToken)

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error)
        // Don't reveal the error to the user
      }

      res.json({
        message: "If an account with that email exists, we've sent a password reset link",
        // Remove this in production
        ...(process.env.NODE_ENV === "development" && { resetToken }),
      })
    } catch (error) {
      console.error("Forgot password error:", error)
      res.status(500).json({
        message: "Failed to process password reset request",
        code: "PASSWORD_RESET_FAILED",
      })
    }
  },
)

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post(
  "/reset-password",
  [
    body("token").notEmpty().withMessage("Reset token is required"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { token, password } = req.body

      // Hash the token to compare with stored hash
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex")

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      })

      if (!user) {
        return res.status(400).json({
          message: "Invalid or expired reset token",
          code: "INVALID_RESET_TOKEN",
        })
      }

      // Update password
      user.password = password
      user.passwordResetToken = undefined
      user.passwordResetExpires = undefined

      // Clear all refresh tokens for security
      user.refreshTokens = []

      await user.save()

      res.json({
        message: "Password reset successful",
      })
    } catch (error) {
      console.error("Reset password error:", error)
      res.status(500).json({
        message: "Password reset failed",
        code: "PASSWORD_RESET_FAILED",
      })
    }
  },
)

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user,
    })
  } catch (error) {
    console.error("Get current user error:", error)
    res.status(500).json({
      message: "Failed to get user information",
      code: "GET_USER_FAILED",
    })
  }
})

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put(
  "/change-password",
  authenticateToken,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage(
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      ),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body
      const userId = req.user.id

      // Get user with password
      const user = await User.findById(userId).select("+password")
      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        })
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword)
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          message: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD",
        })
      }

      // Update password
      user.password = newPassword
      user.lastPasswordChange = new Date()

      // Clear all refresh tokens for security
      user.refreshTokens = []

      await user.save()

      res.json({
        message: "Password changed successfully",
      })
    } catch (error) {
      console.error("Change password error:", error)
      res.status(500).json({
        message: "Password change failed",
        code: "PASSWORD_CHANGE_FAILED",
      })
    }
  },
)

module.exports = router



