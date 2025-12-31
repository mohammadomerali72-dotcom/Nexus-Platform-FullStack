"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Users, Bell, Calendar, TrendingUp, AlertCircle, PlusCircle } from "lucide-react"
import { Button } from "../../components/ui/Button"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Badge } from "../../components/ui/Badge"
import { CollaborationRequestCard } from "../../components/collaboration/CollaborationRequestCard"
import { InvestorCard } from "../../components/investor/InvestorCard"
import { useAuth } from "../../context/AuthContext"
import type { CollaborationRequest, Investor } from "../../types"
import { userService } from "../../services/userService"
import { collaborationService } from "../../services/collaborationService"

export const EntrepreneurDashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth()
  const [collaborationRequestsData, setCollaborationRequestsData] = useState<CollaborationRequest[]>([])
  const [recommendedInvestors, setRecommendedInvestors] = useState<Investor[]>([])
  const [loadingRequests, setLoadingRequests] = useState(true)
  const [loadingInvestors, setLoadingInvestors] = useState(true)

  useEffect(() => {
    // Only load data when auth is not loading and user object is available with ID
    if (!authLoading && user?.id) {
      loadCollaborationRequests()
      loadRecommendedInvestors()
    }
  }, [authLoading, user])

  const loadCollaborationRequests = async () => {
    if (!user?.id) {
      console.warn("[v0] No user ID available for loading collaboration requests")
      setCollaborationRequestsData([])
      setLoadingRequests(false)
      return
    }

    try {
      setLoadingRequests(true)
      const response = await collaborationService.getCollaborationRequests({ type: "received" })

      if (response.success) {
        // The backend already filters by entrepreneurId when type is 'received' for entrepreneurs
        const requests = response.data || response.requests || []
        setCollaborationRequestsData(requests)
      } else {
        console.error("Failed to load collaboration requests:", response.error)
        setCollaborationRequestsData([])
      }
    } catch (error) {
      console.error("Failed to load collaboration requests:", error)
      setCollaborationRequestsData([])
    } finally {
      setLoadingRequests(false)
    }
  }

  const loadRecommendedInvestors = async () => {
    try {
      setLoadingInvestors(true)
      const response = await userService.getUsers({ role: "investor", limit: 3 })

      if (response.success) {
        setRecommendedInvestors(response.data as unknown as Investor[])
      } else {
        console.error("Failed to load recommended investors:", response.error)
        setRecommendedInvestors([])
      }
    } catch (error) {
      console.error("Failed to load recommended investors:", error)
      setRecommendedInvestors([])
    } finally {
      setLoadingInvestors(false)
    }
  }

  const handleRequestStatusUpdate = async (requestId: string, status: "accepted" | "rejected") => {
    if (!requestId) {
      console.warn("[v0] No request ID provided for status update")
      return
    }

    // Update local state and optionally keep the list fresh.
    setCollaborationRequestsData((prevRequests) =>
      prevRequests.map((req) => (req.id === requestId ? { ...req, status } : req)),
    )
    // Optionally re-fetch to stay fully in sync:
    // await loadCollaborationRequests()
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) return null

  const pendingRequests = collaborationRequestsData.filter((req) => req.status === "pending")

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
          <p className="text-gray-600">Here's what's happening with your startup today</p>
        </div>

        <Link to="/investors">
          <Button leftIcon={<PlusCircle size={18} />}>Find Investors</Button>
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary-50 border border-primary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-full mr-4">
                <Bell size={20} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">Pending Requests</p>
                <h3 className="text-xl font-semibold text-primary-900">{pendingRequests.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-secondary-50 border border-secondary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-full mr-4">
                <Users size={20} className="text-secondary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-700">Total Connections</p>
                <h3 className="text-xl font-semibold text-secondary-900">
                  {collaborationRequestsData.filter((req) => req.status === "accepted").length}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-accent-50 border border-accent-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <Calendar size={20} className="text-accent-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-700">Upcoming Meetings</p>
                <h3 className="text-xl font-semibold text-accent-900">2</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-success-50 border border-success-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full mr-4">
                <TrendingUp size={20} className="text-success-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-success-700">Profile Views</p>
                <h3 className="text-xl font-semibold text-success-900">24</h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collaboration requests */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Collaboration Requests</h2>
              <Badge variant="primary">{pendingRequests.length} pending</Badge>
            </CardHeader>

            <CardBody>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : collaborationRequestsData.length > 0 ? (
                <div className="space-y-4">
                  {collaborationRequestsData.map((request) => (
                    <CollaborationRequestCard
                      key={request.id}
                      request={request}
                      onStatusUpdate={handleRequestStatusUpdate}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <AlertCircle size={24} className="text-gray-500" />
                  </div>
                  <p className="text-gray-600">No collaboration requests yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    When investors are interested in your startup, their requests will appear here
                  </p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recommended investors */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recommended Investors</h2>
              <Link to="/investors" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                View all
              </Link>
            </CardHeader>

            <CardBody className="space-y-4">
              {loadingInvestors ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : recommendedInvestors.length > 0 ? (
                recommendedInvestors.map((investor) => (
                  <InvestorCard key={investor.id} investor={investor} showActions={false} />
                ))
              ) : (
                <p className="text-gray-600 text-center py-4">No investors available</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}









