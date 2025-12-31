const express = require("express")
const EntrepreneurProfile = require("../models/EntrepreneurProfile")
const InvestorProfile = require("../models/InvestorProfile")
const User = require("../models/User")
const { requireRole, requireOwnership } = require("../middleware/auth")
const { validateEntrepreneurProfile, validateInvestorProfile, validateObjectId } = require("../middleware/validation")
const { body } = require("express-validator")
const multer = require("multer")
const { uploadImage } = require("../config/cloudinary")

const router = express.Router()

// Configure multer for document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error("Invalid file type. Only PDF, Word, PowerPoint, and image files are allowed"), false)
    }
  },
})

// Helper to normalize investmentStage input to match model enums
const normalizeInvestmentStages = (stages) => {
  if (!Array.isArray(stages)) return []
  const allowed = new Set(["pre-seed", "seed", "series-a", "series-b", "series-c", "series-d", "ipo"])
  // normalize: trim -> lower -> replace spaces/underscores with hyphens
  const normalized = stages
    .map((s) => (typeof s === "string" ? s : String(s)))
    .map((s) =>
      s
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-"),
    )
    .filter((s) => !!s && allowed.has(s))

  // dedupe
  return Array.from(new Set(normalized))
}

// @route   POST /api/profiles/entrepreneur
// @desc    Create entrepreneur profile
// @access  Private (Entrepreneurs only)
router.post("/entrepreneur", requireRole(["entrepreneur"]), validateEntrepreneurProfile, async (req, res) => {
  try {
    // Check if profile already exists
    const existingProfile = await EntrepreneurProfile.findOne({ userId: req.user.id })
    if (existingProfile) {
      return res.status(400).json({
        message: "Entrepreneur profile already exists",
        code: "PROFILE_EXISTS",
      })
    }

    const profileData = {
      userId: req.user.id,
      ...req.body,
    }

    const profile = new EntrepreneurProfile(profileData)
    await profile.save()

    // Populate user data
    await profile.populate("userId", "name email avatarUrl")

    res.status(201).json({
      message: "Entrepreneur profile created successfully",
      profile,
    })
  } catch (error) {
    console.error("Create entrepreneur profile error:", error)
    res.status(500).json({
      message: "Failed to create entrepreneur profile",
      code: "CREATE_PROFILE_FAILED",
    })
  }
})

// @route   POST /api/profiles/investor
// @desc    Create investor profile
// @access  Private (Investors only)
router.post("/investor", requireRole(["investor"]), validateInvestorProfile, async (req, res) => {
  try {
    // Normalize incoming investmentStage values to match enum
    if (req.body.investmentStage) {
      req.body.investmentStage = normalizeInvestmentStages(req.body.investmentStage)
      if (!req.body.investmentStage.length) {
        return res.status(400).json({
          message:
            "Invalid investment stage values. Allowed: pre-seed, seed, series-a, series-b, series-c, series-d, ipo",
          code: "INVALID_INVESTMENT_STAGE",
        })
      }
    }

    // Check if profile already exists
    const existingProfile = await InvestorProfile.findOne({ userId: req.user.id })
    if (existingProfile) {
      return res.status(400).json({
        message: "Investor profile already exists",
        code: "PROFILE_EXISTS",
      })
    }

    const profileData = {
      userId: req.user.id,
      ...req.body,
    }

    const profile = new InvestorProfile(profileData)
    await profile.save()

    // Populate user data
    await profile.populate("userId", "name email avatarUrl")

    res.status(201).json({
      message: "Investor profile created successfully",
      profile,
    })
  } catch (error) {
    console.error("Create investor profile error:", error)
    res.status(500).json({
      message: "Failed to create investor profile",
      code: "CREATE_PROFILE_FAILED",
    })
  }
})

// @route   GET /api/profiles/entrepreneur/:userId
// @desc    Get entrepreneur profile by user ID
// @access  Private
router.get("/entrepreneur/:userId", validateObjectId("userId"), async (req, res) => {
  try {
    const profile = await EntrepreneurProfile.findOne({ userId: req.params.userId }).populate(
      "userId",
      "name email avatarUrl bio location isOnline lastSeen",
    )

    if (!profile) {
      return res.status(404).json({
        message: "Entrepreneur profile not found",
        code: "PROFILE_NOT_FOUND",
      })
    }

    // Return public profile if not the owner
    const isOwner = req.user.id === req.params.userId
    const profileData = isOwner ? profile : profile.getPublicProfile()

    res.json({ profile: profileData })
  } catch (error) {
    console.error("Get entrepreneur profile error:", error)
    res.status(500).json({
      message: "Failed to fetch entrepreneur profile",
      code: "FETCH_PROFILE_FAILED",
    })
  }
})

