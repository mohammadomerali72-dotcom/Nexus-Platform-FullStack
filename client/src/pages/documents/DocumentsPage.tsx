"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { FileText, Upload, Download, Trash2, Share2 } from "lucide-react"
import { Card, CardHeader, CardBody } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import { Badge } from "../../components/ui/Badge"
import toast from "react-hot-toast"

type DocumentType = {
  _id: string
  filename: string
  currentVersion: number
  versions: any[]
  createdAt: string
  status?: string
}

type FilterType = "all" | "recent" | "shared" | "starred" | "trash"

export const DocumentsPage: React.FC = () => {
  const API_BASE = import.meta.env.VITE_API_URL
  const [documents, setDocuments] = useState<DocumentType[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<FilterType>("all")
  const [storageUsed, setStorageUsed] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const signatureInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})

  const TOKEN_STORAGE_KEY = "business_nexus_token"
  const token = localStorage.getItem(TOKEN_STORAGE_KEY)

  const TOTAL_STORAGE = 20 * 1024 * 1024 * 1024 // 20 GB in bytes
  const storageUsedGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(2)
  const storageAvailableGB = ((TOTAL_STORAGE - storageUsed) / (1024 * 1024 * 1024)).toFixed(2)
  const storagePercentage = ((storageUsed / TOTAL_STORAGE) * 100).toFixed(0)

  useEffect(() => {
    fetchDocuments()
  }, [])

  useEffect(() => {
    const totalSize = documents.reduce((acc, doc) => {
      const docSize = doc.versions.reduce((vAcc, v) => vAcc + (v.size || 0), 0)
      return acc + docSize
    }, 0)
    setStorageUsed(totalSize)
  }, [documents])

  const fetchDocuments = async () => {
    if (!token) return
    const res = await fetch(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setDocuments(data.documents || [])
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      handleUpload(e.target.files[0])
    }
  }

  const handleUpload = async (fileToUpload?: File) => {
    const uploadFile = fileToUpload || file
    if (!uploadFile) {
      toast.error("Please choose a file to upload")
      return
    }
    if (!token) {
      toast.error("You must be logged in to upload files")
      return
    }
    setLoading(true)

    const form = new FormData()
    form.append("document", uploadFile)

    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (res.ok) {
        toast.success("Document uploaded successfully!")
        await fetchDocuments()
        setFile(null)
        // Reset file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]') as NodeListOf<HTMLInputElement>
        fileInputs.forEach((input) => (input.value = ""))
      } else {
        const err = await res.json()
        toast.error(err.message || "Upload failed")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload document")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (docId: string, versionNumber: number) => {
    try {
      const doc = documents.find((d) => d._id === docId)
      if (!doc) return

      const version = doc.versions.find((v) => v.versionNumber === versionNumber)
      if (!version || !version.url) {
        toast.error("Document URL not found")
        return
      }

      window.open(version.url, "_blank")
      toast.success("Download started")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download document")
    }
  }

  const handleShare = async (docId: string) => {
    try {
      const doc = documents.find((d) => d._id === docId)
      if (!doc) return

      const latestVersion = doc.versions[doc.versions.length - 1]
      if (!latestVersion || !latestVersion.url) {
        toast.error("Document URL not found")
        return
      }

      await navigator.clipboard.writeText(latestVersion.url)
      toast.success("Document link copied to clipboard!")
    } catch (error) {
      console.error("Share error:", error)
      toast.error("Failed to copy link")
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return
    }

    try {
      const res = await fetch(`${API_BASE}/documents/${docId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        toast.success("Document deleted successfully!")
        await fetchDocuments()
      } else {
        const err = await res.json()
        toast.error(err.message || "Failed to delete document")
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete document")
    }
  }

  const handleAttachSignature = async (docId: string, versionNumber: number, file: File) => {
    if (!token) {
      toast.error("You must be logged in to attach signatures")
      return
    }
    const form = new FormData()
    form.append("signature", file)

    try {
      const res = await fetch(`${API_BASE}/documents/${docId}/version/${versionNumber}/signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      if (res.ok) {
        toast.success("Signature attached successfully!")
        fetchDocuments()
      } else {
        const err = await res.json()
        toast.error(err.message || "Failed to upload signature")
      }
    } catch (error) {
      console.error("Signature upload error:", error)
      toast.error("Failed to attach signature")
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleSignatureClick = (key: string) => {
    signatureInputRefs.current[key]?.click()
  }

  const getFilteredDocuments = () => {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    switch (filter) {
      case "recent":
        return documents.filter((doc) => new Date(doc.createdAt) > sevenDaysAgo)
      case "shared":
        return documents.filter((doc) => doc.versions.some((v) => v.shared))
      case "starred":
        // For now, return empty array as we don't have starred functionality yet
        return []
      case "trash":
        return documents.filter((doc) => doc.status === "trash")
      case "all":
      default:
        return documents.filter((doc) => doc.status !== "trash")
    }
  }

  const filteredDocuments = getFilteredDocuments()

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Manage your startup's important files</p>
        </div>

        <div>
          <Button leftIcon={<Upload size={18} />} onClick={handleUploadClick} disabled={loading}>
            {loading ? "Uploading..." : "Upload Document"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            style={{ display: "none" }}
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Storage info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Storage</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium text-gray-900">{storageUsedGB} GB</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div className="h-2 bg-primary-600 rounded-full" style={{ width: `${storagePercentage}%` }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Available</span>
                <span className="font-medium text-gray-900">{storageAvailableGB} GB</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Access</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFilter("recent")}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    filter === "recent"
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Recent Files
                </button>
                <button
                  onClick={() => setFilter("shared")}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    filter === "shared"
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Shared with Me
                </button>
                <button
                  onClick={() => setFilter("starred")}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    filter === "starred"
                      ? "bg-primary-50 text-primary-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Starred
                </button>
                <button
                  onClick={() => setFilter("trash")}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    filter === "trash" ? "bg-primary-50 text-primary-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Trash
                </button>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="w-full text-left px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md font-medium"
                  >
                    ← All Documents
                  </button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Document list */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">
                {filter === "all" && "All Documents"}
                {filter === "recent" && "Recent Files"}
                {filter === "shared" && "Shared with Me"}
                {filter === "starred" && "Starred"}
                {filter === "trash" && "Trash"}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Sort by
                </Button>
                <Button variant="outline" size="sm">
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {filteredDocuments.length === 0 ? (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">
                    {filter === "all" && "No documents uploaded yet"}
                    {filter === "recent" && "No recent files"}
                    {filter === "shared" && "No shared documents"}
                    {filter === "starred" && "No starred documents"}
                    {filter === "trash" && "Trash is empty"}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {filter === "all" && "Upload your first document to get started"}
                    {filter !== "all" && "Documents matching this filter will appear here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredDocuments.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <div className="p-2 bg-primary-50 rounded-lg mr-4">
                        <FileText size={24} className="text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{doc.filename}</h3>
                          {doc.versions.some((v) => v.shared) && (
                            <Badge variant="secondary" size="sm">
                              Shared
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>Versions: {doc.currentVersion}</span>
                          <span>Modified {new Date(doc.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          aria-label="Download"
                          onClick={() => handleDownload(doc._id, doc.currentVersion)}
                        >
                          <Download size={18} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          aria-label="Share"
                          onClick={() => handleShare(doc._id)}
                        >
                          <Share2 size={18} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2 text-error-600 hover:text-error-700"
                          aria-label="Delete"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {filteredDocuments.length > 0 && (
            <div className="mt-6 space-y-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc._id}>
                  <CardHeader>
                    <h3 className="text-md font-medium text-gray-900">{doc.filename}</h3>
                    <p className="text-sm text-gray-500">Version History</p>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {doc.versions.map((v) => {
                        const signatureKey = `${doc._id}-${v.versionNumber}`
                        return (
                          <div
                            key={v.versionNumber}
                            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">Version {v.versionNumber}</div>
                              <div className="text-xs text-gray-500">{new Date(v.uploadedAt).toLocaleString()}</div>
                              {v.signatureUrl && (
                                <div className="text-xs text-green-600 mt-1">
                                  ✓ Signed —{" "}
                                  <a href={v.signatureUrl} target="_blank" rel="noreferrer" className="underline">
                                    view signature
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button onClick={() => window.open(v.url, "_blank")} variant="outline" size="sm">
                                Open
                              </Button>

                              <div>
                                <input
                                  ref={(el) => (signatureInputRefs.current[signatureKey] = el)}
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleAttachSignature(doc._id, v.versionNumber, e.target.files[0])
                                    }
                                  }}
                                />
                                <Button onClick={() => handleSignatureClick(signatureKey)} variant="outline" size="sm">
                                  Attach Signature
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
