"use client"

import type React from "react"
import { useState } from "react"
import { Video, FileText, Calendar, Clock } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Textarea } from "../ui/Textarea"
import toast from "react-hot-toast"
import api from "../../services/api" // Bridge to your Port 5000 backend

interface MeetingSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  request: any // Contains info about the person you are booking with
  onMeetingsScheduled?: (meetingDetails: any) => void
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  request,
  onMeetingsScheduled,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    agenda: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  // --- MILESTONE 3: FULLY FUNCTIONAL SCHEDULING LOGIC ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Get current logged-in user from localStorage
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;

      if (!currentUser) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // 2. Prepare payload for XAMPP MySQL
      // We determine who is the entrepreneur and who is the investor based on current role
      const payload = {
        title: formData.title || `Discussion regarding Nexus Project`,
        date: formData.date, 
        time: formData.time, 
        entrepreneurId: currentUser.role === 'Entrepreneur' ? currentUser.id : (request?.entrepreneurId || 1),
        investorId: currentUser.role === 'Investor' ? currentUser.id : (request?.investorId || 1),
      }

      // 3. Call your Node.js API
      const response = await api.post('/meetings/schedule', payload);

      if (response.status === 201 || response.data.status === "success") {
        toast.success("Meeting saved to MySQL Database!");
        if (onMeetingsScheduled) onMeetingsScheduled(response.data.meeting);
        
        // Reset and close
        setFormData({ title: "", date: "", time: "", location: "", agenda: "" });
        onClose();
      }
    } catch (error: any) {
      // MILESTONE 3 Requirement: Show Conflict Detection Errors
      const errorMessage = error.response?.data?.message || "Time slot conflict! Try another time.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Collaboration Meeting">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <Input
            label="Meeting Title"
            name="title"
            placeholder="e.g. Seed Funding Pitch"
            value={formData.title}
            onChange={handleInputChange}
            required
            startAdornment={<FileText size={18} className="text-gray-400" />}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            startAdornment={<Calendar size={18} className="text-gray-400" />}
          />
          <Input
            label="Time"
            name="time"
            type="time"
            value={formData.time}
            onChange={handleInputChange}
            required
            startAdornment={<Clock size={18} className="text-gray-400" />}
          />
        </div>

        <Input
          label="Location or Video Link"
          name="location"
          placeholder="Zoom, Google Meet, or Office address"
          value={formData.location}
          onChange={handleInputChange}
          startAdornment={<Video size={18} className="text-gray-400" />}
        />

        {/* FIX: Handled label manually to avoid TypeScript property errors */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Meeting Agenda</label>
          <Textarea
            name="agenda"
            placeholder="Briefly describe the purpose of this call..."
            value={formData.agenda}
            onChange={handleInputChange}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-bold shadow-md"
          >
            Confirm Booking
          </Button>
        </div>
      </form>
    </Modal>
  )
}