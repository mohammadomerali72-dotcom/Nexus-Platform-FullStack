"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, DollarSign, Send } from "lucide-react"
import { Avatar } from "../../components/ui/Avatar"
import { Button } from "../../components/ui/Button"
import { Card, CardBody, CardHeader } from "../../components/ui/Card"
import { Badge } from "../../components/ui/Badge"
import { useAuth } from "../../context/AuthContext"
import profileService from "../../services/profileService"
import { collaborationService } from "../../services/collaborationService"
import type { Entrepreneur } from "../../types"
import { EditProfileModal } from "../../components/profile/EditProfileModal"
import { CollaborationRequestsList } from "../../components/collaboration/CollaborationRequestsList"
import toast from "react-hot-toast"

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user: currentUser, isLoading: authLoading } = useAuth()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [entrepreneur, setEntrepreneur] = useState<Entrepreneur | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading) {
      loadEntrepreneurProfile()
      if (currentUser?.role === "investor") {
        checkCollaborationStatus()
      }
    }
  }, [id, currentUser, authLoading])

  const loadEntrepreneurProfile = async () => {
    try {
      setIsLoading(true)
      const targetId = id || currentUser?.id

      if (!targetId || targetId === "undefined" || targetId === "null") {
        console.warn("[v0] No valid user ID available for profile loading")
        setEntrepreneur(null)
        return
      }

      console.log("[v0] Loading entrepreneur PROFILE for ID:", targetId)
      const res = await profileService.getEntrepreneurProfile(targetId)

      const d = res?.data
      const p =
        d?.profile ??
        d?.user ?? // when falling back to /users/:id
        d?.data?.profile ??
        d?.data?.user ??
        d?.data ??
        d

      if (!p) {
        console.warn("[v0] Entrepreneur profile not found for user:", targetId)
        setEntrepreneur(null)
      } else {
        // p may be a profile (with userId) or a user
        const isUserPayload = p && !p.userId // if no userId field, treat as user
        const u = isUserPayload ? p : typeof p.userId === "object" ? p.userId : {}
        const userId = (u?._id || u?.id || p.userId || targetId)?.toString()

        const mapped: Entrepreneur = {
          id: userId,
          name: u?.name || "",
          email: u?.email || "",
          role: "entrepreneur",
          avatarUrl: u?.avatarUrl || "",
          bio: (u?.bio ?? p.bio) || "",
          isOnline: u?.isOnline,
          createdAt: (u?.createdAt || new Date().toISOString()).toString(),
          lastSeen: u?.lastSeen,
          // Business fields from profile (fallbacks maintained)
          startupName: p.startupName || "",
          pitchSummary: p.pitchSummary || "",
          fundingNeeded: p.fundingNeeded || "",
          industry: p.industry || "",
          location: u?.location || p.location || "",
          foundedYear: Number(p.foundedYear || 0),
          teamSize: Number(p.teamSize || 0),
          website: u?.website || p.website,
          linkedin: u?.linkedin || p.linkedin,
        }

        setEntrepreneur(mapped)
      }
    } catch (error) {
      console.error("Failed to load entrepreneur profile:", error)
      setEntrepreneur(null)
    } finally {
      setIsLoading(false)
    }
  }

  const checkCollaborationStatus = async () => {
    const targetId = id || currentUser?.id

    if (!currentUser?.id || !targetId || targetId === "undefined" || currentUser.role !== "investor") {
      return
    }

    try {
      const response = await collaborationService.getCollaborationRequests({ type: "sent" })

      if (response.success) {
        const hasRequested =
          response.requests?.some((req: any) => req.entrepreneurId === targetId && req.investorId === currentUser.id) ||
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

    if (!currentUser?.id || !targetId || targetId === "undefined" || currentUser.role !== "investor" || !entrepreneur) {
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
          (req: any) => req.investorId === currentUser.id && req.entrepreneurId === targetId,
        )

        if (hasExistingRequest) {
          setHasRequestedCollaboration(true)
          setRequestError("You already have a pending request with this entrepreneur")
          toast.error("You already have a pending request with this entrepreneur")
          return
        }
      }

      const response = await collaborationService.createRequest({
        investorId: currentUser.id,
        entrepreneurId: targetId,
        requestType: "investment",
        message: `I'm interested in learning more about ${entrepreneur.startupName || entrepreneur.name} and would like to explore potential investment opportunities.`,
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
          toast.error("You already have a pending request with this entrepreneur")
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
        toast.error("You already have a pending request with this entrepreneur")
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

  if (!entrepreneur) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
        <p className="text-gray-600 mt-2">The profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4 bg-transparent">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Check if the user is an entrepreneur
  if (entrepreneur.role !== "entrepreneur") {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur Profile Not Found</h2>
        <p className="text-gray-600 mt-2">This profile belongs to an investor, not an entrepreneur.</p>
        <Link to="/dashboard">
          <Button variant="outline" className="mt-4 bg-transparent">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  const isCurrentUser = currentUser?.id === entrepreneur.id
  const isInvestor = currentUser?.role === "investor"

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? "online" : "offline"}
              className="mx-auto sm:mx-0"
            />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                {entrepreneur.role === "entrepreneur" ? "Entrepreneur" : "Founder"}
                {entrepreneur.startupName && ` at ${entrepreneur.startupName}`}
              </p>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {entrepreneur.industry && <Badge variant="primary">{entrepreneur.industry}</Badge>}
                {entrepreneur.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {entrepreneur.location}
                  </Badge>
                )}
                {entrepreneur.foundedYear && (
                  <Badge variant="accent">
                    <Calendar size={14} className="mr-1" />
                    Founded {entrepreneur.foundedYear}
                  </Badge>
                )}
                {entrepreneur.teamSize && (
                  <Badge variant="secondary">
                    <Users size={14} className="mr-1" />
                    {entrepreneur.teamSize} team members
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>
                    Message
                  </Button>
                </Link>

                {isInvestor && (
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
              <p className="text-gray-700">{entrepreneur.bio || "No bio available yet."}</p>
            </CardBody>
          </Card>

          {/* Startup Description */}
          {entrepreneur.startupName && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">About {entrepreneur.startupName}</h3>
                    <p className="text-gray-700 mt-1">
                      {entrepreneur.pitchSummary || "Startup description coming soon."}
                    </p>
                  </div>

                  {entrepreneur.industry && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900">Industry</h3>
                      <p className="text-gray-700 mt-1">{entrepreneur.industry}</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Team */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Team</h2>
              <span className="text-sm text-gray-500">{entrepreneur.teamSize || 1} members</span>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center p-3 border border-gray-200 rounded-md">
                  <Avatar src={entrepreneur.avatarUrl} alt={entrepreneur.name} size="md" className="mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{entrepreneur.name}</h3>
                    <p className="text-xs text-gray-500">Founder & CEO</p>
                  </div>
                </div>

                {(entrepreneur.teamSize || 1) > 1 && (
                  <div className="flex items-center justify-center p-3 border border-dashed border-gray-200 rounded-md">
                    <p className="text-sm text-gray-500">+ {(entrepreneur.teamSize || 1) - 1} more team members</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          {entrepreneur.fundingNeeded && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Funding</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Seeking</span>
                    <div className="flex items-center mt-1">
                      <DollarSign size={18} className="text-accent-600 mr-1" />
                      <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Contact</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="text-md font-medium text-gray-900">{entrepreneur.email}</p>
                </div>
                {entrepreneur.website && (
                  <div>
                    <span className="text-sm text-gray-500">Website</span>
                    <a
                      href={entrepreneur.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-md font-medium text-primary-600 hover:text-primary-500 block"
                    >
                      {entrepreneur.website}
                    </a>
                  </div>
                )}
                {entrepreneur.linkedin && (
                  <div>
                    <span className="text-sm text-gray-500">LinkedIn</span>
                    <a
                      href={entrepreneur.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-md font-medium text-primary-600 hover:text-primary-500 block"
                    >
                      LinkedIn Profile
                    </a>
                  </div>
                )}
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
            <CollaborationRequestsList type="received" />
          </CardBody>
        </Card>
      )}

      {/* Edit Profile Modal */}
      {isCurrentUser && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={entrepreneur}
          onProfileUpdate={loadEntrepreneurProfile}
        />
      )}
    </div>
  )
}


















