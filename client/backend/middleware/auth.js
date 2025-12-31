const jwt = require("jsonwebtoken")
const User = require("../models/User")

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"]
    const rawToken = authHeader && authHeader.split(" ")[1] // Bearer TOKEN

    if (!rawToken) {
      return res.status(401).json({
        message: "Access token required",
        code: "TOKEN_REQUIRED",
      })
    }

    const token = rawToken.trim().replace(/^["']|["']$/g, "")

    // Basic JWT format validation
    const parts = token.split(".")
    if (parts.length !== 3) {
      console.error("Malformed JWT token received:", {
        originalLength: rawToken.length,
        cleanedLength: token.length,
        parts: parts.length,
      })
      return res.status(401).json({
        message: "Malformed token format",
        code: "TOKEN_MALFORMED",
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Get user from database to ensure they still exist
    const user = await User.findById(decoded.userId).select("-password")
    if (!user) {
      return res.status(401).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    req.user = user
    next()
  } catch (error) {
    console.error("JWT verification error:", {
      name: error.name,
      message: error.message,
      tokenLength: req.headers["authorization"]?.split(" ")[1]?.length || 0,
    })

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      })
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Invalid token format",
        code: "TOKEN_INVALID",
      })
    }

    return res.status(500).json({
      message: "Token verification failed",
      code: "TOKEN_VERIFICATION_FAILED",
    })
  }
}

// Middleware to check user role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        code: "INSUFFICIENT_PERMISSIONS",
        required: roles,
        current: req.user.role,
      })
    }

    next()
  }
}

// Middleware to check if user owns resource or is admin
const requireOwnership = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField]

    if (req.user.id !== resourceUserId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied - resource ownership required",
        code: "OWNERSHIP_REQUIRED",
      })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
}
