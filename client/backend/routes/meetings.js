const express = require("express");
const CollaborationRequest = require("../models/CollaborationRequest");
const User = require("../models/User");
const { authenticateToken } = require("../middleware/auth");
const { validateObjectId } = require("../middleware/validation");
const { body, param } = require("express-validator");

const router = express.Router();

// Schedule a meeting for a collaboration request
router.post(
  "/:requestId/schedule",
  authenticateToken,
  validateObjectId("requestId"),
  [
    body("scheduledFor").isISO8601().withMessage("Valid date is required"),
    body("duration").isInt({ min: 15, max: 240 }).withMessage("Duration must be between 15 and 240 minutes"),
    body("location").optional().isLength({ max: 200 }).withMessage("Location cannot exceed 200 characters"),
    body("meetingLink").optional().isURL().withMessage("Valid URL is required"),
    body("agenda").optional().isLength({ max: 500 }).withMessage("Agenda cannot exceed 500 characters"),
  ],
  async (req, res) => {
    try {
      const { scheduledFor, duration, location, meetingLink, agenda } = req.body;
      const requestId = req.params.requestId;
      const userId = req.user.id;

      // Find the collaboration request
      const collaborationRequest = await CollaborationRequest.findById(requestId)
        .populate("investorId", "name email")
        .populate("entrepreneurId", "name email");

      if (!collaborationRequest) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        });
      }

      // Check if user is part of this collaboration
      const isInvestor = collaborationRequest.investorId._id.toString() === userId;
      const isEntrepreneur = collaborationRequest.entrepreneurId._id.toString() === userId;
      
      if (!isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to schedule meeting for this request",
          code: "NOT_AUTHORIZED",
        });
      }

      // Check for meeting conflicts for both participants
      const investorConflicts = await CollaborationRequest.checkMeetingConflict(
        collaborationRequest.investorId._id,
        scheduledFor,
        duration,
        requestId
      );
      
      const entrepreneurConflicts = await CollaborationRequest.checkMeetingConflict(
        collaborationRequest.entrepreneurId._id,
        scheduledFor,
        duration,
        requestId
      );

      if (investorConflicts.length > 0 || entrepreneurConflicts.length > 0) {
        return res.status(409).json({
          message: "Meeting time conflicts with existing meetings",
          code: "MEETING_CONFLICT",
          conflicts: {
            investor: investorConflicts.length > 0,
            entrepreneur: entrepreneurConflicts.length > 0,
          },
        });
      }

      // Schedule the meeting
      await collaborationRequest.scheduleMeeting(
        {
          scheduledFor: new Date(scheduledFor),
          duration,
          location,
          meetingLink,
          agenda,
        },
        userId
      );

      // Populate the updated request
      await collaborationRequest.populate("meetingDetails.participants.userId", "name email");

      res.status(201).json({
        message: "Meeting scheduled successfully",
        meeting: collaborationRequest.meetingDetails,
      });
    } catch (error) {
      console.error("Schedule meeting error:", error);
      res.status(500).json({
        message: "Failed to schedule meeting",
        code: "SCHEDULE_MEETING_FAILED",
      });
    }
  }
);

// Respond to a meeting invitation
router.put(
  "/:requestId/respond",
  authenticateToken,
  validateObjectId("requestId"),
  [
    body("response").isIn(["accepted", "rejected", "tentative"]).withMessage("Valid response is required"),
  ],
  async (req, res) => {
    try {
      const { response } = req.body;
      const requestId = req.params.requestId;
      const userId = req.user.id;

      // Find the collaboration request
      const collaborationRequest = await CollaborationRequest.findById(requestId)
        .populate("investorId", "name email")
        .populate("entrepreneurId", "name email");

      if (!collaborationRequest) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        });
      }

      if (!collaborationRequest.meetingScheduled) {
        return res.status(400).json({
          message: "No meeting scheduled for this request",
          code: "NO_MEETING_SCHEDULED",
        });
      }

      // Check if user is part of this collaboration
      const isInvestor = collaborationRequest.investorId._id.toString() === userId;
      const isEntrepreneur = collaborationRequest.entrepreneurId._id.toString() === userId;
      
      if (!isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to respond to this meeting",
          code: "NOT_AUTHORIZED",
        });
      }

      // Respond to the meeting
      await collaborationRequest.respondToMeeting(userId, response);

      // Populate the updated request
      await collaborationRequest.populate("meetingDetails.participants.userId", "name email");

      res.json({
        message: `Meeting ${response} successfully`,
        meeting: collaborationRequest.meetingDetails,
      });
    } catch (error) {
      console.error("Respond to meeting error:", error);
      res.status(500).json({
        message: "Failed to respond to meeting",
        code: "MEETING_RESPONSE_FAILED",
      });
    }
  }
);

