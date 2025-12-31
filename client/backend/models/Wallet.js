const mongoose = require("mongoose")

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, "Balance cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    // Stripe customer ID for payment processing
    stripeCustomerId: String,
    // Track total transactions
    totalDeposited: {
      type: Number,
      default: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
    },
    totalTransferred: {
      type: Number,
      default: 0,
    },
    // Wallet status
    isActive: {
      type: Boolean,
      default: true,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
    frozenReason: String,
  },
  {
    timestamps: true,
  },
)

// Instance method to add funds
walletSchema.methods.addFunds = async function (amount, transactionId) {
  if (this.isFrozen) {
    throw new Error("Wallet is frozen")
  }
  this.balance += amount
  this.totalDeposited += amount
  return this.save()
}

// Instance method to deduct funds
walletSchema.methods.deductFunds = async function (amount, transactionId) {
  if (this.isFrozen) {
    throw new Error("Wallet is frozen")
  }
  if (this.balance < amount) {
    throw new Error("Insufficient balance")
  }
  this.balance -= amount
  this.totalWithdrawn += amount
  return this.save()
}

// Instance method to transfer funds
walletSchema.methods.transferFunds = async function (amount) {
  if (this.isFrozen) {
    throw new Error("Wallet is frozen")
  }
  if (this.balance < amount) {
    throw new Error("Insufficient balance")
  }
  this.balance -= amount
  this.totalTransferred += amount
  return this.save()
}

// Static method to get or create wallet
walletSchema.statics.getOrCreate = async function (userId) {
  let wallet = await this.findOne({ userId })
  if (!wallet) {
    wallet = await this.create({ userId })
  }
  return wallet
}

module.exports = mongoose.model("Wallet", walletSchema)
