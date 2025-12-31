const express = require("express")
const CollaborationRequest = require("../models/CollaborationRequest")
const User = require("../models/User")
const { requireRole } = require("../middleware/auth")
const { validateObjectId } = require("../middleware/validation")
const { body, query } = require("express-validator")
const NotificationService = require("../services/notificationService")

const router = express.Router()

// @route   POST /api/collaborations/request
// @desc    Create collaboration request
// @access  Private
router.post(
  "/request",
  [
    body("entrepreneurId").isMongoId().withMessage("Valid entrepreneur ID is required"),
    body("requestType").isIn(["investment", "mentorship", "partnership", "advisory"]),
    body("message").trim().isLength({ min: 10, max: 1000 }),
    body("proposedAmount").optional().trim().isLength({ max: 50 }),
    body("proposedTerms").optional().trim().isLength({ max: 500 }),
  ],
  async (req, res) => {
    try {
      const { entrepreneurId, requestType, message, proposedAmount, proposedTerms } = req.body
      const investorId = req.user.id

      // Check if entrepreneur exists
      const entrepreneur = await User.findById(entrepreneurId)
      if (!entrepreneur || entrepreneur.role !== "entrepreneur") {
        return res.status(404).json({
          message: "Entrepreneur not found",
          code: "ENTREPRENEUR_NOT_FOUND",
        })
      }

      // Check for existing pending request
      const existingRequest = await CollaborationRequest.findOne({
        investorId,
        entrepreneurId,
        status: "pending",
      })

      if (existingRequest) {
        return res.status(400).json({
          message: "You already have a pending request with this entrepreneur",
          code: "REQUEST_EXISTS",
        })
      }

      const collaborationRequest = new CollaborationRequest({
        investorId,
        entrepreneurId,
        requestType,
        message,
        proposedAmount,
        proposedTerms,
      })

      await collaborationRequest.save()

      // Populate user data
      await collaborationRequest.populate("investorId", "name email avatarUrl")
      await collaborationRequest.populate("entrepreneurId", "name email avatarUrl")

      try {
        await NotificationService.createCollaborationRequestNotification(
          investorId,
          entrepreneurId,
          collaborationRequest._id,
          requestType,
        )
      } catch (notificationError) {
        console.error("Failed to create collaboration request notification:", notificationError)
        // Don't fail the request creation if notification fails
      }

      res.status(201).json({
        message: "Collaboration request sent successfully",
        request: collaborationRequest,
      })
    } catch (error) {
      console.error("Create collaboration request error:", error)
      res.status(500).json({
        message: "Failed to create collaboration request",
        code: "CREATE_REQUEST_FAILED",
      })
    }
  },
)

// @route   GET /api/collaborations/requests
// @desc    Get collaboration requests for current user
// @access  Private
router.get(
  "/requests",
  [
    query("status").optional().isIn(["pending", "accepted", "rejected", "withdrawn", "expired"]),
    query("type").optional().isIn(["sent", "received"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    try {
      const userId = req.user.id
      const userRole = req.user.role
      const { status, type, page = 1, limit = 10 } = req.query
      const skip = (page - 1) * limit

      // Build query
      const query = {}

      if (status) {
        query.status = status
      }

      // Determine request direction
      if (type === "sent") {
        if (userRole === "investor") {
          query.investorId = userId
        } else {
          query.entrepreneurId = userId
        }
      } else if (type === "received") {
        if (userRole === "investor") {
          query.investorId = userId
        } else {
          query.entrepreneurId = userId
        }
      } else {
        // Both sent and received
        query.$or = [{ investorId: userId }, { entrepreneurId: userId }]
      }

      const requests = await CollaborationRequest.find(query)
        .populate("investorId", "name email avatarUrl role")
        .populate("entrepreneurId", "name email avatarUrl role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))

      const total = await CollaborationRequest.countDocuments(query)

      // Ensure consistent response format
      res.json({
        requests, // This is the key the frontend expects
        data: requests, // Alternative key for compatibility
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRequests: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      })
    } catch (error) {
      console.error("Get collaboration requests error:", error)
      res.status(500).json({
        message: "Failed to fetch collaboration requests",
        code: "FETCH_REQUESTS_FAILED",
      })
    }
  },
)

// @route   PUT /api/collaborations/requests/:requestId/accept
// @desc    Accept collaboration request
// @access  Private (Entrepreneurs only)
router.put(
  "/requests/:requestId/accept",
  validateObjectId("requestId"),
  requireRole(["entrepreneur"]),
  [body("responseMessage").optional().trim().isLength({ max: 1000 })],
  async (req, res) => {
    try {
      const { responseMessage } = req.body
      const request = await CollaborationRequest.findById(req.params.requestId)

      if (!request) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        })
      }

      // Check if user is the entrepreneur in this request
      if (request.entrepreneurId.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to accept this request",
          code: "NOT_AUTHORIZED",
        })
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          message: "Request is no longer pending",
          code: "REQUEST_NOT_PENDING",
        })
      }

      await request.accept(responseMessage)

      // Populate user data
      await request.populate("investorId", "name email avatarUrl")
      await request.populate("entrepreneurId", "name email avatarUrl")

      try {
        await NotificationService.createConnectionNotification(req.user.id, request.investorId, "accepted")
      } catch (notificationError) {
        console.error("Failed to create acceptance notification:", notificationError)
      }

      res.json({
        message: "Collaboration request accepted",
        request,
      })
    } catch (error) {
      console.error("Accept collaboration request error:", error)
      res.status(500).json({
        message: "Failed to accept collaboration request",
        code: "ACCEPT_REQUEST_FAILED",
      })
    }
  },
)

