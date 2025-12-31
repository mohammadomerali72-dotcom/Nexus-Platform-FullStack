const express = require("express")
const User = require("../models/User")
const { requireRole, requireOwnership } = require("../middleware/auth")
const { validateObjectId, handleValidationErrors } = require("../middleware/validation")
const { body, query } = require("express-validator")
const multer = require("multer")
const { cloudinary } = require("../config/cloudinary")

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Private
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100"),
    query("role").optional().isIn(["entrepreneur", "investor"]).withMessage("Role must be entrepreneur or investor"),
    query("search").optional().isLength({ min: 1, max: 100 }).withMessage("Search term must be 1-100 characters"),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const { role, search, location, industry } = req.query

      // Build filter object
      const filter = {}

      if (role) {
        filter.role = role
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { bio: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ]
      }

      if (location) {
        filter.location = { $regex: location, $options: "i" }
      }

      // Get total count for pagination
      const total = await User.countDocuments(filter)

      // Get users with pagination
      const users = await User.find(filter)
        .select("-refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      res.json({
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get users error:", error)
      res.status(500).json({
        message: "Failed to fetch users",
        code: "FETCH_USERS_FAILED",
      })
    }
  },
)

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get("/:id", validateObjectId("id"), async (req, res) => {
  try {
    const userId = req.params.id
    if (!userId || userId === "undefined" || userId === "null") {
      return res.status(400).json({
        message: "Invalid user ID provided",
        code: "INVALID_USER_ID",
      })
    }

    const user = await User.findById(userId)
      .select("-refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires")
      .lean()

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    res.json({ user })
  } catch (error) {
    console.error("Get user error:", error)
    res.status(500).json({
      message: "Failed to fetch user",
      code: "FETCH_USER_FAILED",
    })
  }
})

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (Own profile only)
router.put(
  "/:id",
  validateObjectId("id"),
  requireOwnership("id"),
  [
    body("email").optional().isEmail().normalizeEmail().withMessage("Please provide a valid email"),
    body("name").optional().trim().isLength({ min: 2, max: 50 }).withMessage("Name must be 2-50 characters"),
    body("bio").optional().trim().isLength({ max: 500 }).withMessage("Bio cannot exceed 500 characters"),
    body("location").optional().trim().isLength({ max: 100 }).withMessage("Location cannot exceed 100 characters"),
    body("website")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/.+/.test(value)) {
          throw new Error("Website must be a valid URL")
        }
        return true
      }),
    body("linkedin")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(www\.)?linkedin\.com\//.test(value)) {
          throw new Error("LinkedIn must be a valid LinkedIn URL")
        }
        return true
      }),
    body("twitter")
      .optional()
      .custom((value) => {
        if (value && !/^https?:\/\/(www\.)?twitter\.com\//.test(value)) {
          throw new Error("Twitter must be a valid Twitter URL")
        }
        return true
      }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const { name, email, bio, location, website, linkedin, twitter } = req.body

      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (email !== undefined) updateData.email = email
      if (bio !== undefined) updateData.bio = bio
      if (location !== undefined) updateData.location = location
      if (website !== undefined) updateData.website = website
      if (linkedin !== undefined) updateData.linkedin = linkedin
      if (twitter !== undefined) updateData.twitter = twitter

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires")

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          code: "USER_NOT_FOUND",
        })
      }

      res.json({
        message: "Profile updated successfully",
        user,
      })
    } catch (error) {
      console.error("Update user error:", error)
      res.status(500).json({
        message: "Failed to update profile",
        code: "UPDATE_PROFILE_FAILED",
      })
    }
  },
)

