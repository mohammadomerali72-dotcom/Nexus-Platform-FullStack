"use client"

import React from "react"
import { User, Lock, Bell, Globe, Palette, CreditCard } from "lucide-react"
import { Card, CardHeader, CardBody } from "../../components/ui/Card"
import { Input } from "../../components/ui/Input"
import { Button } from "../../components/ui/Button"
import { Avatar } from "../../components/ui/Avatar"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

export const SettingsPage: React.FC = () => {
  const { user, changePassword, uploadAvatar, updateProfile,} = useAuth()
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [bio, setBio] = React.useState("")
  const [currentPwd, setCurrentPwd] = React.useState("")
  const [newPwd, setNewPwd] = React.useState("")
  const [confirmPwd, setConfirmPwd] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement | null>(null)
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isBusy, setIsBusy] = React.useState(false)

  React.useEffect(() => {
    if (!user) return
    setName(user.name || "")
    setEmail(user.email || "")
    setLocation(user.location || "")
    setBio(user.bio || "")
  }, [user])

  if (!user) return null

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md">
                <User size={18} className="mr-3" />
                Profile
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Lock size={18} className="mr-3" />
                Security
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Bell size={18} className="mr-3" />
                Notifications
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Globe size={18} className="mr-3" />
                Language
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Palette size={18} className="mr-3" />
                Appearance
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <CreditCard size={18} className="mr-3" />
                Billing
              </button>
            </nav>
          </CardBody>
        </Card>

        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar src={previewUrl || user.avatarUrl} alt={user.name} size="xl" />

                <div>
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    Change Photo
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const inputEl = e.currentTarget
                      const file = inputEl.files?.[0] || null
                      if (!file) return
                      setSelectedFile(file)
                      const url = URL.createObjectURL(file)
                      setPreviewUrl(url)
                      inputEl.value = ""
                    }}
                  />
                  <p className="mt-2 text-sm text-gray-500">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} />

                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

                <Input label="Role" value={user.role} disabled />

                <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setName(user.name || "")
                    setEmail(user.email || "")
                    setLocation(user.location || "")
                    setBio(user.bio || "")
                    setSelectedFile(null)
                    if (previewUrl) URL.revokeObjectURL(previewUrl)
                    setPreviewUrl(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    try {
                      setIsBusy(true)
                      const updates: any = {}
                      if (name !== user.name) updates.name = name
                      if (email && email !== user.email) updates.email = email
                      if ((location || "") !== (user.location || "")) updates.location = location
                      if ((bio || "") !== (user.bio || "")) updates.bio = bio

                      if (Object.keys(updates).length > 0) {
                        await updateProfile(user.id, updates)
                      }

                      if (selectedFile) {
                        await uploadAvatar?.(selectedFile)
                        toast.success("Profile photo uploaded successfully")
                        setSelectedFile(null)
                        if (previewUrl) URL.revokeObjectURL(previewUrl)
                        setPreviewUrl(null)
                      }

                      toast.success("Changes saved")
                    } catch (err: any) {
                      toast.error(err?.message || "Failed to save changes")
                    } finally {
                      setIsBusy(false)
                    }
                  }}
                  disabled={isBusy}
                >
                  Save Changes
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="pt-6  border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                  />

                  <Input
                    label="New Password"
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />

                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                  />

                  <div className="flex justify-end">
                    <Button
                      onClick={async () => {
                        if (!newPwd || newPwd !== confirmPwd) {
                          toast.error("New password and confirmation do not match")
                          return
                        }
                        try {
                          setIsBusy(true)
                          await changePassword?.(currentPwd, newPwd)
                          setCurrentPwd("")
                          setNewPwd("")
                          setConfirmPwd("")
                          toast.success("Password updated successfully")
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || err?.message || "Password update failed")
                        } finally {
                          setIsBusy(false)
                        }
                      }}
                      disabled={isBusy}
                    >
                      {isBusy ? "Updating..." : "Update Password"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}



