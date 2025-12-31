const errorHandler = (err, req, res, next) => {
  console.error("Error:", err)

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }))

    return res.status(400).json({
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      errors,
    })
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({
      message: `${field} already exists`,
      code: "DUPLICATE_ERROR",
      field,
    })
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "Invalid ID format",
      code: "INVALID_ID",
    })
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      message: "Invalid token",
      code: "INVALID_TOKEN",
    })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      message: "Token expired",
      code: "TOKEN_EXPIRED",
    })
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      message: "File too large",
      code: "FILE_TOO_LARGE",
    })
  }

  // Default server error
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
}

module.exports = errorHandler
