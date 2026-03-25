import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Shield, Calendar, User, Edit2, FileText, Download, AlertCircle } from "lucide-react";

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  const cleanPath = filePath.replace(/\\/g, '/');
  return `${SERVER_BASE_URL}/${cleanPath}`;
};

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isHR = user?.role === ROLES.HR;

  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/policy");
      
      if (res && res.data !== undefined) {
        setPolicy(res.data);
        
        // Mark as viewed only if policy exists and user is loaded
        if (res.data && user?.id && Array.isArray(res.data.viewedBy)) {
          if (!res.data.viewedBy.includes(user.id)) {
            await api.post("/policy/viewed").catch(err => {
              console.warn("Failed to mark policy as viewed:", err);
            });
          }
        }
      }
    } catch (err) {
      console.error("Error loading policy:", err);
      setError(err?.response?.data?.message || "Failed to load privacy policy");
      toast({ 
        title: "Failed to load privacy policy", 
        message: err?.response?.data?.message || err.message,
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only load policy if user is loaded
    if (user) {
      load();
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageTitle
          title="Privacy Policy"
          subtitle="Company privacy policy and data protection information"
        />
        <Card className="p-16 text-center bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <p className="text-lg text-[#70757A] mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} className="bg-slate-600 hover:bg-slate-700">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <PageTitle
          title="Privacy Policy"
          subtitle="Company privacy policy and data protection information"
          actions={
            isHR && (
              <Button
                onClick={() => navigate("/policy-editor")}
                className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Create Policy
              </Button>
            )
          }
        />
        <Card className="p-16 text-center bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <Shield className="w-16 h-16 mx-auto text-[#B3CFE5] mb-4" />
          <p className="text-lg text-[#70757A]">No privacy policy has been created yet.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <PageTitle
        title="Privacy Policy"
        subtitle="Company privacy policy and data protection information"
        actions={
          isHR && (
            <Button
              onClick={() => navigate("/policy-editor")}
              className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit Policy
            </Button>
          )
        }
      />

      <Card className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        {/* Header */}
        <div className="p-6 border-b border-[#B3CFE5]">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-[#4A7FA7]" />
            <h1 className="text-2xl font-bold text-[#0A1931]">{policy.title}</h1>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-[#70757A]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Last Updated: {new Date(policy.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric"
              })}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Version {policy.version}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Updated by {policy.updatedBy?.name || policy.createdBy?.name || "HR"}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div 
            className="prose prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: policy.content }}
          />
        </div>

        {/* Attachments */}
        {policy.attachments && policy.attachments.length > 0 && (
          <div className="p-6 border-t border-[#B3CFE5]">
            <h3 className="text-lg font-semibold text-[#0A1931] mb-4">Related Documents</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {policy.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={getFileUrl(attachment.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 border border-[#B3CFE5] rounded-lg hover:bg-[#F6FAFD] transition-colors"
                >
                  <Download className="w-5 h-5 text-[#4A7FA7]" />
                  <span className="text-sm font-medium text-[#0A1931]">{attachment.filename}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}