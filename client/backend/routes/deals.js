const express = require("express")
const { body, query, validationResult } = require("express-validator")
const Deal = require("../models/Deal")
const { authenticateToken } = require("../middleware/auth") // Import the auth middleware

const router = express.Router()

// Apply authentication middleware to all deal routes
router.use(authenticateToken)

// GET /api/deals?search=&status=Due%20Diligence,Term%20Sheet
router.get("/", [query("search").optional().isString(), query("status").optional().isString()], async (req, res) => {
  try {
    // Use req.user._id (MongoDB document) instead of req.user.userId
    const investorId = req.user._id
    const { search = "", status = "" } = req.query

    const match = { investorId }

    if (search) {
      const s = String(search)
      match.$or = [
        { "startup.name": { $regex: s, $options: "i" } },
        { "startup.industry": { $regex: s, $options: "i" } },
      ]
    }

    if (status) {
      const statuses = String(status)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
      if (statuses.length) match.status = { $in: statuses }
    }

    const deals = await Deal.find(match).sort({ lastActivity: -1 })
    res.json({ deals })
  } catch (err) {
    console.error("[deals] list error:", err)
    res.status(500).json({ message: "Failed to load deals" })
  }
})

// POST /api/deals (create)
router.post(
  "/",
  [
    body("startup.name").trim().isLength({ min: 1, max: 140 }),
    body("startup.logo").optional().isURL().isLength({ max: 1024 }),
    body("startup.industry").optional().isLength({ max: 100 }),
    body("amount").trim().isLength({ min: 1, max: 50 }),
    body("equity").trim().isLength({ min: 1, max: 20 }),
    body("status").optional().isIn(["Due Diligence", "Term Sheet", "Negotiation", "Closed", "Passed"]),
    body("stage").optional().isLength({ max: 50 }),
    body("lastActivity").optional().isISO8601(),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() })
    }

    try {
      // Use req.user._id (MongoDB document) instead of req.user.userId
      const investorId = req.user._id
      const payload = {
        ...req.body,
        investorId,
        lastActivity: req.body.lastActivity ? new Date(req.body.lastActivity) : new Date(),
      }
      const deal = await Deal.create(payload)
      res.status(201).json({ message: "Deal created", deal })
    } catch (err) {
      console.error("[deals] create error:", err)
      res.status(500).json({ message: "Failed to create deal" })
    }
  },
)

module.exports = router
