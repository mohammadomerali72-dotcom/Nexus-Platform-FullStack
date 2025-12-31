const mongoose = require("mongoose")

const dealSchema = new mongoose.Schema(
  {
    investorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, required: true },
    startup: {
      name: { type: String, required: true, trim: true, maxlength: 140 },
      logo: { type: String, trim: true, maxlength: 1024 },
      industry: { type: String, trim: true, maxlength: 100 },
    },
    amount: { type: String, required: true, trim: true, maxlength: 50 }, // keep UI-friendly format e.g. "$1.5M"
    equity: { type: String, required: true, trim: true, maxlength: 20 }, // e.g., "15%"
    status: {
      type: String,
      enum: ["Due Diligence", "Term Sheet", "Negotiation", "Closed", "Passed"],
      default: "Due Diligence",
      index: true,
    },
    stage: { type: String, trim: true, maxlength: 50 }, // e.g., "Series A"
    lastActivity: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
)

dealSchema.index({ "startup.name": 1 })
dealSchema.index({ "startup.industry": 1 })

module.exports = mongoose.model("Deal", dealSchema)
