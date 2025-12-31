const mongoose = require("mongoose")

const collaborationRequestSchema = new mongoose.Schema(
  {
    investorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Investor ID is required"],
    },
    entrepreneurId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Entrepreneur ID is required"],
    },
    requestType: {
      type: String,
      enum: ["investment", "mentorship", "partnership", "advisory"],
      default: "investment",
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    proposedAmount: {
      type: String,
      maxlength: [50, "Proposed amount cannot exceed 50 characters"],
    },
    proposedTerms: {
      type: String,
      maxlength: [500, "Proposed terms cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "withdrawn", "expired"],
      default: "pending",
    },
    responseMessage: {
      type: String,
      maxlength: [1000, "Response message cannot exceed 1000 characters"],
    },
    respondedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: () => {
        // Default expiration: 30 days from creation
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    tags: [String],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    followUpReminders: [
      {
        scheduledFor: Date,
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
    ],
    meetingScheduled: {
      type: Boolean,
      default: false,
    },
    meetingDetails: {
      scheduledFor: Date,
      duration: Number, // in minutes
      location: String,
      meetingLink: String,
      agenda: String,
      status: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "completed"],
        default: "pending",
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      participants: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          response: {
            type: String,
            enum: ["pending", "accepted", "rejected", "tentative"],
            default: "pending",
          },
          responseAt: Date,
        },
      ],
      calendarEventId: String,
      reminders: [
        {
          type: {
            type: String,
            enum: ["email", "push", "both"],
            default: "email",
          },
          sent: {
            type: Boolean,
            default: false,
          },
          scheduledTime: Date,
          sentAt: Date,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
collaborationRequestSchema.index({ investorId: 1, status: 1 })
collaborationRequestSchema.index({ entrepreneurId: 1, status: 1 })
collaborationRequestSchema.index({ status: 1, createdAt: -1 })
collaborationRequestSchema.index({ expiresAt: 1 })
collaborationRequestSchema.index({ requestType: 1 })

// Compound index for efficient queries
collaborationRequestSchema.index({ investorId: 1, entrepreneurId: 1, status: 1 })

// Method to accept the request
collaborationRequestSchema.methods.accept = function (responseMessage) {
  this.status = "accepted"
  this.responseMessage = responseMessage
  this.respondedAt = new Date()
  return this.save()
}

// Method to reject the request
collaborationRequestSchema.methods.reject = function (responseMessage) {
  this.status = "rejected"
  this.responseMessage = responseMessage
  this.respondedAt = new Date()
  return this.save()
}

// Method to withdraw the request
collaborationRequestSchema.methods.withdraw = function () {
  this.status = "withdrawn"
  this.respondedAt = new Date()
  return this.save()
}

// Method to check if request is expired
collaborationRequestSchema.methods.isExpired = function () {
  return this.expiresAt < new Date()
}

// Static method to find pending requests for a user
collaborationRequestSchema.statics.findPendingForUser = function (userId, userRole) {
  const query = { status: "pending" }
  if (userRole === "investor") {
    query.investorId = userId
  } else {
    query.entrepreneurId = userId
  }
  return this.find(query).populate("investorId entrepreneurId", "name email avatarUrl")
}

// Pre-save middleware to handle expiration
collaborationRequestSchema.pre("save", function (next) {
  // Check if the method exists before calling it
  if (typeof this.isExpired === 'function' && this.isExpired() && this.status === "pending") {
    this.status = "expired"
  }
  next()
})

// Method to schedule a meeting
collaborationRequestSchema.methods.scheduleMeeting = function (meetingData, createdBy) {
  this.meetingScheduled = true
  this.meetingDetails = {
    ...meetingData,
    createdBy,
    participants: [
      {
        userId: this.investorId,
        response: "pending",
      },
      {
        userId: this.entrepreneurId,
        response: "pending",
      },
    ],
    status: "pending",
  }
  return this.save()
}

// Method to respond to a meeting
collaborationRequestSchema.methods.respondToMeeting = function (userId, response) {
  const participant = this.meetingDetails.participants.find(
    (p) => p.userId.toString() === userId.toString()
  )
  
  if (participant) {
    participant.response = response
    participant.responseAt = new Date()
    
    // If both participants have accepted, mark meeting as confirmed
    const allAccepted = this.meetingDetails.participants.every(
      (p) => p.response === "accepted"
    )
    
    if (allAccepted) {
      this.meetingDetails.status = "confirmed"
    }
    
    // If any participant rejected, mark meeting as cancelled
    const anyRejected = this.meetingDetails.participants.some(
      (p) => p.response === "rejected"
    )
    
    if (anyRejected) {
      this.meetingDetails.status = "cancelled"
    }
  }
  
  return this.save()
}

// Method to check for meeting conflicts
collaborationRequestSchema.statics.checkMeetingConflict = function (userId, scheduledFor, duration, excludeRequestId = null) {
  const startTime = new Date(scheduledFor)
  const endTime = new Date(startTime.getTime() + duration * 60000)
  
  const query = {
    _id: { $ne: excludeRequestId },
    meetingScheduled: true,
    $or: [{ investorId: userId }, { entrepreneurId: userId }],
    "meetingDetails.status": { $in: ["pending", "confirmed"] },
    $or: [
      {
        "meetingDetails.scheduledFor": {
          $gte: startTime,
          $lt: endTime,
        },
      },
      {
        "meetingDetails.scheduledFor": {
          $lte: startTime,
        },
        $expr: {
          $gte: [
            {
              $add: [
                "$meetingDetails.scheduledFor",
                { $multiply: ["$meetingDetails.duration", 60000] },
              ],
            },
            startTime,
          ],
        },
      },
    ],
  }
  
  return this.find(query)
}

module.exports = mongoose.model("CollaborationRequest", collaborationRequestSchema)
