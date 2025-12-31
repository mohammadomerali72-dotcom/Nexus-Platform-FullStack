const mongoose = require("mongoose")

const investorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    investorType: {
      type: String,
      enum: ["angel", "vc", "corporate", "family-office", "crowdfunding", "government", "other"],
      required: [true, "Investor type is required"],
    },
    investmentInterests: [
      {
        type: String,
        enum: [
          "Technology",
          "Healthcare",
          "Finance",
          "Education",
          "E-commerce",
          "Real Estate",
          "Manufacturing",
          "Food & Beverage",
          "Transportation",
          "Energy",
          "Entertainment",
          "Agriculture",
          "Retail",
          "Consulting",
          "Other",
        ],
        required: true,
      },
    ],
    investmentStage: [
      {
        type: String,
        enum: ["pre-seed", "seed", "series-a", "series-b", "series-c", "series-d", "ipo"],
        required: true,
      },
    ],
    minimumInvestment: {
      type: String,
      required: [true, "Minimum investment is required"],
      trim: true,
      maxlength: [50, "Minimum investment cannot exceed 50 characters"],
    },
    maximumInvestment: {
      type: String,
      required: [true, "Maximum investment is required"],
      trim: true,
      maxlength: [50, "Maximum investment cannot exceed 50 characters"],
    },
    totalInvestments: {
      type: Number,
      default: 0,
      min: [0, "Total investments cannot be negative"],
    },
    portfolioCompanies: [
      {
        name: {
          type: String,
          required: true,
          maxlength: [100, "Company name cannot exceed 100 characters"],
        },
        industry: {
          type: String,
          maxlength: [50, "Industry cannot exceed 50 characters"],
        },
        investmentAmount: {
          type: String,
          maxlength: [50, "Investment amount cannot exceed 50 characters"],
        },
        investmentDate: {
          type: Date,
        },
        currentStatus: {
          type: String,
          enum: ["active", "exited", "failed", "acquired"],
          default: "active",
        },
        description: {
          type: String,
          maxlength: [300, "Description cannot exceed 300 characters"],
        },
        website: {
          type: String,
          validate: {
            validator: (v) => !v || /^https?:\/\/.+/.test(v),
            message: "Website must be a valid URL",
          },
        },
        isPublic: {
          type: Boolean,
          default: true,
        },
      },
    ],
    investmentCriteria: {
      geographicFocus: [String],
      businessModels: [
        {
          type: String,
          enum: ["B2B", "B2C", "B2B2C", "Marketplace", "SaaS", "E-commerce", "Subscription", "Freemium", "Other"],
        },
      ],
      revenueRequirement: {
        type: String,
        maxlength: [100, "Revenue requirement cannot exceed 100 characters"],
      },
      teamSizePreference: {
        min: Number,
        max: Number,
      },
      fundingStagePreference: [
        {
          type: String,
          enum: ["pre-seed", "seed", "series-a", "series-b", "series-c", "series-d", "ipo"],
        },
      ],
      otherCriteria: {
        type: String,
        maxlength: [500, "Other criteria cannot exceed 500 characters"],
      },
    },
    investmentProcess: {
      typicalTimeframe: {
        type: String,
        maxlength: [100, "Typical timeframe cannot exceed 100 characters"],
      },
      requiredDocuments: [String],
      decisionMakers: {
        type: String,
        maxlength: [200, "Decision makers cannot exceed 200 characters"],
      },
      followUpProcess: {
        type: String,
        maxlength: [300, "Follow-up process cannot exceed 300 characters"],
      },
    },
    expertise: [
      {
        area: {
          type: String,
          required: true,
          maxlength: [50, "Expertise area cannot exceed 50 characters"],
        },
        level: {
          type: String,
          enum: ["beginner", "intermediate", "advanced", "expert"],
          required: true,
        },
        description: {
          type: String,
          maxlength: [200, "Expertise description cannot exceed 200 characters"],
        },
      },
    ],
    mentorshipOffered: {
      type: Boolean,
      default: false,
    },
    mentorshipAreas: [String],
    networkConnections: {
      type: Number,
      default: 0,
      min: [0, "Network connections cannot be negative"],
    },
    successStories: [
      {
        companyName: String,
        description: String,
        outcome: String,
        investmentAmount: String,
        returnMultiple: String,
        timeframe: String,
        isPublic: {
          type: Boolean,
          default: true,
        },
      },
    ],
    credentials: {
      education: [
        {
          institution: String,
          degree: String,
          field: String,
          year: Number,
        },
      ],
      certifications: [
        {
          name: String,
          issuer: String,
          year: Number,
          url: String,
        },
      ],
      previousRoles: [
        {
          company: String,
          position: String,
          startDate: Date,
          endDate: Date,
          description: String,
        },
      ],
    },
    isAccreditedInvestor: {
      type: Boolean,
      default: false,
    },
    accreditationDocuments: [
      {
        type: String,
        url: String,
        uploadedAt: Date,
        status: {
          type: String,
          enum: ["pending", "approved", "rejected"],
          default: "pending",
        },
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    availabilityStatus: {
      type: String,
      enum: ["actively-investing", "selectively-investing", "not-investing", "on-hold"],
      default: "actively-investing",
    },
    responseTime: {
      type: String,
      enum: ["within-24h", "within-week", "within-month", "varies"],
      default: "varies",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        // Don't expose accreditation documents to non-admin users
        if (!ret.isAdmin) {
          delete ret.accreditationDocuments
        }
        return ret
      },
    },
  },
)

// Indexes for better query performance
investorProfileSchema.index({ userId: 1 })
investorProfileSchema.index({ investorType: 1 })
investorProfileSchema.index({ investmentInterests: 1 })
investorProfileSchema.index({ investmentStage: 1 })
investorProfileSchema.index({ isPublic: 1 })
investorProfileSchema.index({ availabilityStatus: 1 })
investorProfileSchema.index({ createdAt: -1 })

// Method to get public profile data
investorProfileSchema.methods.getPublicProfile = function () {
  const profile = this.toObject()

  // Filter out sensitive information
  delete profile.accreditationDocuments

  // Only show public portfolio companies and success stories
  profile.portfolioCompanies = profile.portfolioCompanies.filter((company) => company.isPublic)
  profile.successStories = profile.successStories.filter((story) => story.isPublic)

  return profile
}

// Virtual for calculating investment experience
investorProfileSchema.virtual("investmentExperience").get(function () {
  if (this.portfolioCompanies.length === 0) return "New investor"

  const totalInvestments = this.portfolioCompanies.length
  if (totalInvestments < 5) return "Emerging investor"
  if (totalInvestments < 20) return "Experienced investor"
  return "Veteran investor"
})

// module.exports = mongoose.model("InvestorProfile", investorProfileSchema)

module.exports =
  mongoose.models.InvestorProfile ||
  mongoose.model("InvestorProfile", investorProfileSchema);

