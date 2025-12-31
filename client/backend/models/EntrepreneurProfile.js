const mongoose = require("mongoose")

const entrepreneurProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Core startup fields (match frontend + validation.js)
    startupName: {
      type: String,
      required: [true, "Startup name is required"],
      trim: true,
      maxlength: [100, "Startup name cannot exceed 100 characters"],
    },
    industry: {
      type: String,
      required: [true, "Industry is required"],
      trim: true,
      maxlength: [50, "Industry cannot exceed 50 characters"],
    },
    foundedYear: {
      type: Number,
      required: [true, "Founded year is required"],
      min: 1900,
      max: new Date().getFullYear(),
    },
    teamSize: {
      type: Number,
      required: [true, "Team size is required"],
      min: [1, "Team size must be at least 1"],
      max: [10000, "Team size cannot exceed 10000"],
    },
    fundingNeeded: {
      type: String,
      required: [true, "Funding needed is required"],
      trim: true,
      maxlength: [50, "Funding needed cannot exceed 50 characters"],
    },
    pitchSummary: {
      type: String,
      required: [true, "Pitch summary is required"],
      trim: true,
      maxlength: [1000, "Pitch summary cannot exceed 1000 characters"],
    },

    // Optional detail fields used by the frontend types
    businessModel: { type: String, trim: true, maxlength: 100 },
    revenueModel: { type: String, trim: true, maxlength: 100 },
    targetMarket: { type: String, trim: true, maxlength: 200 },
    competitiveAdvantage: { type: String, trim: true, maxlength: 300 },
    currentRevenue: { type: String, trim: true, maxlength: 100 },
    monthlyGrowthRate: { type: Number, min: 0, max: 1000 },
    customerCount: { type: Number, min: 0 },

    keyMetrics: [
      {
        name: { type: String, required: true, maxlength: 50 },
        value: { type: String, required: true, maxlength: 50 },
        description: { type: String, maxlength: 200 },
      },
    ],

    teamMembers: [
      {
        name: { type: String, required: true, maxlength: 100 },
        role: { type: String, required: true, maxlength: 100 },
        bio: { type: String, maxlength: 300 },
        linkedin: {
          type: String,
          validate: {
            validator: (v) => !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v),
            message: "LinkedIn must be a valid LinkedIn URL",
          },
        },
      },
    ],

    // Optional fields mirrored in profile for convenience
    location: { type: String, trim: true, maxlength: 100 },
    website: {
      type: String,
      validate: {
        validator: (v) => !v || /^https?:\/\/.+/.test(v),
        message: "Website must be a valid URL",
      },
    },
    linkedin: {
      type: String,
      validate: {
        validator: (v) => !v || /^https?:\/\/(www\.)?linkedin\.com\//.test(v),
        message: "LinkedIn must be a valid LinkedIn URL",
      },
    },

    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
)

// Indexes
entrepreneurProfileSchema.index({ userId: 1 })
entrepreneurProfileSchema.index({ industry: 1 })
entrepreneurProfileSchema.index({ foundedYear: -1 })
entrepreneurProfileSchema.index({ isPublic: 1 })
entrepreneurProfileSchema.index({ createdAt: -1 })

// Public projection helper
entrepreneurProfileSchema.methods.getPublicProfile = function () {
  const profile = this.toObject()
  // Redact nothing sensitive for now; keep for parity with investor
  return profile
}

module.exports = mongoose.model("EntrepreneurProfile", entrepreneurProfileSchema)

