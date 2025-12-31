const mongoose = require("mongoose")

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdraw", "transfer_sent", "transfer_received"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount must be positive"],
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      index: true,
    },
    // For transfers
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    recipientName: String,
    recipientEmail: String,
    // For Stripe payments
    stripePaymentIntentId: String,
    stripePaymentMethodId: String,
    // Additional details
    description: String,
    metadata: {
      type: Map,
      of: String,
    },
    failureReason: String,
    completedAt: Date,
  },
  {
    timestamps: true,
  },
)

// Indexes for better query performance
transactionSchema.index({ userId: 1, createdAt: -1 })
transactionSchema.index({ status: 1, createdAt: -1 })
transactionSchema.index({ type: 1, userId: 1 })

// Static method to get user's transaction history
transactionSchema.statics.getUserTransactions = function (userId, options = {}) {
  const { limit = 50, skip = 0, status, type } = options

  const query = { userId }
  if (status) query.status = status
  if (type) query.type = type

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate("recipientId", "name email avatarUrl")
}

// Instance method to mark transaction as completed
transactionSchema.methods.markCompleted = function () {
  this.status = "completed"
  this.completedAt = new Date()
  return this.save()
}

// Instance method to mark transaction as failed
transactionSchema.methods.markFailed = function (reason) {
  this.status = "failed"
  this.failureReason = reason
  return this.save()
}

module.exports = mongoose.model("Transaction", transactionSchema)
