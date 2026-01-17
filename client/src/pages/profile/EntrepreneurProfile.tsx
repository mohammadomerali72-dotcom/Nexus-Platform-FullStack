"use client"

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // CRITICAL IMPORT
import { Calendar, Upload, Mail, ShieldCheck, ArrowLeft, FileText } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MeetingSchedulerModal } from '../../components/meeting/MeetingSchedulerModal';
import api from '../../services/api'; // Bridge to your backend
import toast from 'react-hot-toast';

/**
 * ENTREPRENEUR PROFILE PAGE
 * Milestone 2, 3, & 5 Integration
 */
export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate(); // This line was red because of missing import
  
  const [user, setUser] = useState<any>(null);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 1. Load data from MySQL
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/users/${id}`);
        setUser(res.data);
      } catch (err) {
        console.error("Profile Fetch Error:", err);
        toast.error("Profile not found in database.");
      }
    };
    if (id) fetchProfile();
  }, [id]);

  // 2. Milestone 5: File Upload logic
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('document', file); 
    formData.append('userId', id || '1');

    setIsUploading(true);
    try {
      await api.post('/documents/upload', formData);
      toast.success("Document successfully saved!");
    } catch (err) {
      toast.error("Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      <p className="mt-4 text-gray-500 font-bold uppercase text-xs">Syncing with MySQL...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Navigation */}
      <button onClick={() => navigate(-1)} className="flex items-center text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors">
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      {/* Header Card */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
          <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-4xl font-black shadow-lg">
            {user.name.charAt(0)}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">{user.name}</h1>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2">
               <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-full border border-blue-100">
                 {user.role}
               </span>
               <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase rounded-full border border-green-100 flex items-center gap-1">
                 <ShieldCheck size={12} /> Verified
               </span>
            </div>
            <p className="text-gray-500 text-sm flex items-center justify-center sm:justify-start gap-2 mt-2">
              <Mail size={14} /> {user.email}
            </p>
          </div>
        </div>

        {/* Buttons for Milestone 3 & 5 */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => setIsMeetingModalOpen(true)} 
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg"
          >
            <Calendar size={18} className="mr-2" /> Book Meeting
          </Button>
          
          <label className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl cursor-pointer font-bold shadow-lg flex items-center justify-center">
            <Upload size={18} className="mr-2" />
            {isUploading ? "Saving..." : "Upload Pitch"}
            <input type="file" className="hidden" onChange={handleUpload} accept=".pdf" />
          </label>
        </div>
      </div>

      {/* Bio Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" /> Startup Summary
          </h2>
          <p className="text-gray-600 leading-relaxed italic">{user.bio || "Registered entrepreneur in the Nexus network."}</p>
      </div>

      {/* Scheduler Modal */}
      <MeetingSchedulerModal 
        isOpen={isMeetingModalOpen} 
        onClose={() => setIsMeetingModalOpen(false)} 
        request={{ entrepreneurId: user.id, startupName: user.name }} 
      />
    </div>
  );
};