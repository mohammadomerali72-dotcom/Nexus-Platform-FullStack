"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, X, MessageCircle, Calendar, Clock, MapPin, Video } from "lucide-react"
import type { CollaborationRequest } from "../../types"
import { Card, CardBody, CardFooter } from "../ui/Card"
import { Avatar } from "../ui/Avatar"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { collaborationService } from "../../services/collaborationService"
import { formatDistanceToNow, format } from "date-fns"
import { MeetingSchedulerModal } from "../meeting/MeetingSchedulerModal"
import { MeetingResponseModal } from "../meeting/MeetingResponseModal"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

interface CollaborationRequestCardProps {
  request: CollaborationRequest
  onStatusUpdate?: (requestId: string, status: "accepted" | "rejected") => void
  onMeetingScheduled?: (requestId: string, meetingDetails: any) => void
}

export const CollaborationRequestCard: React.FC<CollaborationRequestCardProps> = ({
  request,
  onStatusUpdate,
  onMeetingScheduled,
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Prefer populated investor from backend if present (via _investor), fallback to object form, else minimal
  const investorObj: any =
    (request as any)._investor || (typeof (request as any).investorId === "object" ? (request as any).investorId : null)

  // If no populated investor available, still render a minimal card using IDs
  const investorName = investorObj?.name || "Investor"
  const investorAvatar = investorObj?.avatarUrl || "/diverse-avatars.png"
  const investorIdForLinks = investorObj?._id || request.investorId

  const [isAcceptLoading, setIsAcceptLoading] = useState(false)
  const [isRejectLoading, setIsRejectLoading] = useState(false)
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false)
  const [isResponseOpen, setIsResponseOpen] = useState(false)
  const [meetingResponse, setMeetingResponse] = useState<"accepted" | "rejected" | "tentative">("accepted")

  const isEntrepreneur = user?.role === "entrepreneur"
  const canAct = isEntrepreneur && request.entrepreneurId === user?.id

  const handleAccept = async () => {
    setIsAcceptLoading(true)
    try {
      const result = await collaborationService.acceptRequest(request.id)
      if (result.success) {
        toast.success("Collaboration request accepted successfully!")
        onStatusUpdate?.(request.id, "accepted")
      } else {
        console.error("Failed to accept request:", result.error)
        toast.error(result.error || "Failed to accept request. Please try again.")
      }
    } catch (error) {
      console.error("Failed to accept request:", error)
      toast.error("Failed to accept request. Please try again.")
    } finally {
      setIsAcceptLoading(false)
    }
  }

  const handleReject = async () => {
    setIsRejectLoading(true)
    try {
      const result = await collaborationService.rejectRequest(request.id)
      if (result.success) {
        toast.success("Collaboration request declined")
        onStatusUpdate?.(request.id, "rejected")
      } else {
        console.error("Failed to reject request:", result.error)
        toast.error(result.error || "Failed to reject request. Please try again.")
      }
    } catch (error) {
      console.error("Failed to reject request:", error)
      toast.error("Failed to reject request. Please try again.")
    } finally {
      setIsRejectLoading(false)
    }
  }

  const handleMessage = () => {
    if (!investorIdForLinks) return
    navigate(`/chat/${investorIdForLinks}`)
  }

  const handleViewProfile = () => {
    if (!investorIdForLinks) return
    navigate(`/profile/investor/${investorIdForLinks}`)
  }

  const handleScheduleMeeting = () => {
    setIsSchedulerOpen(true)
  }

  const handleRespondToMeeting = (response: "accepted" | "rejected" | "tentative") => {
    setMeetingResponse(response)
    setIsResponseOpen(true)
  }

  const handleMeetingScheduled = (meetingDetails: any) => {
    if (onMeetingScheduled) {
      onMeetingScheduled(request.id, meetingDetails)
    }
    setIsSchedulerOpen(false)
  }

  const handleMeetingResponse = async () => {
    try {
      await collaborationService.respondToMeeting(request.id, { response: meetingResponse })
      setIsResponseOpen(false)
    } catch (error) {
      console.error("Failed to respond to meeting:", error)
      toast.error("Failed to respond to meeting. Please try again.")
    }
  }

  const getStatusBadge = () => {
    switch (request.status) {
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "accepted":
        return <Badge variant="success">Accepted</Badge>
      case "rejected":
        return <Badge variant="error">Declined</Badge>
      default:
        return null
    }
  }

  const getMeetingStatusBadge = () => {
    if (!request.meetingScheduled || !request.meetingDetails) return null

    switch (request.meetingDetails.status) {
      case "pending":
        return <Badge variant="warning">Meeting Pending</Badge>
      case "confirmed":
        return <Badge variant="success">Meeting Confirmed</Badge>
      case "cancelled":
        return <Badge variant="error">Meeting Cancelled</Badge>
      case "completed":
        return <Badge variant="secondary">Meeting Completed</Badge>
      default:
        return null
    }
  }

  return (
    <>
      <Card className="transition-all duration-300">
        <CardBody className="flex flex-col">
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <Avatar
                src={investorAvatar}
                alt={investorName}
                size="md"
                status={investorObj?.isOnline ? "online" : "offline"}
                className="mr-3"
              />

              <div>
                <h3 className="text-md font-semibold text-gray-900">{investorName}</h3>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              {getStatusBadge()}
              {getMeetingStatusBadge()}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">{request.message}</p>

            {request.requestType === "investment" && request.proposedAmount && (
              <p className="text-sm text-gray-800 mt-2">
                <strong>Proposed Amount:</strong> {request.proposedAmount}
              </p>
            )}

            {request.proposedTerms && (
              <p className="text-sm text-gray-800 mt-1">
                <strong>Terms:</strong> {request.proposedTerms}
              </p>
            )}
          </div>

          {/* Meeting details */}
          {request.meetingScheduled && request.meetingDetails && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Scheduled Meeting</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center">
                  <Calendar size={14} className="mr-2 text-gray-500" />
                  <span>{format(new Date(request.meetingDetails.scheduledFor), "MMM d, yyyy")}</span>
                </div>

                <div className="flex items-center">
                  <Clock size={14} className="mr-2 text-gray-500" />
                  <span>{format(new Date(request.meetingDetails.scheduledFor), "h:mm a")}</span>
                  <span className="mx-1">-</span>
                  <span>
                    {format(
                      new Date(
                        new Date(request.meetingDetails.scheduledFor).getTime() +
                          request.meetingDetails.duration * 60000,
                      ),
                      "h:mm a",
                    )}
                  </span>
                </div>

                {request.meetingDetails.location && (
                  <div className="flex items-center">
                    <MapPin size={14} className="mr-2 text-gray-500" />
                    <span>{request.meetingDetails.location}</span>
                  </div>
                )}

                {request.meetingDetails.meetingLink && (
                  <div className="flex items-center">
                    <Video size={14} className="mr-2 text-gray-500" />
                    <a
                      href={request.meetingDetails.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-500"
                    >
                      Join Meeting
                    </a>
                  </div>
                )}

                {request.meetingDetails.agenda && (
                  <div className="col-span-full">
                    <p className="text-xs text-gray-600 mt-1">
                      <strong>Agenda:</strong> {request.meetingDetails.agenda}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>

        <CardFooter className="border-t border-gray-100 bg-gray-50">
          {request.status === "pending" ? (
            canAct ? (
              <div className="flex justify-between w-full">
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<X size={16} />}
                    onClick={handleReject}
                    disabled={isRejectLoading || isAcceptLoading}
                  >
                    {isRejectLoading ? "Declining..." : "Decline"}
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<Check size={16} />}
                    onClick={handleAccept}
                    disabled={isAcceptLoading || isRejectLoading}
                  >
                    {isAcceptLoading ? "Accepting..." : "Accept"}
                  </Button>
                </div>
                <Button variant="primary" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
                  Message
                </Button>
              </div>
            ) : (
              <div className="flex justify-end w-full">
                <Button variant="primary" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
                  Message
                </Button>
              </div>
            )
          ) : request.status === "accepted" ? (
            <div className="flex justify-between w-full">
              {!request.meetingScheduled ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleScheduleMeeting}>
                    Schedule Meeting
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
                      Message
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleViewProfile}>
                      View Profile
                    </Button>
                  </div>
                </>
              ) : request.meetingDetails?.status === "pending" ? (
                <div className="flex justify-between w-full">
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleRespondToMeeting("accepted")}>
                      Accept Meeting
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRespondToMeeting("tentative")}>
                      Tentative
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRespondToMeeting("rejected")}>
                      Decline Meeting
                    </Button>
                  </div>
                  <Button variant="primary" size="sm" onClick={handleViewProfile}>
                    View Profile
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between w-full">
                  <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
                    Message
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleViewProfile}>
                    View Profile
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-between w-full">
              <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
                Message
              </Button>
              <Button variant="primary" size="sm" onClick={handleViewProfile}>
                View Profile
              </Button>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Meeting Scheduler Modal */}
      {isSchedulerOpen && (
        <MeetingSchedulerModal
          isOpen={isSchedulerOpen}
          onClose={() => setIsSchedulerOpen(false)}
          request={request}
          onMeetingScheduled={handleMeetingScheduled}
        />
      )}

      {/* Meeting Response Modal */}
      {isResponseOpen && (
        <MeetingResponseModal
          isOpen={isResponseOpen}
          onClose={() => setIsResponseOpen(false)}
          response={meetingResponse}
          onConfirm={handleMeetingResponse}
          meetingDetails={request.meetingDetails}
        />
      )}
    </>
  )
}