// @route   PUT /api/collaborations/requests/:requestId/reject
// @desc    Reject collaboration request
// @access  Private (Entrepreneurs only)
router.put(
  "/requests/:requestId/reject",
  validateObjectId("requestId"),
  requireRole(["entrepreneur"]),
  [body("responseMessage").optional().trim().isLength({ max: 1000 })],
  async (req, res) => {
    try {
      const { responseMessage } = req.body
      const request = await CollaborationRequest.findById(req.params.requestId)

      if (!request) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        })
      }

      // Check if user is the entrepreneur in this request
      if (request.entrepreneurId.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to reject this request",
          code: "NOT_AUTHORIZED",
        })
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          message: "Request is no longer pending",
          code: "REQUEST_NOT_PENDING",
        })
      }

      await request.reject(responseMessage)

      // Populate user data
      await request.populate("investorId", "name email avatarUrl")
      await request.populate("entrepreneurId", "name email avatarUrl")

      try {
        await NotificationService.createConnectionNotification(req.user.id, request.investorId, "rejected")
      } catch (notificationError) {
        console.error("Failed to create rejection notification:", notificationError)
      }

      res.json({
        message: "Collaboration request rejected",
        request,
      })
    } catch (error) {
      console.error("Reject collaboration request error:", error)
      res.status(500).json({
        message: "Failed to reject collaboration request",
        code: "REJECT_REQUEST_FAILED",
      })
    }
  },
)

// @route   POST /api/collaborations/requests/:requestId/schedule-meeting
// @desc    Schedule a meeting for a collaboration request
// @access  Private
router.post(
  "/requests/:requestId/schedule-meeting",
  validateObjectId("requestId"),
  [
    body("scheduledFor").isISO8601().withMessage("Valid date is required"),
    body("duration").isInt({ min: 15, max: 480 }).withMessage("Duration must be between 15 and 480 minutes"),
    body("location").optional().trim().isLength({ max: 200 }),
    body("meetingLink").optional().trim().isURL().withMessage("Valid URL is required"),
    body("agenda").optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const { scheduledFor, duration, location, meetingLink, agenda } = req.body
      const request = await CollaborationRequest.findById(req.params.requestId)

      if (!request) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        })
      }

      // Check if user is part of this collaboration
      const userId = req.user._id.toString()
      const isInvestor = request.investorId.toString() === userId
      const isEntrepreneur = request.entrepreneurId.toString() === userId

      if (!isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to schedule meeting for this request",
          code: "NOT_AUTHORIZED",
        })
      }

      // Check if collaboration is accepted
      if (request.status !== "accepted") {
        return res.status(400).json({
          message: "Can only schedule meetings for accepted collaborations",
          code: "COLLABORATION_NOT_ACCEPTED",
        })
      }

      // Check for meeting conflicts
      const conflicts = await CollaborationRequest.checkMeetingConflict(
        userId,
        scheduledFor,
        duration,
        req.params.requestId,
      )

      if (conflicts.length > 0) {
        return res.status(409).json({
          message: "Meeting time conflicts with existing meetings",
          code: "MEETING_CONFLICT",
          conflicts: conflicts.map((c) => ({
            id: c._id,
            scheduledFor: c.meetingDetails.scheduledFor,
            duration: c.meetingDetails.duration,
          })),
        })
      }

      // Schedule the meeting
      await request.scheduleMeeting(
        {
          scheduledFor,
          duration,
          location,
          meetingLink,
          agenda,
        },
        req.user._id,
      )

      // Populate user data
      await request.populate("investorId", "name email avatarUrl")
      await request.populate("entrepreneurId", "name email avatarUrl")

      // Send notification to the other party
      const otherUserId = isInvestor ? request.entrepreneurId._id : request.investorId._id
      try {
        await NotificationService.createMeetingNotification(req.user._id, otherUserId, request._id, "scheduled")
      } catch (notificationError) {
        console.error("Failed to create meeting notification:", notificationError)
      }

      res.status(201).json({
        message: "Meeting scheduled successfully",
        request,
      })
    } catch (error) {
      console.error("Schedule meeting error:", error)
      res.status(500).json({
        message: "Failed to schedule meeting",
        code: "SCHEDULE_MEETING_FAILED",
      })
    }
  },
)

