"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Wallet, Clock, Landmark, DollarSign, } from "lucide-react"
import { Card, CardHeader, CardBody } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import api from "../../services/api" 
import toast from "react-hot-toast"

export const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadWalletData()
  }, [])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : { id: 1 }

      const response = await api.get(`/payments/history/${user.id}`)
      const history = response.data
      
      setTransactions(history)

      const total = history.reduce((acc: number, curr: any) => {
        return curr.type === 'deposit' ? acc + Number(curr.amount) : acc - Number(curr.amount)
      }, 0)
      
      setBalance(total)
    } catch (err) {
      console.error("Database fetch failed")
    } finally {
      setLoading(false)
    }
  }

  const handleTransaction = async (type: 'deposit' | 'withdraw') => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setProcessing(true)
    try {
      const userStr = localStorage.getItem('user')
      const user = userStr ? JSON.parse(userStr) : { id: 1 }

      await api.post('/payments/pay', {
        amount: parseFloat(amount),
        type,
        userId: user.id,
        description: `Wallet ${type}`
      })

      toast.success(`${type.toUpperCase()} Successful!`)
      setAmount("")
      await loadWalletData() 
    } catch (err) {
      toast.error("Transaction failed. Check backend.")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="p-20 text-center font-bold text-blue-600">Connecting to MySQL...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <Landmark className="text-blue-600" size={32} />
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">My Wallet</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-900 rounded-3xl p-8 text-white shadow-2xl">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-widest">Available Balance</p>
          <h2 className="text-5xl font-black mt-2">${balance.toLocaleString()}</h2>
          <div className="mt-10 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase opacity-70">MySQL Synchronized</span>
            <Wallet size={20} className="opacity-40" />
          </div>
        </div>

        <Card className="lg:col-span-2 shadow-xl border-gray-100">
          <CardHeader className="bg-gray-50/50 border-b p-5 font-bold text-gray-700 uppercase text-xs">Quick Actions</CardHeader>
          <CardBody className="p-6">
            <div className="space-y-4">
              <Input 
                placeholder="0.00" 
                type="number"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                startAdornment={<DollarSign size={18} className="text-blue-600" />}
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => handleTransaction('deposit')} 
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl"
                >
                  {processing ? "Saving..." : "Deposit"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleTransaction('withdraw')} 
                  disabled={processing}
                  className="flex-1 border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 h-12 rounded-xl"
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="shadow-xl overflow-hidden border-0">
        <div className="p-5 bg-gray-900 text-white flex items-center gap-2">
          <Clock size={18} className="text-blue-400" />
          <h2 className="font-bold uppercase text-xs tracking-widest">Transaction History</h2>
        </div>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase font-black tracking-widest border-b">
                <tr>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Method</th>
                  <th className="px-8 py-4">Date</th>
                  <th className="px-8 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-16 text-gray-400 italic">No transactions found in database.</td></tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-blue-50/40 transition-all">
                      <td className="px-8 py-5">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black uppercase">Success</span>
                      </td>
                      <td className="px-8 py-5 text-sm font-bold text-gray-700 uppercase">{t.type}</td>
                      <td className="px-8 py-5 text-sm text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className={`px-8 py-5 text-right font-black text-lg ${t.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'deposit' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}