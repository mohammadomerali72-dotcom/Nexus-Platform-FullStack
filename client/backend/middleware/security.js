const mongoSanitize = require("express-mongo-sanitize")
const { body, validationResult } = require("express-validator")
const rateLimit = require("express-rate-limit")

// Sanitize user input to prevent NoSQL injection
const sanitizeInput = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] Sanitized key: ${key} in request from ${req.ip}`)
  },
})

// XSS protection - sanitize HTML input
const xssProtection = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === "string") {
      // Remove script tags and event handlers
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/on\w+\s*=\s*[^\s>]*/gi, "")
    }
    return value
  }

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (Array.isArray(obj[key])) {
          obj[key] = obj[key].map((item) => (typeof item === "object" ? sanitizeObject(item) : sanitizeValue(item)))
        } else if (typeof obj[key] === "object") {
          obj[key] = sanitizeObject(obj[key])
        } else {
          obj[key] = sanitizeValue(obj[key])
        }
      }
    }
    return obj
  }

  req.body = sanitizeObject(req.body)
  req.query = sanitizeObject(req.query)
  req.params = sanitizeObject(req.params)

  next()
}

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    message: "Too many authentication attempts, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
})

// Rate limiting for OTP requests
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 OTP requests per windowMs
  message: {
    message: "Too many OTP requests, please try again later",
    code: "OTP_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    message: "Too many password reset attempts, please try again later",
    code: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many requests, please try again later",
    code: "API_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict rate limiter for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per hour
  message: {
    message: "Too many requests for this operation, please try again later",
    code: "STRICT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// CSRF token validation middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next()
  }

  // Skip CSRF for API endpoints (using JWT authentication)
  // In production, you might want to implement CSRF tokens for state-changing operations
  // For now, we rely on JWT tokens and SameSite cookies
  next()
}

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY")

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff")

  // Enable XSS filter
  res.setHeader("X-XSS-Protection", "1; mode=block")

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions policy
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

  next()
}

// Input validation helpers
const validateNoSQLInjection = (field) => {
  return body(field).custom((value) => {
    if (typeof value === "object") {
      throw new Error(`${field} cannot be an object`)
    }
    if (typeof value === "string" && (value.includes("$") || value.includes("{"))) {
      throw new Error(`${field} contains invalid characters`)
    }
    return true
  })
}

module.exports = {
  sanitizeInput,
  xssProtection,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  apiLimiter,
  strictLimiter,
  csrfProtection,
  securityHeaders,
  validateNoSQLInjection,
}