// @route   GET /api/profiles/investor/:userId
// @desc    Get investor profile by user ID
// @access  Private
router.get("/investor/:userId", validateObjectId("userId"), async (req, res) => {
  try {
    const profile = await InvestorProfile.findOne({ userId: req.params.userId }).populate(
      "userId",
      "name email avatarUrl bio location isOnline lastSeen",
    )

    if (!profile) {
      return res.status(404).json({
        message: "Investor profile not found",
        code: "PROFILE_NOT_FOUND",
      })
    }

    // Return public profile if not the owner
    const isOwner = req.user.id === req.params.userId
    const profileData = isOwner ? profile : profile.getPublicProfile()

    res.json({ profile: profileData })
  } catch (error) {
    console.error("Get investor profile error:", error)
    res.status(500).json({
      message: "Failed to fetch investor profile",
      code: "FETCH_PROFILE_FAILED",
    })
  }
})

// @route   PUT /api/profiles/entrepreneur/:userId
// @desc    Update entrepreneur profile
// @access  Private (Owner only)
router.put(
  "/entrepreneur/:userId",
  validateObjectId("userId"),
  requireOwnership("userId"),
  requireRole(["entrepreneur"]),
  async (req, res) => {
    try {
      const profile = await EntrepreneurProfile.findOneAndUpdate(
        { userId: req.params.userId },
        { $set: req.body, $setOnInsert: { userId: req.params.userId } },
        {
          new: true,
          runValidators: true,
          upsert: true,
        },
      ).populate("userId", "name email avatarUrl")

      res.json({
        message: "Entrepreneur profile updated successfully",
        profile,
      })
    } catch (error) {
      console.error("Update entrepreneur profile error:", error)
      res.status(500).json({
        message: "Failed to update entrepreneur profile",
        code: "UPDATE_PROFILE_FAILED",
      })
    }
  },
)

// @route   PUT /api/profiles/investor/:userId
// @desc    Update investor profile
// @access  Private (Owner only)
router.put(
  "/investor/:userId",
  validateObjectId("userId"),
  requireOwnership("userId"),
  requireRole(["investor"]),
  async (req, res) => {
    try {
      // Normalize incoming investmentStage values to match enum
      if (req.body.investmentStage) {
        req.body.investmentStage = normalizeInvestmentStages(req.body.investmentStage)
        if (!req.body.investmentStage.length) {
          return res.status(400).json({
            message:
              "Invalid investment stage values. Allowed: pre-seed, seed, series-a, series-b, series-c, series-d, ipo",
            code: "INVALID_INVESTMENT_STAGE",
          })
        }
      }

      const profile = await InvestorProfile.findOneAndUpdate(
        { userId: req.params.userId },
        { $set: req.body, $setOnInsert: { userId: req.params.userId } },
        {
          new: true,
          runValidators: true,
          upsert: true,
        },
      ).populate("userId", "name email avatarUrl")

      res.json({
        message: "Investor profile updated successfully",
        profile,
      })
    } catch (error) {
      console.error("Update investor profile error:", error)
      res.status(500).json({
        message: "Failed to update investor profile",
        code: "UPDATE_PROFILE_FAILED",
      })
    }
  },
)

