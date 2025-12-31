"use client"

import type React from "react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { format } from "date-fns"
import toast from "react-hot-toast"

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
  const getResponseText = () => {
    switch (response) {
      case "accepted":
        return "accept"
      case "rejected":
        return "decline"
      case "tentative":
        return "mark as tentative"
      default:
        return "respond to"
    }
  }

  const handleConfirm = () => {
    onConfirm()
    const responseText =
      response === "accepted" ? "accepted" : response === "rejected" ? "declined" : "marked as tentative"
    toast.success(`Meeting ${responseText} successfully!`)
  }

  const getResponseColor = () => {
    switch (response) {
      case "accepted":
        return "success"
      case "rejected":
        return "error"
      case "tentative":
        return "warning"
      default:
        return "primary"
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Confirm Meeting Response`}>
      <div className="space-y-4">
        <p>Are you sure you want to {getResponseText()} this meeting?</p>

        {meetingDetails && (
          <div className="p-3 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Meeting Details</h4>
            <p className="text-sm">
              <strong>Date:</strong> {format(new Date(meetingDetails.scheduledFor), "MMM d, yyyy")}
            </p>
            <p className="text-sm">
              <strong>Time:</strong> {format(new Date(meetingDetails.scheduledFor), "h:mm a")} -{" "}
              {format(
                new Date(new Date(meetingDetails.scheduledFor).getTime() + meetingDetails.duration * 60000),
                "h:mm a",
              )}
            </p>
            {meetingDetails.location && (
              <p className="text-sm">
                <strong>Location:</strong> {meetingDetails.location}
              </p>
            )}
            {meetingDetails.agenda && (
              <p className="text-sm">
                <strong>Agenda:</strong> {meetingDetails.agenda}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={getResponseColor()} onClick={handleConfirm}>
            Confirm {getResponseText()}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
