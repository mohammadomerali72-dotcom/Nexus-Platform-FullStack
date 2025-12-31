const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")
const { authenticateToken } = require("../middleware/auth")

// All routes require authentication
router.use(authenticateToken)

// Wallet routes
router.get("/wallet", paymentController.getWallet)

// Deposit routes
router.post("/deposit/intent", paymentController.createDepositIntent)
router.post("/deposit/confirm", paymentController.confirmDeposit)

// Withdrawal routes
router.post("/withdraw", paymentController.requestWithdrawal)

// Transfer routes
router.post("/transfer", paymentController.transferFunds)

// Transaction routes
router.get("/transactions", paymentController.getTransactions)
router.get("/transactions/:id", paymentController.getTransaction)

module.exports = router
