import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { getSocket } from "../../lib/socket.js";
import { 
  ArrowLeft, Upload, ShieldAlert, Calendar, 
  FileText, Image as ImageIcon, X, Sparkles 
} from "lucide-react";

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

export default function NewsStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const socket = getSocket();
  const editId = searchParams.get("edit");

  const [loading, setLoading] = useState(!!editId);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    title: "",
    body: "",
    publishDate: new Date().toISOString().split("T")[0],
    isPolicyUpdate: false
  });

  // Helper to resolve image URLs correctly
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('blob:')) return path;
    if (path.startsWith('http')) return path;
    
    // Convert Windows backslashes to forward slashes
    let cleanPath = path.replace(/\\/g, '/');
    
    // Extract everything from "uploads" onwards if it's an absolute path
    if (cleanPath.includes('uploads')) {
      const uploadsIndex = cleanPath.indexOf('uploads');
      cleanPath = cleanPath.substring(uploadsIndex);
    }
    
    // Ensure path starts with /
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    
    // Return relative path so Vite proxy can intercept it
    return cleanPath;
  };

  useEffect(() => {
    if (user?.role !== ROLES.HR) navigate("/news");
    if (editId) loadNews();
  }, [editId, user]);

  const loadNews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/news/${editId}`);
      const news = res.data;
      setForm({
        title: news.title,
        body: news.body,
        publishDate: news.publishDate?.split("T")[0] || new Date().toISOString().split("T")[0],
        isPolicyUpdate: news.isPolicyUpdate || false
      });
      if (news.imageUrl) setImagePreview(news.imageUrl);
    } catch (err) {
      toast({ title: "Failed to load news", type: "error" });
      navigate("/news");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Image must be less than 5MB", type: "error" });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast({ title: "Please fill in all required fields", type: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (imageFile) formData.append("image", imageFile);

      if (editId) {
        await api.patch(`/news/${editId}`, formData);
        toast({ title: "Article refined successfully", type: "success" });
      } else {
        const res = await api.post("/news", formData);
        
        // Emit socket event for live news update to all connected users
        if (socket && res.data) {
          socket.emit("news_created", {
            _id: res.data._id,
            title: res.data.title,
            body: res.data.body,
            imageUrl: res.data.imageUrl,
            isPolicyUpdate: res.data.isPolicyUpdate,
            publishDate: res.data.publishDate,
            createdBy: {
              _id: user._id,
              name: user.name,
              email: user.email
            },
            createdAt: res.data.createdAt
          });
        }
        
        toast({ title: "Article published to Journal", type: "success" });
      }
      navigate("/news");
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Operation failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-[60vh] space-y-4">
      <Spinner className="w-10 h-10 text-[var(--eucalyptus)]" />
      <p className="text-[var(--text-muted)] font-serif italic">Loading your draft...</p>
    </div>
  );

  return (
    <div className="max-w-5xl px-4 py-10 mx-auto space-y-8 animate-fadeIn">
      {/* Header Section */}
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/news")}
            className="p-3 bg-white dark:bg-[#242B1E] rounded-full shadow-sm border border-[var(--border-soft)] dark:border-[#323A2B] hover:text-[var(--clay)] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-[var(--text-main)]">
              {editId ? "Refine Article" : "News Studio"}
            </h1>
            <p className="text-[var(--text-muted)]">Compose compelling updates for the team</p>
          </div>
        </div>
        <Badge variant="outline" className="hidden md:flex gap-2 border-[var(--eucalyptus)] text-[var(--text-main)]">
          <Sparkles className="w-3 h-3" /> Professional Draft
        </Badge>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-8 bg-white dark:bg-[#242B1E] rounded-[2.5rem] border-[var(--border-soft)] dark:border-[#323A2B] shadow-2xl shadow-black/5">
            <div className="space-y-8">
              {/* Title Input */}
              <div className="group">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 block">Headline</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="The next big update starts here..."
                  className="w-full text-3xl font-serif font-bold bg-transparent border-none focus:ring-0 placeholder-[var(--border-soft)] text-[var(--text-main)] p-0"
                />
              </div>

              {/* Body Textarea */}
              <div className="group pt-4 border-t border-[var(--border-soft)]/50">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 block">Content Body</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Share the details, the why, and the what's next..."
                  rows="12"
                  className="w-full text-lg leading-relaxed bg-transparent border-none focus:ring-0 text-[var(--text-muted)] placeholder-[var(--border-soft)] p-0 resize-none italic"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          {/* Image Upload Card */}
          <Card className="p-6 bg-white dark:bg-[#242B1E] rounded-[2rem] border-[var(--border-soft)] dark:border-[#323A2B]">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4 block">Visual Header</label>
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--ivory)] dark:bg-[#1A1F16] border-2 border-dashed border-[var(--border-soft)] flex flex-col items-center justify-center group transition-all">
              {imagePreview ? (
                <div className="relative w-full h-full">
                  <img 
                    src={getImageUrl(imagePreview)} 
                    className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-110" 
                    alt="Preview"
                    onError={(e) => {
                      console.warn('Image failed to load:', e.target.src);
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center transition-opacity opacity-0 bg-black/40 group-hover:opacity-100">
                    <button 
                      type="button" 
                      onClick={() => { setImagePreview(null); setImageFile(null); }}
                      className="p-3 text-white transition-transform bg-red-500 rounded-full shadow-xl hover:scale-110"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <ImageIcon className="w-10 h-10 text-[var(--eucalyptus)] mx-auto mb-3 opacity-50" />
                  <p className="text-xs text-[var(--text-muted)] font-medium mb-4">Click to upload imagery</p>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="px-4 py-2 bg-white dark:bg-[#242B1E] rounded-lg text-[10px] font-bold border border-[var(--border-soft)]">Browse Files</div>
                </div>
              )}
            </div>
          </Card>

          {/* Settings Card */}
          <Card className="p-6 bg-[var(--ivory)] dark:bg-[#242B1E] rounded-[2rem] border-[var(--border-soft)] dark:border-[#323A2B] space-y-6">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-3 block">Publication Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--eucalyptus)]" />
                <input 
                  type="date" 
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1A1F16] border-none rounded-xl text-sm font-bold text-[var(--text-main)] shadow-sm focus:ring-2 focus:ring-[var(--eucalyptus)]" 
                  value={form.publishDate} 
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })} 
                />
              </div>
            </div>

            <div className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
              form.isPolicyUpdate 
                ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30" 
                : "bg-white dark:bg-[#1A1F16] border-[var(--border-soft)]"
            }`}>
              <input 
                type="checkbox" 
                id="policyToggle"
                className="mt-1 w-5 h-5 rounded border-[var(--border-soft)] text-[var(--clay)] focus:ring-[var(--clay)]" 
                checked={form.isPolicyUpdate} 
                onChange={(e) => setForm({ ...form, isPolicyUpdate: e.target.checked })} 
              />
              <label htmlFor="policyToggle" className="cursor-pointer">
                <span className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-tight block">Important Policy</span>
                <span className="text-[10px] text-[var(--text-muted)] leading-tight block mt-1">Requires mandatory staff acknowledgment</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-4 bg-[var(--text-main)] text-[var(--ivory)] rounded-2xl font-bold text-sm hover:bg-[var(--clay)] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 active:scale-95"
            >
              {submitting ? <Spinner className="w-4 h-4" /> : editId ? "Update Journal" : "Publish to Journal"}
            </button>
          </Card>
        </div>
      </form>
    </div>
  );
}