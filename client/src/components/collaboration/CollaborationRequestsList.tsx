"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { CollaborationRequestCard } from "./CollaborationRequestCard"
import { collaborationService } from "../../services/collaborationService"
import { useAuth } from "../../context/AuthContext"
import { Button } from "../ui/Button"
import { RefreshCw } from "lucide-react"

interface CollaborationRequestsListProps {
  type?: "received" | "sent"
  status?: "pending" | "accepted" | "rejected"
}

export const CollaborationRequestsList: React.FC<CollaborationRequestsListProps> = ({ type = "received", status }) => {
  const [requests, setRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const loadRequests = async () => {
    if (!user) return

    setIsLoading(true)
    setError(null)

    try {
      const filters: any = { type }
      if (status) filters.status = status

      // Explicitly scope by current user for clarity with backend filters
      if (type === "received") {
        if (user.role === "entrepreneur") {
          filters.entrepreneurId = user.id
        } else if (user.role === "investor") {
          filters.investorId = user.id
        }
      } else if (type === "sent") {
        if (user.role === "investor") {
          filters.investorId = user.id
        } else if (user.role === "entrepreneur") {
          filters.entrepreneurId = user.id
        }
      }

      const response = await collaborationService.getCollaborationRequests(filters)

      if (response.success) {
        const raw = response.requests || response.data || []
        // Normalize: ensure `id` is present and preserve populated user objects
        const normalized = raw.map((doc: any) => {
          const investorIsObject = typeof doc.investorId === "object" && doc.investorId !== null
          const entrepreneurIsObject = typeof doc.entrepreneurId === "object" && doc.entrepreneurId !== null

          return {
            ...doc,
            id: doc.id || doc._id,
            _investor: investorIsObject ? doc.investorId : undefined,
            _entrepreneur: entrepreneurIsObject ? doc.entrepreneurId : undefined,
            investorId: investorIsObject ? doc.investorId._id : doc.investorId,
            entrepreneurId: entrepreneurIsObject ? doc.entrepreneurId._id : doc.entrepreneurId,
          }
        })
        setRequests(normalized)
      } else {
        setError(response.error || "Failed to load collaboration requests")
      }
    } catch (error) {
      console.error("Error loading collaboration requests:", error)
      setError("Failed to load collaboration requests")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [user, type, status])

  const handleStatusUpdate = (requestId: string, newStatus: "accepted" | "rejected") => {
    setRequests((prev) =>
      prev.map((request) => (request.id === requestId ? { ...request, status: newStatus } : request)),
    )
  }

  const handleMeetingScheduled = (requestId: string, meetingDetails: any) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId ? { ...request, meetingScheduled: true, meetingDetails } : request,
      ),
    )
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading requests...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error-600 mb-4">{error}</p>
        <Button onClick={loadRequests} leftIcon={<RefreshCw size={16} />}>
          Try Again
        </Button>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-gray-50 rounded-lg p-8 max-w-md mx-auto">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No collaboration requests yet</h3>
          <p className="text-gray-600">
            {type === "received"
              ? "When investors are interested in your startup, their requests will appear here"
              : "Your sent collaboration requests will appear here"}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {type === "received" ? "Received Requests" : "Sent Requests"}
        </h2>
        <Button variant="outline" size="sm" onClick={loadRequests} leftIcon={<RefreshCw size={16} />}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <CollaborationRequestCard
            key={request.id}
            request={request}
            onStatusUpdate={handleStatusUpdate}
            onMeetingScheduled={handleMeetingScheduled}
          />
        ))}
      </div>
    </div>
  )
}



