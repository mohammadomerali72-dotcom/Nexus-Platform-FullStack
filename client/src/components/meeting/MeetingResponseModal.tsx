"use client"

import type React from "react"
import { useState } from "react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Calendar, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import toast from "react-hot-toast"
import api from "../../services/api" // Bridge to your Port 5000 backend

interface MeetingResponseModalProps {
  isOpen: boolean
  onClose: () => void
  response: "accepted" | "rejected" | "tentative"
  onConfirm: () => void
  meetingDetails: any
}

export const MeetingResponseModal: React.FC<MeetingResponseModalProps> = ({
  isOpen,
  onClose,
  response,
  onConfirm,
  meetingDetails,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // MILESTONE 3: LOGIC TO UPDATE DATABASE
  const handleConfirm = async () => {
    if (!meetingDetails?.id) {
      toast.error("Meeting data is missing. Please try again.")
      return
    }

    setIsSubmitting(true)
    try {
      // Send the PUT request to your Node.js/MySQL server
      const backendStatus = response === "rejected" ? "rejected" : "accepted"
      
      const res = await api.put(`/meetings/respond/${meetingDetails.id}`, {
        status: backendStatus
      })

      if (res.status === 200 || res.data.status === "success") {
        toast.success(`Meeting ${backendStatus} successfully!`)
        onConfirm() // Refresh the dashboard list
        onClose()   // Close the modal
      }
    } catch (err: any) {
      console.error("Response Error:", err)
      toast.error("Failed to update meeting. Check if backend is running.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getResponseUI = () => {
    switch (response) {
      case "accepted":
        return {
          text: "Accept Invitation",
          description: "Are you sure you want to attend this meeting?",
          color: "text-green-600",
          bg: "bg-green-50",
          icon: <CheckCircle2 className="text-green-600" size={24} />
        }
      case "rejected":
        return {
          text: "Decline Invitation",
          description: "Are you sure you want to decline this meeting?",
          color: "text-red-600",
          bg: "bg-red-50",
          icon: <XCircle className="text-red-600" size={24} />
        }
      default:
        return {
          text: "Tentative Response",
          description: "Mark this meeting as tentative?",
          color: "text-amber-600",
          bg: "bg-amber-50",
          icon: <AlertCircle className="text-amber-600" size={24} />
        }
    }
  }

  const ui = getResponseUI()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={ui.text}>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Responsive Header Section */}
        <div className={`flex flex-col sm:flex-row items-center sm:items-start p-4 ${ui.bg} rounded-xl border border-opacity-20`}>
          <div className="mb-3 sm:mb-0 sm:mr-4">
            {ui.icon}
          </div>
          <div className="text-center sm:text-left">
            <h3 className={`font-bold text-lg ${ui.color}`}>{ui.text}</h3>
            <p className="text-sm text-gray-600">{ui.description}</p>
          </div>
        </div>

        {/* Meeting Summary Card */}
        {meetingDetails && (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Meeting Overview</span>
            </div>
            <div className="p-4 space-y-3">
              <h4 className="font-bold text-gray-900">{meetingDetails.title || "Collaboration Session"}</h4>
              
              <div className="flex items-center text-sm text-gray-600">
                <Calendar size={16} className="mr-2 text-primary-500" />
                <span>{meetingDetails.date || "Date not set"}</span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600">
                <Clock size={16} className="mr-2 text-primary-500" />
                <span>{meetingDetails.time || "Time not set"}</span>
              </div>
            </div>
          </div>
        )}

        {/* RESPONSIVE BUTTONS: Stack on Mobile, Row on Desktop */}
        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          
          <Button 
            onClick={handleConfirm} 
            disabled={isSubmitting}
            className={`w-full sm:w-auto font-bold px-8 ${
              response === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {isSubmitting ? "Updating Database..." : `Confirm ${response === 'accepted' ? 'Accept' : 'Decline'}`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}