"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import { FileText, Upload, Trash2, Eye } from "lucide-react"
import { Card, CardHeader, CardBody } from "../../components/ui/Card"
import { Button } from "../../components/ui/Button"
import toast from "react-hot-toast"
import api from "../../services/api" // Bridge to backend

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. MILESTONE 5: FETCH DOCUMENTS FROM DATABASE
  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents/all');
      setDocuments(res.data || []);
    } catch (error) {
      console.error("Failed to load documents.");
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 2. MILESTONE 5: UPLOAD LOGIC
  const handleUpload = async (uploadFile: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("document", uploadFile); 

    try {
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 201) {
        toast.success("Document saved to XAMPP Server!");
        fetchDocuments(); // Refresh the list
      }
    } catch (error) {
      toast.error("Upload failed. Ensure backend terminal is open.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0])
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Chamber</h1>
          <p className="text-sm text-gray-500">Milestone 5: Secure Business Storage</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"
          >
            <Upload size={18} className="mr-2" />
            {loading ? "Saving..." : "Upload PDF"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
        </div>
      </div>

      {/* Document List Section */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 border-b p-4">
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wider">Your Repository</h2>
        </CardHeader>
        <CardBody className="p-4">
          {documents.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">Chamber is empty. Upload a pitch deck to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-500 hover:shadow-md transition-all">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-50 rounded-lg mr-4">
                      <FileText className="text-blue-600" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{doc.fileName}</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                        Status: <span className="text-blue-600">{doc.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-blue-200 text-blue-600"
                      onClick={() => window.open(`http://localhost:5000/uploads/${doc.filePath}`, "_blank")}
                    >
                      <Eye size={16} className="mr-1" /> Preview
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}