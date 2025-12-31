"use client"

import type React from "react"
import { useState } from "react"
import { MapPin, Video, FileText } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Textarea } from "../ui/Textarea"
import { collaborationService } from "../../services/collaborationService"
import toast from "react-hot-toast"

interface MeetingSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  request: any
  onMeetingScheduled: (meetingDetails: any) => void
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  request,
  onMeetingScheduled,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    scheduledFor: "",
    duration: 30,
    location: "",
    meetingLink: "",
    agenda: "",
  })
  const [error, setError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Check for meeting conflicts first
      const conflictCheck = await collaborationService.checkMeetingConflict(
        formData.scheduledFor,
        formData.duration,
        request.id,
      )

      if (conflictCheck.success && conflictCheck.data.hasConflict) {
        setError("This meeting time conflicts with existing meetings. Please choose a different time.")
        toast.error("Meeting time conflict detected")
        setIsLoading(false)
        return
      }

      // Schedule the meeting
      const response = await collaborationService.scheduleMeeting(request.id, formData)

      if (response.success) {
        toast.success("Meeting scheduled successfully!")
        onMeetingScheduled(response.data.meeting)
        onClose()
      } else {
        setError(response.error || "Failed to schedule meeting")
        toast.error(response.error || "Failed to schedule meeting")
      }
    } catch (error) {
      console.error("Failed to schedule meeting:", error)
      setError("Failed to schedule meeting. Please try again.")
      toast.error("Failed to schedule meeting. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Meeting">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <Input
              type="datetime-local"
              id="scheduledFor"
              name="scheduledFor"
              value={formData.scheduledFor}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin size={16} className="inline mr-1" />
            Location
          </label>
          <Input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            placeholder="e.g., Conference Room A, or physical address"
          />
        </div>

        <div>
          <label htmlFor="meetingLink" className="block text-sm font-medium text-gray-700 mb-1">
            <Video size={16} className="inline mr-1" />
            Meeting Link (optional)
          </label>
          <Input
            type="url"
            id="meetingLink"
            name="meetingLink"
            value={formData.meetingLink}
            onChange={handleInputChange}
            placeholder="https://meet.google.com/xxx-xxx-xxx"
          />
        </div>

        <div>
          <label htmlFor="agenda" className="block text-sm font-medium text-gray-700 mb-1">
            <FileText size={16} className="inline mr-1" />
            Agenda
          </label>
          <Textarea
            id="agenda"
            name="agenda"
            value={formData.agenda}
            onChange={handleInputChange}
            placeholder="What will be discussed in this meeting?"
            rows={3}
          />
        </div>

        {error && <div className="p-3 bg-error-50 text-error-700 rounded-md">{error}</div>}

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Scheduling..." : "Schedule Meeting"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
