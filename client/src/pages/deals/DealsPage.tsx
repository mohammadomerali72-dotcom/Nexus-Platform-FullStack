"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { Search, Filter, DollarSign, TrendingUp, Users, Calendar } from "lucide-react"
import { Card, CardHeader, CardBody } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { Badge } from "../../components/ui/Badge"
import { Avatar } from "../../components/ui/Avatar"
import useSWR from "swr"
import { dealService } from "../../services/dealService"
import type { Deal, DealStatus } from "../../types"
import { Modal } from "../../components/ui/Modal"

export const DealsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<DealStatus[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Add Deal form local state
  const [form, setForm] = useState({
    startupName: "",
    startupLogo: "",
    startupIndustry: "",
    amount: "",
    equity: "",
    status: "Due Diligence" as DealStatus,
    stage: "",
    lastActivity: new Date().toISOString().split('T')[0],
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const statuses: DealStatus[] = ["Due Diligence", "Term Sheet", "Negotiation", "Closed", "Passed"]

  const toggleStatus = (status: DealStatus) => {
    setSelectedStatus((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Due Diligence":
        return "primary"
      case "Term Sheet":
        return "secondary"
      case "Negotiation":
        return "accent"
      case "Closed":
        return "success"
      case "Passed":
        return "error"
      default:
        return "gray"
    }
  }

  // SWR key depends on filters so server-side filtering is used
  const swrKey = useMemo(() => ["/deals", searchQuery, selectedStatus.join(",")], [searchQuery, selectedStatus])

  const {
    data: deals = [],
    isLoading,
    mutate,
  } = useSWR<Deal[]>(swrKey, () => dealService.list({ search: searchQuery, status: selectedStatus }), {
    revalidateOnFocus: false,
  })

  const handleCreate = async () => {
    setError("")
    
    if (!form.startupName.trim()) {
      setError("Startup Name is required")
      return
    }
    if (!form.amount.trim()) {
      setError("Amount is required")
      return
    }
    if (!form.equity.trim()) {
      setError("Equity is required")
      return
    }

    setCreating(true)
    
    try {
      const dealData = {
        startup: {
          name: form.startupName.trim(),
          logo: form.startupLogo.trim() || undefined,
          industry: form.startupIndustry.trim() || undefined,
        },
        amount: form.amount.trim(),
        equity: form.equity.trim(),
        status: form.status,
        stage: form.stage.trim() || undefined,
        lastActivity: form.lastActivity || new Date().toISOString(),
      }


      
      await dealService.create(dealData)
      
      // Reset form and close modal
      setForm({
        startupName: "",
        startupLogo: "",
        startupIndustry: "",
        amount: "",
        equity: "",
        status: "Due Diligence",
        stage: "",
        lastActivity: new Date().toISOString().split('T')[0],
      })
      setIsAddOpen(false)
      
      // Refresh the deals list
      await mutate()
      
    } catch (err: any) {
      console.error('Create deal error:', err)
      setError(err.message || "Failed to create deal. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setForm({
      startupName: "",
      startupLogo: "",
      startupIndustry: "",
      amount: "",
      equity: "",
      status: "Due Diligence",
      stage: "",
      lastActivity: new Date().toISOString().split('T')[0],
    })
    setError("")
  }

  const handleModalClose = () => {
    setIsAddOpen(false)
    resetForm()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Deals</h1>
          <p className="text-gray-600">Track and manage your investment pipeline</p>
        </div>

        <Button onClick={() => setIsAddOpen(true)}>Add Deal</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg mr-3">
                <DollarSign size={20} className="text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Investment</p>
                <p className="text-lg font-semibold text-gray-900">$4.3M</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-lg mr-3">
                <TrendingUp size={20} className="text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Deals</p>
                <p className="text-lg font-semibold text-gray-900">8</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-lg mr-3">
                <Users size={20} className="text-accent-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Portfolio Companies</p>
                <p className="text-lg font-semibold text-gray-900">12</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-success-100 rounded-lg mr-3">
                <Calendar size={20} className="text-success-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Closed This Month</p>
                <p className="text-lg font-semibold text-gray-900">2</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Search deals by startup name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={<Search size={18} />}
            fullWidth
          />
        </div>

        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Badge
                  key={status}
                  variant={selectedStatus.includes(status) ? getStatusColor(status) : "gray"}
                  className="cursor-pointer"
                  onClick={() => toggleStatus(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Deals table */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Active Deals</h2>
        </CardHeader>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Startup
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Equity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Activity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={7}>
                      Loading deals...
                    </td>
                  </tr>
                ) : deals.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-sm text-gray-500" colSpan={7}>
                      No deals found
                    </td>
                  </tr>
                ) : (
                  deals.map((deal) => (
                    <tr key={deal._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Avatar
                            src={deal.startup.logo || "/placeholder.svg?height=40&width=40&query=startup%20logo"}
                            alt={deal.startup.name}
                            size="sm"
                            className="flex-shrink-0"
                          />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{deal.startup.name}</div>
                            <div className="text-sm text-gray-500">{deal.startup.industry || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{deal.amount}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{deal.equity}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getStatusColor(deal.status)}>{deal.status}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{deal.stage || "—"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{new Date(deal.lastActivity).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Add Deal modal */}
      <Modal isOpen={isAddOpen} onClose={handleModalClose} title="Add Deal" size="lg">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Startup Name *"
            placeholder="e.g., TechWave AI"
            value={form.startupName}
            onChange={(e) => setForm((f) => ({ ...f, startupName: e.target.value }))}
            fullWidth
            required
          />
          <Input
            label="Industry"
            placeholder="e.g., FinTech"
            value={form.startupIndustry}
            onChange={(e) => setForm((f) => ({ ...f, startupIndustry: e.target.value }))}
            fullWidth
          />
          <Input
            label="Logo URL"
            placeholder="https://..."
            value={form.startupLogo}
            onChange={(e) => setForm((f) => ({ ...f, startupLogo: e.target.value }))}
            fullWidth
          />
          <Input
            label="Stage"
            placeholder="e.g., Series A"
            value={form.stage}
            onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
            fullWidth
          />
          <Input
            label="Amount *"
            placeholder="$1.5M"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            fullWidth
            required
          />
          <Input
            label="Equity *"
            placeholder="15%"
            value={form.equity}
            onChange={(e) => setForm((f) => ({ ...f, equity: e.target.value }))}
            fullWidth
            required
          />
          
          {/* Fixed Status Selection */}
          <div className="col-span-1 md:col-span-2">
            <div className="mb-2 text-sm font-medium text-gray-700">Status *</div>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <Badge
                  key={status}
                  variant={form.status === status ? getStatusColor(status) : "gray"}
                  className="cursor-pointer select-none"
                  onClick={() => setForm((f) => ({ ...f, status }))}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>
          
          <Input
            label="Last Activity"
            type="date"
            value={form.lastActivity}
            onChange={(e) => setForm((f) => ({ ...f, lastActivity: e.target.value }))}
            fullWidth
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Saving..." : "Save Deal"}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