// @route   POST /api/users/:id/avatar
// @desc    Upload user avatar
// @access  Private (Own profile only)
router.post(
  "/:id/avatar",
  validateObjectId("id"),
  requireOwnership("id"),
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No image file provided",
          code: "NO_FILE_PROVIDED",
        })
      }

      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "nexus/avatars",
            public_id: `user_${req.params.id}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: "fill", gravity: "face" },
              { quality: "auto", fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error)
            else resolve(result)
          },
        )
        uploadStream.end(req.file.buffer)
      })

      // Update user avatar URL
      const user = await User.findByIdAndUpdate(req.params.id, { avatarUrl: result.secure_url }, { new: true }).select(
        "-refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires",
      )

      res.json({
        message: "Avatar uploaded successfully",
        user,
        avatarUrl: result.secure_url,
      })
    } catch (error) {
      console.error("Avatar upload error:", error)
      res.status(500).json({
        message: "Failed to upload avatar",
        code: "AVATAR_UPLOAD_FAILED",
      })
    }
  },
)

// @route   DELETE /api/users/:id
// @desc    Delete user account
// @access  Private (Own account only)
router.delete("/:id", validateObjectId("id"), requireOwnership("id"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    // In a real application, you might want to:
    // 1. Archive the user instead of deleting
    // 2. Clean up related data (messages, collaborations, etc.)
    // 3. Send confirmation email

    await User.findByIdAndDelete(req.params.id)

    res.json({
      message: "Account deleted successfully",
    })
  } catch (error) {
    console.error("Delete user error:", error)
    res.status(500).json({
      message: "Failed to delete account",
      code: "DELETE_ACCOUNT_FAILED",
    })
  }
})

// @route   GET /api/users/search/entrepreneurs
// @desc    Search entrepreneurs with advanced filters
// @access  Private (Investors only)
router.get(
  "/search/entrepreneurs",
  requireRole(["investor"]),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("industry").optional().isLength({ min: 1, max: 50 }),
    query("location").optional().isLength({ min: 1, max: 100 }),
    query("fundingRange").optional().isIn(["0-50k", "50k-250k", "250k-1m", "1m+"]),
    query("teamSize").optional().isIn(["1-5", "6-20", "21-50", "50+"]),
    query("search").optional().isLength({ min: 1, max: 100 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const { industry, location, fundingRange, teamSize, search } = req.query

      // Build aggregation pipeline for entrepreneur search
      const pipeline = [
        { $match: { role: "entrepreneur" } },
        {
          $lookup: {
            from: "entrepreneurprofiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ]

      // Add filters
      const matchConditions = {}

      if (industry) {
        matchConditions["profile.industry"] = { $regex: industry, $options: "i" }
      }

      if (location) {
        matchConditions.location = { $regex: location, $options: "i" }
      }

      if (search) {
        matchConditions.$or = [
          { name: { $regex: search, $options: "i" } },
          { bio: { $regex: search, $options: "i" } },
          { "profile.startupName": { $regex: search, $options: "i" } },
          { "profile.pitchSummary": { $regex: search, $options: "i" } },
        ]
      }

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions })
      }

      // Add pagination
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            refreshTokens: 0,
            emailVerificationToken: 0,
            passwordResetToken: 0,
            passwordResetExpires: 0,
          },
        },
      )

      const entrepreneurs = await User.aggregate(pipeline)

      // Get total count
      const countPipeline = pipeline.slice(0, -3) // Remove sort, skip, limit, project
      countPipeline.push({ $count: "total" })
      const countResult = await User.aggregate(countPipeline)
      const total = countResult[0]?.total || 0

      res.json({
        entrepreneurs,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalEntrepreneurs: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Search entrepreneurs error:", error)
      res.status(500).json({
        message: "Failed to search entrepreneurs",
        code: "SEARCH_ENTREPRENEURS_FAILED",
      })
    }
  },
)

// @route   GET /api/users/search/investors
// @desc    Search investors with advanced filters
// @access  Private (Entrepreneurs only)
router.get(
  "/search/investors",
  requireRole(["entrepreneur"]),
  [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
    query("investmentStage").optional().isIn(["pre-seed", "seed", "series-a", "series-b", "series-c"]),
    query("industry").optional().isLength({ min: 1, max: 50 }),
    query("location").optional().isLength({ min: 1, max: 100 }),
    query("investmentRange").optional().isIn(["0-50k", "50k-250k", "250k-1m", "1m+"]),
    query("search").optional().isLength({ min: 1, max: 100 }),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const page = Number.parseInt(req.query.page) || 1
      const limit = Number.parseInt(req.query.limit) || 10
      const skip = (page - 1) * limit
      const { investmentStage, industry, location, investmentRange, search } = req.query

      // Build aggregation pipeline for investor search
      const pipeline = [
        { $match: { role: "investor" } },
        {
          $lookup: {
            from: "investorprofiles",
            localField: "_id",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
      ]

      // Add filters
      const matchConditions = {}

      if (investmentStage) {
        matchConditions["profile.investmentStage"] = investmentStage
      }

      if (industry) {
        matchConditions["profile.investmentInterests"] = { $regex: industry, $options: "i" }
      }

      if (location) {
        matchConditions.location = { $regex: location, $options: "i" }
      }

      if (search) {
        matchConditions.$or = [
          { name: { $regex: search, $options: "i" } },
          { bio: { $regex: search, $options: "i" } },
          { "profile.investmentInterests": { $regex: search, $options: "i" } },
        ]
      }

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions })
      }

      // Add pagination
      pipeline.push(
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            refreshTokens: 0,
            emailVerificationToken: 0,
            passwordResetToken: 0,
            passwordResetExpires: 0,
          },
        },
      )

      const investors = await User.aggregate(pipeline)

      // Get total count
      const countPipeline = pipeline.slice(0, -3)
      countPipeline.push({ $count: "total" })
      const countResult = await User.aggregate(countPipeline)
      const total = countResult[0]?.total || 0

      res.json({
        investors,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalInvestors: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Search investors error:", error)
      res.status(500).json({
        message: "Failed to search investors",
        code: "SEARCH_INVESTORS_FAILED",
      })
    }
  },
)

// @route   PUT /api/users/:id/online-status
// @desc    Update user online status
// @access  Private (Own profile only)
router.put("/:id/online-status", validateObjectId("id"), requireOwnership("id"), async (req, res) => {
  try {
    const { isOnline } = req.body

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isOnline: Boolean(isOnline),
        lastSeen: new Date(),
      },
      { new: true },
    ).select("-refreshTokens -emailVerificationToken -passwordResetToken -passwordResetExpires")

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    res.json({
      message: "Online status updated",
      user,
    })
  } catch (error) {
    console.error("Update online status error:", error)
    res.status(500).json({
      message: "Failed to update online status",
      code: "UPDATE_STATUS_FAILED",
    })
  }
})

module.exports = router