// @route   POST /api/collaborations/check-conflict
// @desc    Check for meeting conflicts
// @access  Private
router.post(
  "/check-conflict",
  [
    body("scheduledFor").isISO8601().withMessage("Valid date is required"),
    body("duration").isInt({ min: 15, max: 480 }).withMessage("Duration must be between 15 and 480 minutes"),
    body("excludeRequestId").optional().isMongoId(),
  ],
  async (req, res) => {
    try {
      const { scheduledFor, duration, excludeRequestId } = req.body
      const userId = req.user._id

      const conflicts = await CollaborationRequest.checkMeetingConflict(
        userId,
        scheduledFor,
        duration,
        excludeRequestId,
      )

      res.json({
        hasConflict: conflicts.length > 0,
        conflicts: conflicts.map((c) => ({
          id: c._id,
          scheduledFor: c.meetingDetails.scheduledFor,
          duration: c.meetingDetails.duration,
          location: c.meetingDetails.location,
          meetingLink: c.meetingDetails.meetingLink,
        })),
      })
    } catch (error) {
      console.error("Check meeting conflict error:", error)
      res.status(500).json({
        message: "Failed to check meeting conflict",
        code: "CHECK_CONFLICT_FAILED",
      })
    }
  },
)

// @route   PUT /api/collaborations/requests/:requestId/respond-meeting
// @desc    Respond to a meeting invitation
// @access  Private
router.put(
  "/requests/:requestId/respond-meeting",
  validateObjectId("requestId"),
  [body("response").isIn(["accepted", "rejected", "tentative"]).withMessage("Valid response is required")],
  async (req, res) => {
    try {
      const { response } = req.body
      const requestId = req.params.requestId

      if (!requestId || requestId === "undefined") {
        return res.status(400).json({
          message: "Invalid request ID",
          code: "INVALID_REQUEST_ID",
        })
      }

      const request = await CollaborationRequest.findById(requestId)

      if (!request) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        })
      }

      // Check if user is part of this collaboration
      const userId = req.user._id.toString()
      const isInvestor = request.investorId.toString() === userId
      const isEntrepreneur = request.entrepreneurId.toString() === userId

      if (!isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to respond to this meeting",
          code: "NOT_AUTHORIZED",
        })
      }

      // Check if meeting is scheduled
      if (!request.meetingScheduled) {
        return res.status(400).json({
          message: "No meeting scheduled for this collaboration",
          code: "NO_MEETING_SCHEDULED",
        })
      }

      // Respond to the meeting
      await request.respondToMeeting(req.user._id, response)

      // Populate user data
      await request.populate("investorId", "name email avatarUrl")
      await request.populate("entrepreneurId", "name email avatarUrl")

      // Send notification to the other party
      const otherUserId = isInvestor ? request.entrepreneurId._id : request.investorId._id
      try {
        await NotificationService.createMeetingNotification(req.user._id, otherUserId, request._id, response)
      } catch (notificationError) {
        console.error("Failed to create meeting response notification:", notificationError)
      }

      res.json({
        message: `Meeting ${response} successfully`,
        request,
      })
    } catch (error) {
      console.error("Respond to meeting error:", error)
      res.status(500).json({
        message: "Failed to respond to meeting",
        code: "RESPOND_MEETING_FAILED",
      })
    }
  },
)

// @route   GET /api/collaborations/requests/:requestId/meeting
// @desc    Get meeting details for a collaboration request
// @access  Private
router.get("/requests/:requestId/meeting", validateObjectId("requestId"), async (req, res) => {
  try {
    const request = await CollaborationRequest.findById(req.params.requestId)
      .populate("investorId", "name email avatarUrl")
      .populate("entrepreneurId", "name email avatarUrl")
      .populate("meetingDetails.createdBy", "name email avatarUrl")
      .populate("meetingDetails.participants.userId", "name email avatarUrl")

    if (!request) {
      return res.status(404).json({
        message: "Collaboration request not found",
        code: "REQUEST_NOT_FOUND",
      })
    }

    // Check if user is part of this collaboration
    const userId = req.user._id.toString()
    const isInvestor = request.investorId._id.toString() === userId
    const isEntrepreneur = request.entrepreneurId._id.toString() === userId

    if (!isInvestor && !isEntrepreneur) {
      return res.status(403).json({
        message: "Not authorized to view this meeting",
        code: "NOT_AUTHORIZED",
      })
    }

    // Check if meeting is scheduled
    if (!request.meetingScheduled) {
      return res.status(404).json({
        message: "No meeting scheduled for this collaboration",
        code: "NO_MEETING_SCHEDULED",
      })
    }

    res.json({
      meeting: request.meetingDetails,
      collaboration: {
        id: request._id,
        investor: request.investorId,
        entrepreneur: request.entrepreneurId,
        requestType: request.requestType,
        status: request.status,
      },
    })
  } catch (error) {
    console.error("Get meeting details error:", error)
    res.status(500).json({
      message: "Failed to get meeting details",
      code: "GET_MEETING_FAILED",
    })
  }
})

module.exports = router
