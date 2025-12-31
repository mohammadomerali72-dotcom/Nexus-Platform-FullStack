const express = require("express")
const router = express.Router()
const Notification = require("../models/Notification")
const { authenticateToken } = require("../middleware/auth")
const { handleValidationErrors } = require("../middleware/validation")
const { body, query, param } = require("express-validator")

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
router.get(
  "/",
  authenticateToken,
  [
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
    query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
    query("status").optional().isIn(["new", "read"]).withMessage("Status must be 'new' or 'read'"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query
      const userId = req.user._id

      // build query
      const query = { recipientId: userId }
      if (status) query.status = status

      // fetch notifications with sender population
      const notifications = await Notification.find(query)
        .populate("senderId", "name avatarUrl role") // FIX: Populate sender data
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))

      // total count
      const totalCount = await Notification.countDocuments(query)

      // unread count
      const unreadCount = await Notification.countDocuments({
        recipientId: userId,
        status: "new",
      })

      res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            currentPage: Number(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            hasNext: page * limit < totalCount,
            hasPrev: page > 1,
          },
          unreadCount,
        },
      })
    } catch (error) {
      console.error("Get notifications error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch notifications",
        error: error.message,
      })
    }
  },
)

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id
    const unreadCount = await Notification.getUnreadCount(userId)

    res.json({
      success: true,
      data: { unreadCount },
    })
  } catch (error) {
    console.error("Get unread count error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread count",
      error: error.message,
    })
  }
})

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
router.put(
  "/:id/read",
  authenticateToken,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const notificationId = req.params.id
      const userId = req.user._id

      const notification = await Notification.findOne({
        _id: notificationId,
        recipientId: userId,
      })

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      if (notification.status === "read") {
        return res.json({
          success: true,
          message: "Notification already marked as read",
          data: notification,
        })
      }

      await notification.markAsRead()

      // FIX: Return populated notification
      const updatedNotification = await Notification.findById(notificationId)
        .populate("senderId", "name avatarUrl role")

      res.json({
        success: true,
        message: "Notification marked as read",
        data: updatedNotification,
      })
    } catch (error) {
      console.error("Mark notification as read error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to mark notification as read",
        error: error.message,
      })
    }
  },
)

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
router.put("/mark-all-read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id

    const result = await Notification.markAllAsRead(userId)

    res.json({
      success: true,
      message: "All notifications marked as read",
      data: {
        modifiedCount: result.modifiedCount,
      },
    })
  } catch (error) {
    console.error("Mark all notifications as read error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to mark all notifications as read",
      error: error.message,
    })
  }
})

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete(
  "/:id",
  authenticateToken,
  [param("id").isMongoId().withMessage("Invalid notification ID")],
  handleValidationErrors,
  async (req, res) => {
    try {
      const notificationId = req.params.id
      const userId = req.user._id

      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipientId: userId,
      })

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: "Notification not found",
        })
      }

      res.json({
        success: true,
        message: "Notification deleted successfully",
      })
    } catch (error) {
      console.error("Delete notification error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete notification",
        error: error.message,
      })
    }
  },
)

module.exports = router
