"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import paymentService, { type Wallet as WalletType, type Transaction } from "../../services/paymentService"
import toast from "react-hot-toast"

export const WalletPage: React.FC = () => {
  const [wallet, setWallet] = useState<WalletType | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "deposit" | "withdraw" | "transfer">("overview")

  // Form states
  const [depositAmount, setDepositAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [transferAmount, setTransferAmount] = useState("")
  const [recipientId, setRecipientId] = useState("")
  const [transferDescription, setTransferDescription] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      const [walletData, transactionsData] = await Promise.all([
        paymentService.getWallet(),
        paymentService.getTransactions({ limit: 10 }),
      ])
      setWallet(walletData)
      setTransactions(transactionsData.transactions)
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load wallet data")
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const amount = Number.parseFloat(depositAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount")
      }

      const { clientSecret, transactionId } = await paymentService.createDepositIntent(amount)

      await paymentService.confirmDeposit(transactionId)

      toast.success(`Successfully deposited $${amount.toFixed(2)}`)
      setDepositAmount("")
      await loadWalletData()
      setActiveTab("overview")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Deposit failed")
    } finally {
      setProcessing(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const amount = Number.parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount")
      }

      await paymentService.requestWithdrawal(amount)

      toast.success(`Withdrawal of $${amount.toFixed(2)} requested successfully`)
      setWithdrawAmount("")
      await loadWalletData()
      setActiveTab("overview")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Withdrawal failed")
    } finally {
      setProcessing(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const amount = Number.parseFloat(transferAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Please enter a valid amount")
      }
      if (!recipientId.trim()) {
        throw new Error("Please enter recipient ID")
      }

      await paymentService.transferFunds(recipientId, amount, transferDescription)

      toast.success(`Successfully transferred $${amount.toFixed(2)}`)
      setTransferAmount("")
      setRecipientId("")
      setTransferDescription("")
      await loadWalletData()
      setActiveTab("overview")
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Transfer failed")
    } finally {
      setProcessing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />
      case "withdraw":
        return <ArrowUpRight className="w-5 h-5 text-red-500" />
      case "transfer_sent":
        return <Send className="w-5 h-5 text-blue-500" />
      case "transfer_received":
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />
      default:
        return <DollarSign className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Wallet</h1>
        <p className="mt-2 text-sm text-gray-600">Manage your funds and transactions</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl p-8 text-white mb-8 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-xl">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-primary-100">Available Balance</p>
              <h2 className="text-4xl font-bold">${wallet?.balance.toFixed(2) || "0.00"}</h2>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/20">
          <div>
            <p className="text-xs text-primary-100 mb-1">Total Deposited</p>
            <p className="text-lg font-semibold">${wallet?.totalDeposited.toFixed(2) || "0.00"}</p>
          </div>
          <div>
            <p className="text-xs text-primary-100 mb-1">Total Withdrawn</p>
            <p className="text-lg font-semibold">${wallet?.totalWithdrawn.toFixed(2) || "0.00"}</p>
          </div>
          <div>
            <p className="text-xs text-primary-100 mb-1">Total Transferred</p>
            <p className="text-lg font-semibold">${wallet?.totalTransferred.toFixed(2) || "0.00"}</p>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "deposit", label: "Deposit", icon: ArrowDownLeft },
              { id: "withdraw", label: "Withdraw", icon: ArrowUpRight },
              { id: "transfer", label: "Transfer", icon: Send },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction._id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg">{getTransactionIcon(transaction.type)}</div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.description || transaction.type.replace("_", " ")}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              transaction.type === "deposit" || transaction.type === "transfer_received"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {transaction.type === "deposit" || transaction.type === "transfer_received" ? "+" : "-"}$
                            {transaction.amount.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 text-sm">
                            {getStatusIcon(transaction.status)}
                            <span className="text-gray-500 capitalize">{transaction.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "deposit" && (
            <form onSubmit={handleDeposit} className="max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Deposit Funds</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processing ? "Processing..." : "Deposit Funds"}
              </button>
              <p className="mt-3 text-xs text-gray-500">
                Note: Stripe integration requires STRIPE_SECRET_KEY environment variable
              </p>
            </form>
          )}

          {activeTab === "withdraw" && (
            <form onSubmit={handleWithdraw} className="max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Funds</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={wallet?.balance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Available: ${wallet?.balance.toFixed(2)}</p>
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processing ? "Processing..." : "Request Withdrawal"}
              </button>
            </form>
          )}

          {activeTab === "transfer" && (
            <form onSubmit={handleTransfer} className="max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Funds</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient User ID</label>
                <input
                  type="text"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter user ID"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={wallet?.balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">Available: ${wallet?.balance.toFixed(2)}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="What's this for?"
                />
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processing ? "Processing..." : "Transfer Funds"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

