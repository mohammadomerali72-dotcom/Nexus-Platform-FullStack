"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { MessageCircle, Building2, MapPin, UserCircle, BarChart3, Briefcase, Send } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Button } from "../../components/ui/Button"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Badge } from "../../components/ui/Badge"
import { useAuth } from "../../context/AuthContext"
import profileService from "../../services/profileService"
import { collaborationService } from "../../services/collaborationService"
import type { Investor } from "../../types"
import { EditProfileModal } from "../../components/profile/EditProfileModal"
import { CollaborationRequestsList } from "../../components/collaboration/CollaborationRequestsList"
import toast from "react-hot-toast"

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [investor, setInvestor] = useState<Investor | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      loadInvestorProfile()
      if (currentUser?.role === "entrepreneur") {
        checkCollaborationStatus()
      }
    }
  }, [id, currentUser, authLoading])

  const loadInvestorProfile = async () => {
    try {
      setIsLoading(true)
      const targetId = id || currentUser?.id

      if (!targetId || targetId === "undefined" || targetId === "null") {
        console.warn("[v0] No valid user ID available for profile loading")
        setInvestor(null)
        return
      }

      console.log("[v0] Loading investor PROFILE for ID:", targetId)
      const res = await profileService.getInvestorProfile(targetId)

      const d = res?.data
      const p =
        d?.profile ??
        d?.user ?? // when falling back to /users/:id
        d?.data?.profile ??
        d?.data?.user ??
        d?.data ??
        d

      if (!p) {
        console.warn("[v0] Investor profile not found for user:", targetId)
        setInvestor(null)
      } else {
        const isUserPayload = p && !p.userId
        const u = isUserPayload ? p : typeof p.userId === "object" ? p.userId : {}
        const userId = (u?._id || u?.id || p.userId || targetId)?.toString()

        const mapped: Investor = {
          id: userId,
          name: u?.name || "",
          email: u?.email || "",
          role: "investor",
          avatarUrl: u?.avatarUrl || "",
          bio: (u?.bio ?? p.bio) || "",
          isOnline: u?.isOnline,
          createdAt: (u?.createdAt || new Date().toISOString()).toString(),
          lastSeen: u?.lastSeen,
          // Investor fields
          investmentInterests: Array.isArray(p.investmentInterests) ? p.investmentInterests : [],
          investmentStage: Array.isArray(p.investmentStage) ? p.investmentStage : [],
          portfolioCompanies: Array.isArray(p.portfolioCompanies)
            ? p.portfolioCompanies.map((c: any) => (typeof c === "string" ? c : c?.name || "")).filter(Boolean)
            : [],
          totalInvestments: Number(p.totalInvestments || 0),
          minimumInvestment: p.minimumInvestment || "",
          maximumInvestment: p.maximumInvestment || "",
          location: u?.location || p.location || "",
        }

        setInvestor(mapped)
      }
    } catch (error) {
      console.error("Failed to load investor profile:", error)
      setInvestor(null)
    } finally {
      setIsLoading(false)
    }
  }

  const checkCollaborationStatus = async () => {
    const targetId = id || currentUser?.id

    if (!currentUser?.id || !targetId || targetId === "undefined" || currentUser.role !== "entrepreneur") {
      return
    }

    try {
      const response = await collaborationService.getCollaborationRequests({ type: "sent" })

      if (response.success) {
        const hasRequested =
          response.requests?.some((req: any) => req.investorId === targetId && req.entrepreneurId === currentUser.id) ||
          false
        setHasRequestedCollaboration(hasRequested)
      } else {
        console.error("Failed to check collaboration status:", response.error)
      }
    } catch (error) {
      console.error("Failed to check collaboration status:", error)
    }
  }

  const handleSendRequest = async () => {
    const targetId = id || currentUser?.id

    if (!currentUser?.id || !targetId || targetId === "undefined" || currentUser.role !== "entrepreneur" || !investor) {
      console.warn("[v0] Missing required data for collaboration request")
      setRequestError("Missing required data for collaboration request")
      return
    }

    try {
      setRequestError(null)

      // Check if a request already exists before sending a new one
      const checkResponse = await collaborationService.getCollaborationRequests({
        type: "sent",
      })

      if (checkResponse.success) {
        const hasExistingRequest = checkResponse.requests?.some(
          (req: any) => req.entrepreneurId === currentUser.id && req.investorId === targetId,
        )

        if (hasExistingRequest) {
          setHasRequestedCollaboration(true)
          setRequestError("You already have a pending request with this investor")
          toast.error("You already have a pending request with this investor")
          return
        }
      }

      const response = await collaborationService.createRequest({
        entrepreneurId: currentUser.id,
        investorId: targetId,
        requestType: "investment",
        message: `I'm interested in discussing potential investment opportunities for my startup.`,
      })

      if (response.success) {
        setHasRequestedCollaboration(true)
        toast.success("Collaboration request sent successfully!")
      } else {
        console.error("Failed to send collaboration request:", response.error)
        setRequestError(response.error || "Failed to send collaboration request")

        // If the error is about an existing request, update the state
        if (response.error?.includes("already have a pending request")) {
          setHasRequestedCollaboration(true)
          toast.error("You already have a pending request with this investor")
        } else {
          toast.error(response.error || "Failed to send collaboration request")
        }
      }
    } catch (error: any) {
      console.error("Failed to send collaboration request:", error)
      const errorMessage = error.response?.data?.message || "Failed to send collaboration request"
      setRequestError(errorMessage)

      // If the error is about an existing request, update the state
      if (errorMessage.includes("already have a pending request")) {
        setHasRequestedCollaboration(true)
        toast.error("You already have a pending request with this investor")
      } else {
        toast.error(errorMessage)
      }
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading profile...</p>
      </div>
    )
  }

  if (!investor) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">The investor profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4 bg-transparent">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Check if the user is an investor
  if (investor.role !== "investor") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor Profile Not Found</h2>
        <p className="text-gray-600 mt-2">This profile belongs to an entrepreneur, not an investor.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4 bg-transparent">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const isCurrentUser = currentUser?.id === investor.id
  const isEntrepreneur = currentUser?.role === "entrepreneur"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={investor.avatarUrl}
              alt={investor.name}
              size="xl"
              status={investor.isOnline ? "online" : "offline"}
              className="mx-auto sm:mx-0"
            />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{investor.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Investor • {investor.totalInvestments || 0} investments
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {investor.location && (
                  <Badge variant="primary">
                    <MapPin size={14} className="mr-1" />
                    {investor.location}
                  </Badge>
                )}
                {investor.investmentStage?.map((stage, index) => (
                  <Badge key={index} variant="secondary" size="sm">
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${investor.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>
                    Message
                  </Button>
                </Link>

                {isEntrepreneur && (
                  <>
                    <Button
                      leftIcon={<Send size={18} />}
                      disabled={hasRequestedCollaboration}
                      onClick={handleSendRequest}
                    >
                      {hasRequestedCollaboration ? "Request Sent" : "Request Collaboration"}
                    </Button>
                    {requestError && <p className="text-error-500 text-sm mt-1">{requestError}</p>}
                  </>
                )}
              </>
            )}

            {isCurrentUser && (
              <Button variant="outline" leftIcon={<UserCircle size={18} />} onClick={() => setIsEditModalOpen(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{investor.bio || "No bio available yet."}</p>
            </CardBody>
          </Card>

          {/* Investment Interests */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Interests</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="text-md font-medium text-gray-900">Industries</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {investor.investmentInterests?.map((interest, index) => (
                      <Badge key={index} variant="primary" size="md">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900">Investment Stages</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {investor.investmentStage?.map((stage, index) => (
                      <Badge key={index} variant="secondary" size="md">
                        {stage}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-md font-medium text-gray-900">Investment Criteria</h3>
                  <ul className="mt-2 space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Strong founding team with domain expertise
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Clear market opportunity and product-market fit
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Scalable business model with strong unit economics
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-primary-600 rounded-full mt-1.5 mr-2"></span>
                      Potential for significant growth and market impact
                    </li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Portfolio Companies */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Portfolio Companies</h2>
              <span className="text-sm text-gray-500">{investor.portfolioCompanies?.length || 0} companies</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {investor.portfolioCompanies?.map((company, index) => (
                  <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                    <div className="p-3 bg-primary-50 rounded-md mr-3">
                      <Briefcase size={18} className="text-primary-700" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{company}</h3>
                      <p className="text-xs text-gray-500">Invested in 2022</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Investment Details */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Details</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-gray-500">Investment Range</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {investor.minimumInvestment || "N/A"} - {investor.maximumInvestment || "N/A"}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Total Investments</span>
                  <p className="text-md font-medium text-gray-900">{investor.totalInvestments || 0} companies</p>
                </div>

                <div>
                  <span className="text-sm text-gray-500">Typical Investment Timeline</span>
                  <p className="text-md font-medium text-gray-900">3-5 years</p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">Investment Focus</span>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">SaaS & B2B</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">FinTech</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: "60%" }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium">HealthTech</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div className="bg-primary-600 h-2 rounded-full" style={{ width: "40%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Investment Stats</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Successful Exits</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">4</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>

                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Avg. ROI</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">3.2x</p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>

                <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Active Investments</h3>
                      <p className="text-xl font-semibold text-primary-700 mt-1">
                        {investor.portfolioCompanies?.length || 0}
                      </p>
                    </div>
                    <BarChart3 size={24} className="text-primary-600" />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Collaboration Requests Section - Only show for the profile owner */}
      {isCurrentUser && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Collaboration Requests</h2>
          </CardHeader>
          <CardBody>
            <CollaborationRequestsList type="sent" />
          </CardBody>
        </Card>
      )}

      {/* Edit Profile Modal */}
      {isCurrentUser && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={investor}
          onProfileUpdate={loadInvestorProfile}
        />
      )}
    </div>
  )
}



