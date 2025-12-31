const { body, param, query, validationResult } = require("express-validator")
const { validateNoSQLInjection } = require("./security")

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    })
  }
  next()
}

// Common validation rules
const validateEmail = body("email")
  .isEmail()
  .normalizeEmail()
  .withMessage("Please provide a valid email address")
  .custom((value) => {
    if (typeof value === "object") {
      throw new Error("Email cannot be an object")
    }
    if (value.includes("$") || value.includes("{")) {
      throw new Error("Email contains invalid characters")
    }
    return true
  })

const validatePassword = body("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage(
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
  )
  .custom((value) => {
    if (typeof value === "object") {
      throw new Error("Password cannot be an object")
    }
    return true
  })

const validateName = body("name")
  .trim()
  .isLength({ min: 2, max: 50 })
  .withMessage("Name must be between 2 and 50 characters")
  .matches(/^[a-zA-Z\s]+$/)
  .withMessage("Name can only contain letters and spaces")

const validateRole = body("role")
  .isIn(["entrepreneur", "investor"])
  .withMessage("Role must be either entrepreneur or investor")

const validateObjectId = (field) => param(field).isMongoId().withMessage(`Invalid ${field} format`)

// Registration validation
const validateRegistration = [
  validateName,
  validateEmail,
  validatePassword,
  validateRole,
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match")
    }
    return true
  }),
  handleValidationErrors,
]

// Login validation
const validateLogin = [
  validateEmail,
  body("password").notEmpty().withMessage("Password is required"),
  validateRole,
  handleValidationErrors,
]

// Profile update validation
const validateProfileUpdate = [
  body("name").optional().trim().isLength({ min: 2, max: 50 }),
  body("bio").optional().trim().isLength({ max: 500 }),
  body("location").optional().trim().isLength({ max: 100 }),
  body("website").optional().isURL(),
  body("linkedin").optional().isURL(),
  body("twitter").optional().isURL(),
  handleValidationErrors,
]

// Entrepreneur profile validation
const validateEntrepreneurProfile = [
  body("startupName").trim().isLength({ min: 2, max: 100 }),
  body("industry").trim().isLength({ min: 2, max: 50 }),
  body("foundedYear").isInt({ min: 1900, max: new Date().getFullYear() }),
  body("teamSize").isInt({ min: 1, max: 10000 }),
  body("fundingNeeded").trim().isLength({ min: 1, max: 50 }),
  body("pitchSummary").trim().isLength({ min: 10, max: 1000 }),
  handleValidationErrors,
]

// Investor profile validation
const validateInvestorProfile = [
  body("investmentInterests").isArray({ min: 1 }),
  body("investmentStage").isArray({ min: 1 }),
  body("minimumInvestment").trim().isLength({ min: 1, max: 50 }),
  body("maximumInvestment").trim().isLength({ min: 1, max: 50 }),
  body("portfolioCompanies").optional().isArray(),
  handleValidationErrors,
]

// OTP validation
const validateOTP = [
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers")
    .custom((value) => {
      if (typeof value === "object") {
        throw new Error("OTP cannot be an object")
      }
      return true
    }),
  handleValidationErrors,
]

module.exports = {
  handleValidationErrors,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateEntrepreneurProfile,
  validateInvestorProfile,
  validateObjectId,
  validateOTP,
  validateEmail,
  validatePassword,
  validateName,
  validateRole,
}

