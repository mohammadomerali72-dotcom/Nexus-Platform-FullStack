"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Save } from "lucide-react"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Card, CardBody } from "../ui/Card"
import { useAuth } from "../../context/AuthContext"
import type { Entrepreneur, Investor, User } from "../../types"
//import { userService } from "../../services/userService"
import profileService from "../../services/profileService"
import toast from "react-hot-toast"

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: Entrepreneur | Investor
  onProfileUpdate: () => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, user, onProfileUpdate }) => {
  const { updateProfile } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form data with proper typing
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    bio: user.bio || "",
    location: (user as any).location || "",
    // Entrepreneur specific fields
    ...(user.role === "entrepreneur" && {
      startupName: (user as Entrepreneur).startupName || "",
      industry: (user as Entrepreneur).industry || "",
      fundingNeeded: (user as Entrepreneur).fundingNeeded || "",
      pitchSummary: (user as Entrepreneur).pitchSummary || "",
      teamSize: (user as Entrepreneur).teamSize || 0,
      foundedYear: (user as Entrepreneur).foundedYear || new Date().getFullYear(),
    }),
    // Investor specific fields
    ...(user.role === "investor" && {
      investmentInterests: Array.isArray((user as Investor).investmentInterests)
        ? (user as Investor).investmentInterests.join(", ")
        : "",
      investmentStage: Array.isArray((user as Investor).investmentStage)
        ? (user as Investor).investmentStage.join(", ")
        : "",
      portfolioCompanies: Array.isArray((user as Investor).portfolioCompanies)
        ? (user as Investor).portfolioCompanies.map((c: any) => (typeof c === "string" ? c : c.name)).join(", ")
        : "",
      totalInvestments: (user as Investor).totalInvestments || 0,
      minimumInvestment: (user as Investor).minimumInvestment || "",
      maximumInvestment: (user as Investor).maximumInvestment || "",
    }),
  })

  useEffect(() => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      bio: user.bio || "",
      location: (user as any).location || "",
      ...(user.role === "entrepreneur" && {
        startupName: (user as Entrepreneur).startupName || "",
        industry: (user as Entrepreneur).industry || "",
        fundingNeeded: (user as Entrepreneur).fundingNeeded || "",
        pitchSummary: (user as Entrepreneur).pitchSummary || "",
        teamSize: (user as Entrepreneur).teamSize || 0,
        foundedYear: (user as Entrepreneur).foundedYear || new Date().getFullYear(),
      }),
      ...(user.role === "investor" && {
        investmentInterests: Array.isArray((user as Investor).investmentInterests)
          ? (user as Investor).investmentInterests.join(", ")
          : "",
        investmentStage: Array.isArray((user as Investor).investmentStage)
          ? (user as Investor).investmentStage.join(", ")
          : "",
        portfolioCompanies: Array.isArray((user as Investor).portfolioCompanies)
          ? (user as Investor).portfolioCompanies.map((c: any) => (typeof c === "string" ? c : c.name)).join(", ")
          : "",
        totalInvestments: (user as Investor).totalInvestments || 0,
        minimumInvestment: (user as Investor).minimumInvestment || "",
        maximumInvestment: (user as Investor).maximumInvestment || "",
      }),
    })
  }, [user])

  if (!isOpen) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Split data into user data and profile data
      const { name, email, bio, location, ...profileData } = formData

      // Update user data
      await updateProfile(user.id, { name, email, bio, location } as Partial<User>)

      // Update profile-specific data
      if (user.role === "entrepreneur") {
        // Convert string values to appropriate types
        const entrepreneurData = {
          ...profileData,
          teamSize: Number(profileData.teamSize),
          foundedYear: Number(profileData.foundedYear),
        }
        await profileService.updateEntrepreneurProfile(user.id, entrepreneurData)
      } else if (user.role === "investor") {
        // Convert comma-separated strings to arrays
        const investorData = {
          investmentInterests: profileData.investmentInterests
            ? profileData.investmentInterests.split(",").map((item) => item.trim())
            : [],
          investmentStage: profileData.investmentStage
            ? profileData.investmentStage.split(",").map((item) => item.trim())
            : [],
          // For portfolioCompanies, we need to handle both string and object formats
          portfolioCompanies: profileData.portfolioCompanies
            ? profileData.portfolioCompanies.split(",").map((name) => ({
                name: name.trim(),
                industry: "",
                investmentAmount: "",
                currentStatus: "active",
                isPublic: true,
              }))
            : [],
          totalInvestments: Number(profileData.totalInvestments),
          minimumInvestment: profileData.minimumInvestment,
          maximumInvestment: profileData.maximumInvestment,
        }
        await profileService.updateInvestorProfile(user.id, investorData)
      }

      toast.success("Profile updated successfully!")
      onClose()
      onProfileUpdate() // Refresh profile data
    } catch (error: any) {
      console.error("Profile update failed:", error)
      const errorMessage = error.response?.data?.message || "Failed to update profile. Please try again."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full p-2">
            <X size={20} />
          </Button>
        </div>

        <CardBody className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-md text-error-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <Input
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., San Francisco, CA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            {/* Entrepreneur specific fields */}
            {user.role === "entrepreneur" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Startup Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Startup Name</label>
                    <Input name="startupName" value={formData.startupName || ""} onChange={handleInputChange} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <Input name="industry" value={formData.industry || ""} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Funding Needed</label>
                    <Input
                      name="fundingNeeded"
                      value={formData.fundingNeeded || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., $500K"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Size</label>
                    <Input name="teamSize" type="number" value={formData.teamSize || 0} onChange={handleInputChange} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Founded Year</label>
                    <Input
                      name="foundedYear"
                      type="number"
                      value={formData.foundedYear || new Date().getFullYear()}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pitch Summary</label>
                  <textarea
                    name="pitchSummary"
                    value={formData.pitchSummary || ""}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Describe your startup and what problem it solves..."
                  />
                </div>
              </div>
            )}

            {/* Investor specific fields */}
            {user.role === "investor" && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Investment Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Investment Interests</label>
                    <Input
                      name="investmentInterests"
                      value={formData.investmentInterests || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., Technology, Healthcare, Finance"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple interests with commas</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Investment Stage</label>
                    <Input
                      name="investmentStage"
                      value={formData.investmentStage || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., Seed, Series A, Series B"
                    />
                    <p className="text-xs text-gray-500 mt-1">Separate multiple stages with commas</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Investment</label>
                    <Input
                      name="minimumInvestment"
                      value={formData.minimumInvestment || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., $100K"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Investment</label>
                    <Input
                      name="maximumInvestment"
                      value={formData.maximumInvestment || ""}
                      onChange={handleInputChange}
                      placeholder="e.g., $2M"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio Companies</label>
                  <Input
                    name="portfolioCompanies"
                    value={formData.portfolioCompanies || ""}
                    onChange={handleInputChange}
                    placeholder="e.g., Company A, Company B, Company C"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separate multiple companies with commas</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Investments</label>
                  <Input
                    name="totalInvestments"
                    type="number"
                    value={formData.totalInvestments || 0}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={<Save size={18} />} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}












