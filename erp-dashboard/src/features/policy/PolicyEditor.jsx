import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { ArrowLeft, Save, Shield, Upload, X, FileText } from "lucide-react";

export default function PolicyEditor() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  
  // Only HR can access this page
  if (user?.role !== ROLES.HR) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <Shield className="w-12 h-12 mx-auto text-[#C5221F] mb-4" />
          <p className="text-lg font-semibold text-[#0A1931] mb-2">Access Restricted</p>
          <p className="text-[#70757A] mb-6">Only HR staff can access the Policy Editor.</p>
          <Button onClick={() => navigate("/privacy-policy")} className="bg-[#4A7FA7] text-white">
            Return to Policy
          </Button>
        </Card>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [form, setForm] = useState({
    title: "Privacy Policy",
    content: ""
  });

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const res = await api.get("/policy");
      if (res.data) {
        setForm({
          title: res.data.title,
          content: res.data.content
        });
        setAttachments(res.data.attachments || []);
      }
    } catch (err) {
      console.error("Error loading policy:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({ title: "Title is required", type: "error" });
      return;
    }

    if (!form.content.trim()) {
      toast({ title: "Content is required", type: "error" });
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("content", form.content);
      
      attachments.forEach(file => {
        if (file instanceof File) {
          formData.append("attachments", file);
        }
      });

      const res = await api.put("/policy", formData);
      
      toast({ title: "Privacy policy updated successfully", type: "success" });
      navigate("/privacy-policy");
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to update policy", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate("/privacy-policy")}
          variant="ghost"
          className="text-[#4A7FA7] hover:text-[#3a5f87]"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <PageTitle
          title="Policy Editor"
          subtitle="Create and manage the company privacy policy"
        />
      </div>

      <Card className="p-8 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-[#0A1931] mb-2">
              <FileText className="inline w-4 h-4 mr-2" />
              Policy Title
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Privacy Policy"
              className="border-[#B3CFE5] focus:border-[#4A7FA7]"
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-semibold text-[#0A1931] mb-2">
              Policy Content
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your policy content here. You can use basic HTML tags for formatting..."
              rows="12"
              className="w-full px-4 py-3 border border-[#B3CFE5] rounded-lg focus:border-[#4A7FA7] focus:ring-2 focus:ring-[#B3CFE5]/30 transition-all resize-none font-inter"
            />
            <p className="text-xs text-[#70757A] mt-1">You can use basic HTML tags like &lt;b&gt;, &lt;i&gt;, &lt;u&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt; for formatting</p>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-semibold text-[#0A1931] mb-2">
              <Upload className="inline w-4 h-4 mr-2" />
              Attachments (Optional)
            </label>
            <div className="space-y-3">
              <div className="relative border-2 border-dashed border-[#B3CFE5] rounded-lg p-6 hover:border-[#4A7FA7] transition-colors bg-[#F6FAFD]/50 cursor-pointer group">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto text-[#B3CFE5] group-hover:text-[#4A7FA7] mb-2 transition-colors" />
                  <p className="text-sm font-medium text-[#0A1931]">Drop files here or click to upload</p>
                  <p className="text-xs text-[#70757A] mt-1">PDF, Word documents, or images (max 10MB each)</p>
                </div>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-[#F6FAFD] rounded-lg border border-[#B3CFE5]">
                      <span className="text-sm text-[#0A1931]">
                        {file.filename || file.name}
                      </span>
                      <Button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        variant="ghost"
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-[#B3CFE5]">
            <Button
              type="button"
              onClick={() => navigate("/privacy-policy")}
              variant="secondary"
              disabled={submitting}
              className="border-[#B3CFE5] text-[#4A7FA7] hover:bg-[#F6FAFD]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2"
            >
              {submitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Policy
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}