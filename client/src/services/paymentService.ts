import api from "./api"

export interface Wallet {
  balance: number
  currency: string
  totalDeposited: number
  totalWithdrawn: number
  totalTransferred: number
  isActive: boolean
  isFrozen: boolean
}

export interface Transaction {
  _id: string
  userId: string
  type: "deposit" | "withdraw" | "transfer_sent" | "transfer_received"
  amount: number
  currency: string
  status: "pending" | "completed" | "failed" | "cancelled"
  recipientId?: string
  recipientName?: string
  recipientEmail?: string
  description?: string
  failureReason?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionResponse {
  success: boolean
  transactions: Transaction[]
  pagination: {
    total: number
    limit: number
    skip: number
    hasMore: boolean
  }
}

class PaymentService {
  async getWallet(): Promise<Wallet> {
    const response = await api.get("/payments/wallet")
    return response.data.wallet
  }

  async createDepositIntent(amount: number): Promise<{ clientSecret: string; transactionId: string }> {
    const response = await api.post("/payments/deposit/intent", { amount })
    return response.data
  }

  async confirmDeposit(transactionId: string): Promise<{ transaction: Transaction; wallet: Wallet }> {
    const response = await api.post("/payments/deposit/confirm", { transactionId })
    return response.data
  }

  async requestWithdrawal(amount: number, bankAccount?: string): Promise<{ transaction: Transaction; wallet: Wallet }> {
    const response = await api.post("/payments/withdraw", { amount, bankAccount })
    return response.data
  }

  async transferFunds(
    recipientId: string,
    amount: number,
    description?: string,
  ): Promise<{ transaction: Transaction; wallet: Wallet }> {
    const response = await api.post("/payments/transfer", {
      recipientId,
      amount,
      description,
    })
    return response.data
  }

  async getTransactions(params?: {
    limit?: number
    skip?: number
    status?: string
    type?: string
  }): Promise<TransactionResponse> {
    const response = await api.get("/payments/transactions", { params })
    return response.data
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await api.get(`/payments/transactions/${id}`)
    return response.data.transaction
  }
}

export default new PaymentService()
