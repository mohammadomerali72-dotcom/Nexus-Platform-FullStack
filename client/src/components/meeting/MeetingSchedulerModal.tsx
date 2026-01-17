"use client"

import type React from "react"
import { useState } from "react"
import { Video, FileText, Calendar, Clock } from "lucide-react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Textarea } from "../ui/Textarea"
import toast from "react-hot-toast"
import api from "../../services/api" // Path to your Port 5000 bridge

interface MeetingSchedulerModalProps {
  isOpen: boolean
  onClose: () => void
  request: any // Information about the startup/investor
}

export const MeetingSchedulerModal: React.FC<MeetingSchedulerModalProps> = ({
  isOpen,
  onClose,
  request,
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

  // --- MILESTONE 3: SAVE TO MYSQL ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const payload = {
        title: formData.title || "Business Discussion",
        date: formData.date,
        time: formData.time,
        entrepreneurId: user.role === 'Entrepreneur' ? user.id : (request?.id || 4),
        investorId: user.role === 'Investor' ? user.id : (request?.id || 3),
      }

      // API Call to your Node.js server
      const response = await api.post('/meetings/schedule', payload);

      if (response.status === 201) {
        toast.success("Meeting saved to Database!");
        onClose();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Time slot conflict!");
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Collaboration Meeting">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <Input label="Title" name="title" value={formData.title} onChange={handleInputChange} required startAdornment={<FileText size={18} />} />
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" name="date" type="date" value={formData.date} onChange={handleInputChange} required startAdornment={<Calendar size={18} />} />
          <Input label="Time" name="time" type="time" value={formData.time} onChange={handleInputChange} required startAdornment={<Clock size={18} />} />
        </div>

        <Input label="Link/Location" name="location" value={formData.location} onChange={handleInputChange} startAdornment={<Video size={18} />} />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Agenda</label>
          <Textarea name="agenda" value={formData.agenda} onChange={handleInputChange} rows={3} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading} className="bg-blue-600 text-white font-bold">Confirm Booking</Button>
        </div>
      </form>
    </Modal>
  )
}