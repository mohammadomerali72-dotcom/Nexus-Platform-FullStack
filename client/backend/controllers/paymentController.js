const Wallet = require("../models/Wallet")
const Transaction = require("../models/Transaction")
const User = require("../models/User")

// Initialize Stripe (will use environment variable)
const stripe = process.env.STRIPE_SECRET_KEY ? require("stripe")(process.env.STRIPE_SECRET_KEY) : null

// Get wallet balance
exports.getWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.getOrCreate(req.user._id)
    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        totalTransferred: wallet.totalTransferred,
        isActive: wallet.isActive,
        isFrozen: wallet.isFrozen,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create deposit intent (Stripe Payment Intent)
exports.createDepositIntent = async (req, res, next) => {
  try {
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      })
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: "Payment service not configured. Please add STRIPE_SECRET_KEY to environment variables.",
      })
    }

    const wallet = await Wallet.getOrCreate(req.user._id)
    const user = await User.findById(req.user._id)

    // Create or get Stripe customer
    let stripeCustomerId = wallet.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      })
      stripeCustomerId = customer.id
      wallet.stripeCustomerId = stripeCustomerId
      await wallet.save()
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      customer: stripeCustomerId,
      metadata: {
        userId: req.user._id.toString(),
        type: "deposit",
      },
    })

    // Create pending transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: "deposit",
      amount,
      currency: "USD",
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      description: `Deposit of $${amount}`,
    })

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id,
    })
  } catch (error) {
    next(error)
  }
}

// Confirm deposit (webhook or manual confirmation)
exports.confirmDeposit = async (req, res, next) => {
  try {
    const { transactionId } = req.body

    const transaction = await Transaction.findById(transactionId)
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      })
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      })
    }

    if (transaction.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Transaction already processed",
      })
    }

    // In production, verify with Stripe webhook
    // For now, we'll mark as completed
    const wallet = await Wallet.getOrCreate(req.user._id)
    await wallet.addFunds(transaction.amount)
    await transaction.markCompleted()

    res.json({
      success: true,
      message: "Deposit confirmed",
      transaction,
      wallet: {
        balance: wallet.balance,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Request withdrawal
exports.requestWithdrawal = async (req, res, next) => {
  try {
    const { amount, bankAccount } = req.body

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      })
    }

    const wallet = await Wallet.getOrCreate(req.user._id)

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      })
    }

    // Create withdrawal transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: "withdraw",
      amount,
      currency: "USD",
      status: "pending",
      description: `Withdrawal of $${amount}`,
      metadata: {
        bankAccount: bankAccount || "Not provided",
      },
    })

    // Deduct from wallet
    await wallet.deductFunds(amount)

    // In production, process with Stripe payout
    // For demo, mark as completed immediately
    await transaction.markCompleted()

    res.json({
      success: true,
      message: "Withdrawal request submitted",
      transaction,
      wallet: {
        balance: wallet.balance,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Transfer funds to another user
exports.transferFunds = async (req, res, next) => {
  try {
    const { recipientId, amount, description } = req.body

    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer details",
      })
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Cannot transfer to yourself",
      })
    }

    const recipient = await User.findById(recipientId)
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      })
    }

    const senderWallet = await Wallet.getOrCreate(req.user._id)
    const recipientWallet = await Wallet.getOrCreate(recipientId)

    if (senderWallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      })
    }

    // Create transactions for both sender and recipient
    const senderTransaction = await Transaction.create({
      userId: req.user._id,
      type: "transfer_sent",
      amount,
      currency: "USD",
      status: "completed",
      recipientId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      description: description || `Transfer to ${recipient.name}`,
      completedAt: new Date(),
    })

    const recipientTransaction = await Transaction.create({
      userId: recipientId,
      type: "transfer_received",
      amount,
      currency: "USD",
      status: "completed",
      recipientId: req.user._id,
      description: description || `Transfer from sender`,
      completedAt: new Date(),
    })

    // Update wallets
    await senderWallet.transferFunds(amount)
    await recipientWallet.addFunds(amount)

    res.json({
      success: true,
      message: "Transfer completed successfully",
      transaction: senderTransaction,
      wallet: {
        balance: senderWallet.balance,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get transaction history
exports.getTransactions = async (req, res, next) => {
  try {
    const { limit = 50, skip = 0, status, type } = req.query

    const transactions = await Transaction.getUserTransactions(req.user._id, {
      limit: Number.parseInt(limit),
      skip: Number.parseInt(skip),
      status,
      type,
    })

    const total = await Transaction.countDocuments({ userId: req.user._id })

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        limit: Number.parseInt(limit),
        skip: Number.parseInt(skip),
        hasMore: total > Number.parseInt(skip) + transactions.length,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get transaction by ID
exports.getTransaction = async (req, res, next) => {
  try {
    const { id } = req.params

    const transaction = await Transaction.findById(id).populate("recipientId", "name email avatarUrl")

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      })
    }

    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      })
    }

    res.json({
      success: true,
      transaction,
    })
  } catch (error) {
    next(error)
  }
}
