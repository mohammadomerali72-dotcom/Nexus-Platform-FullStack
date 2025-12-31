const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ["entrepreneur", "investor"],
      required: [true, "Role is required"],
    },
    avatarUrl: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=random`
      },
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },
    location: {
      type: String,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
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
    twitter: {
      type: String,
      validate: {
        validator: (v) => !v || /^https?:\/\/(www\.)?twitter\.com\//.test(v),
        message: "Twitter must be a valid Twitter URL",
      },
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false, // Don't include in queries by default
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
    },
    otpCode: {
      type: String,
      select: false,
    },
    otpExpires: {
      type: Date,
      select: false,
    },
    otpAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 2592000, // 30 days
        },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password
        delete ret.emailVerificationToken
        delete ret.passwordResetToken
        delete ret.passwordResetExpires
        delete ret.refreshTokens
        delete ret.twoFactorSecret
        delete ret.twoFactorBackupCodes
        delete ret.otpCode
        delete ret.otpExpires
        delete ret.otpAttempts
        delete ret.loginAttempts
        delete ret.lockUntil
        return ret
      },
    },
  },
)

// Index for better query performance
userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next()

  try {
    // Hash password with cost of 12
    const saltRounds = Number.parseInt(process.env.BCRYPT_ROUNDS) || 12
    this.password = await bcrypt.hash(this.password, saltRounds)
    next()
  } catch (error) {
    next(error)
  }
})

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password)
  } catch (error) {
    throw new Error("Password comparison failed")
  }
}

// Instance method to generate password reset token
userSchema.methods.createPasswordResetToken = function () {
  const crypto = require("crypto")
  const resetToken = crypto.randomBytes(32).toString("hex")

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")

  // Set expire time (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000

  return resetToken
}

// Instance method to add refresh token
userSchema.methods.addRefreshToken = function (token) {
  this.refreshTokens.push({ token })

  // Keep only last 5 refresh tokens
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5)
  }
}

// Instance method to remove refresh token
userSchema.methods.removeRefreshToken = function (token) {
  this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token)
}

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() })
}

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now())
})

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    })
  }
  // Otherwise increment
  const updates = { $inc: { loginAttempts: 1 } }
  // Lock the account after 5 failed attempts for 2 hours
  const maxAttempts = 5
  const lockTime = 2 * 60 * 60 * 1000 // 2 hours
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime }
  }
  return this.updateOne(updates)
}

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  })
}

// Method to generate OTP
userSchema.methods.generateOTP = function () {
  const crypto = require("crypto")
  // Generate 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString()

  // Hash OTP before storing
  this.otpCode = crypto.createHash("sha256").update(otp).digest("hex")

  // Set expiry time (10 minutes)
  this.otpExpires = Date.now() + 10 * 60 * 1000

  // Reset attempts
  this.otpAttempts = 0

  return otp // Return plain OTP to send via email
}

// Method to verify OTP
userSchema.methods.verifyOTP = async function (candidateOTP) {
  const crypto = require("crypto")

  // Check if OTP has expired
  if (!this.otpExpires || this.otpExpires < Date.now()) {
    return { success: false, message: "OTP has expired" }
  }

  // Check if too many attempts
  if (this.otpAttempts >= 3) {
    return { success: false, message: "Too many failed attempts. Please request a new OTP" }
  }

  // Hash candidate OTP
  const hashedOTP = crypto.createHash("sha256").update(candidateOTP).digest("hex")

  // Compare
  if (hashedOTP === this.otpCode) {
    // Clear OTP data
    this.otpCode = undefined
    this.otpExpires = undefined
    this.otpAttempts = 0
    return { success: true }
  }

  // Increment attempts
  this.otpAttempts += 1
  await this.save()

  return { success: false, message: "Invalid OTP" }
}

module.exports = mongoose.model("User", userSchema)