// @route   POST /api/profiles/entrepreneur/:userId/documents
// @desc    Upload document to entrepreneur profile
// @access  Private (Owner only)
router.post(
  "/entrepreneur/:userId/documents",
  validateObjectId("userId"),
  requireOwnership("userId"),
  requireRole(["entrepreneur"]),
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No document file provided",
          code: "NO_FILE_PROVIDED",
        })
      }

      const { name, type, isPublic = false } = req.body

      // Upload to Cloudinary
      const result = await uploadImage(req.file.buffer, {
        folder: "nexus/documents",
        public_id: `entrepreneur_${req.params.userId}_${Date.now()}`,
        resource_type: "auto",
      })

      const document = {
        name: name || req.file.originalname,
        type: type || "other",
        url: result.secure_url,
        isPublic: Boolean(isPublic),
      }

      const profile = await EntrepreneurProfile.findOneAndUpdate(
        { userId: req.params.userId },
        { $push: { documents: document } },
        { new: true },
      )

      if (!profile) {
        return res.status(404).json({
          message: "Entrepreneur profile not found",
          code: "PROFILE_NOT_FOUND",
        })
      }

      res.json({
        message: "Document uploaded successfully",
        document: profile.documents[profile.documents.length - 1],
      })
    } catch (error) {
      console.error("Upload document error:", error)
      res.status(500).json({
        message: "Failed to upload document",
        code: "DOCUMENT_UPLOAD_FAILED",
      })
    }
  },
)

// @route   DELETE /api/profiles/entrepreneur/:userId/documents/:documentId
// @desc    Delete document from entrepreneur profile
// @access  Private (Owner only)
router.delete(
  "/entrepreneur/:userId/documents/:documentId",
  validateObjectId("userId"),
  validateObjectId("documentId"),
  requireOwnership("userId"),
  requireRole(["entrepreneur"]),
  async (req, res) => {
    try {
      const profile = await EntrepreneurProfile.findOneAndUpdate(
        { userId: req.params.userId },
        { $pull: { documents: { _id: req.params.documentId } } },
        { new: true },
      )

      if (!profile) {
        return res.status(404).json({
          message: "Entrepreneur profile not found",
          code: "PROFILE_NOT_FOUND",
        })
      }

      res.json({
        message: "Document deleted successfully",
      })
    } catch (error) {
      console.error("Delete document error:", error)
      res.status(500).json({
        message: "Failed to delete document",
        code: "DOCUMENT_DELETE_FAILED",
      })
    }
  },
)

// @route   POST /api/profiles/investor/:userId/portfolio
// @desc    Add portfolio company to investor profile
// @access  Private (Owner only)
router.post(
  "/investor/:userId/portfolio",
  validateObjectId("userId"),
  requireOwnership("userId"),
  requireRole(["investor"]),
  [
    body("name")
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Company name is required and must be 1-100 characters"),
    body("industry").optional().trim().isLength({ max: 50 }),
    body("investmentAmount").optional().trim().isLength({ max: 50 }),
    body("investmentDate").optional().isISO8601(),
    body("currentStatus").optional().isIn(["active", "exited", "failed", "acquired"]),
    body("description").optional().trim().isLength({ max: 300 }),
    body("website").optional().isURL(),
    body("isPublic").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const portfolioCompany = req.body

      const profile = await InvestorProfile.findOneAndUpdate(
        { userId: req.params.userId },
        {
          $push: { portfolioCompanies: portfolioCompany },
          $inc: { totalInvestments: 1 },
        },
        { new: true },
      )

      if (!profile) {
        return res.status(404).json({
          message: "Investor profile not found",
          code: "PROFILE_NOT_FOUND",
        })
      }

      res.json({
        message: "Portfolio company added successfully",
        portfolioCompany: profile.portfolioCompanies[profile.portfolioCompanies.length - 1],
      })
    } catch (error) {
      console.error("Add portfolio company error:", error)
      res.status(500).json({
        message: "Failed to add portfolio company",
        code: "ADD_PORTFOLIO_FAILED",
      })
    }
  },
)

// @route   GET /api/profiles/stats
// @desc    Get profile statistics
// @access  Private
router.get("/stats", async (req, res) => {
  try {
    const [entrepreneurCount, investorCount, totalProfiles] = await Promise.all([
      EntrepreneurProfile.countDocuments({ isPublic: true }),
      InvestorProfile.countDocuments({ isPublic: true }),
      User.countDocuments(),
    ])

    const stats = {
      totalProfiles,
      entrepreneurs: entrepreneurCount,
      investors: investorCount,
      profileCompletionRate: Math.round(((entrepreneurCount + investorCount) / totalProfiles) * 100),
    }

    res.json({ stats })
  } catch (error) {
    console.error("Get profile stats error:", error)
    res.status(500).json({
      message: "Failed to fetch profile statistics",
      code: "FETCH_STATS_FAILED",
    })
  }
})

module.exports = router