// Get meeting details
router.get(
  "/:requestId",
  authenticateToken,
  validateObjectId("requestId"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const userId = req.user.id;

      // Find the collaboration request
      const collaborationRequest = await CollaborationRequest.findById(requestId)
        .populate("investorId", "name email avatarUrl")
        .populate("entrepreneurId", "name email avatarUrl")
        .populate("meetingDetails.participants.userId", "name email avatarUrl");

      if (!collaborationRequest) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        });
      }

      if (!collaborationRequest.meetingScheduled) {
        return res.status(404).json({
          message: "No meeting scheduled for this request",
          code: "NO_MEETING_SCHEDULED",
        });
      }

      // Check if user is part of this collaboration
      const isInvestor = collaborationRequest.investorId._id.toString() === userId;
      const isEntrepreneur = collaborationRequest.entrepreneurId._id.toString() === userId;
      
      if (!isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to view this meeting",
          code: "NOT_AUTHORIZED",
        });
      }

      res.json({
        meeting: collaborationRequest.meetingDetails,
      });
    } catch (error) {
      console.error("Get meeting error:", error);
      res.status(500).json({
        message: "Failed to fetch meeting details",
        code: "FETCH_MEETING_FAILED",
      });
    }
  }
);

// Cancel a meeting
router.put(
  "/:requestId/cancel",
  authenticateToken,
  validateObjectId("requestId"),
  async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const userId = req.user.id;

      // Find the collaboration request
      const collaborationRequest = await CollaborationRequest.findById(requestId);

      if (!collaborationRequest) {
        return res.status(404).json({
          message: "Collaboration request not found",
          code: "REQUEST_NOT_FOUND",
        });
      }

      if (!collaborationRequest.meetingScheduled) {
        return res.status(400).json({
          message: "No meeting scheduled for this request",
          code: "NO_MEETING_SCHEDULED",
        });
      }

      // Check if user created the meeting or is part of it
      const isCreator = collaborationRequest.meetingDetails.createdBy.toString() === userId;
      const isInvestor = collaborationRequest.investorId.toString() === userId;
      const isEntrepreneur = collaborationRequest.entrepreneurId.toString() === userId;
      
      if (!isCreator && !isInvestor && !isEntrepreneur) {
        return res.status(403).json({
          message: "Not authorized to cancel this meeting",
          code: "NOT_AUTHORIZED",
        });
      }

      // Cancel the meeting
      collaborationRequest.meetingDetails.status = "cancelled";
      await collaborationRequest.save();

      res.json({
        message: "Meeting cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel meeting error:", error);
      res.status(500).json({
        message: "Failed to cancel meeting",
        code: "CANCEL_MEETING_FAILED",
      });
    }
  }
);

// Get user's meetings
router.get(
  "/user/meetings",
  authenticateToken,
  [
    param("status").optional().isIn(["pending", "confirmed", "cancelled", "completed"]),
    param("page").optional().isInt({ min: 1 }),
    param("limit").optional().isInt({ min: 1, max: 50 }),
  ],
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      const query = {
        meetingScheduled: true,
        $or: [{ investorId: userId }, { entrepreneurId: userId }],
      };

      if (status) {
        query["meetingDetails.status"] = status;
      }

      const meetings = await CollaborationRequest.find(query)
        .populate("investorId", "name email avatarUrl")
        .populate("entrepreneurId", "name email avatarUrl")
        .select("meetingDetails requestType status createdAt")
        .sort({ "meetingDetails.scheduledFor": 1 })
        .skip(skip)
        .limit(Number.parseInt(limit));

      const total = await CollaborationRequest.countDocuments(query);

      res.json({
        meetings,
        pagination: {
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMeetings: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Get user meetings error:", error);
      res.status(500).json({
        message: "Failed to fetch meetings",
        code: "FETCH_MEETINGS_FAILED",
      });
    }
  }
);

// Check for meeting conflicts
router.post(
  "/check-conflict",
  authenticateToken,
  [
    body("scheduledFor").isISO8601().withMessage("Valid date is required"),
    body("duration").isInt({ min: 15, max: 240 }).withMessage("Duration must be between 15 and 240 minutes"),
    body("excludeRequestId").optional().isMongoId().withMessage("Valid request ID is required"),
  ],
  async (req, res) => {
    try {
      const { scheduledFor, duration, excludeRequestId } = req.body;
      const userId = req.user.id;

      const conflicts = await CollaborationRequest.checkMeetingConflict(
        userId,
        scheduledFor,
        duration,
        excludeRequestId
      ).populate("investorId", "name email")
       .populate("entrepreneurId", "name email")
       .select("meetingDetails requestType");

      res.json({
        hasConflict: conflicts.length > 0,
        conflicts,
      });
    } catch (error) {
      console.error("Check meeting conflict error:", error);
      res.status(500).json({
        message: "Failed to check meeting conflicts",
        code: "CHECK_CONFLICT_FAILED",
      });
    }
  }
);

module.exports = router;