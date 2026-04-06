import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "../../components/providers/ThemeProvider.jsx";
import { useAuthStore } from "../../store/authStore.js";
import { useNavigate } from "react-router-dom";
import { ROLES } from "../../app/constants.js";
import PageTitle from "../../components/common/PageTitle.jsx";
import Button from "../../components/ui/Button.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { 
  AlertCircle, 
  Send, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Plus, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle
} from "lucide-react";
import Spinner from "../../components/ui/Spinner.jsx";

// ============================================
// Premium Status Badge Component
// ============================================
const StatusBadge = ({ status, priority = "Medium" }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const statusConfig = {
    OPEN: {
      label: "Under Survey",
      bg: isDark ? "bg-gradient-to-r from-blue-900/50 to-blue-800/50" : "bg-gradient-to-r from-blue-50 to-blue-100",
      text: isDark ? "text-blue-300" : "text-blue-800",
      border: isDark ? "border-blue-800/50" : "border-blue-200",
      icon: Clock
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: isDark ? "bg-gradient-to-r from-amber-900/50 to-amber-800/50" : "bg-gradient-to-r from-amber-50 to-amber-100",
      text: isDark ? "text-amber-300" : "text-amber-800",
      border: isDark ? "border-amber-800/50" : "border-amber-200",
      icon: Clock
    },
    RESOLVED: {
      label: "Resolved",
      bg: isDark ? "bg-gradient-to-r from-emerald-900/50 to-emerald-800/50" : "bg-gradient-to-r from-emerald-50 to-emerald-100",
      text: isDark ? "text-emerald-300" : "text-emerald-800",
      border: isDark ? "border-emerald-800/50" : "border-emerald-200",
      icon: CheckCircle2
    }
  };

  const PriorityBadge = {
    Low: isDark ? "bg-emerald-900/30 border-emerald-800/50 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800",
    Medium: isDark ? "bg-yellow-900/30 border-yellow-800/50 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-800",
    High: isDark ? "bg-orange-900/30 border-orange-800/50 text-orange-300" : "bg-orange-50 border-orange-200 text-orange-800",
    Urgent: isDark ? "bg-red-900/30 border-red-800/50 text-red-300" : "bg-red-50 border-red-200 text-red-800"
  };

  const config = statusConfig[status] || statusConfig.OPEN;
  const Icon = config.icon;

  return (
    <div className="flex flex-wrap gap-2">
      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        <Icon className="w-3 h-3 inline mr-1 -mt-0.5" />
        {config.label}
      </div>
      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${PriorityBadge[priority]}`}>
        {priority}
      </div>
    </div>
  );
};

// ============================================
// Premium Complaint Card Component
// ============================================
const ComplaintCard = ({ complaint, isExpanded, onToggle }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getStatusVariant = (status) => {
    const base = "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5";
    const variants = {
      OPEN: isDark ? "bg-blue-500/10 text-blue-300 border-blue-500/20 backdrop-blur-sm" : "bg-blue-500/5 text-blue-700 border-blue-500/20",
      IN_PROGRESS: isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20 backdrop-blur-sm" : "bg-amber-500/5 text-amber-700 border-amber-500/20",
      RESOLVED: isDark ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 backdrop-blur-sm" : "bg-emerald-500/5 text-emerald-700 border-emerald-500/20"
    };
    return variants[status] || variants.OPEN;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  
  return (
    <div 
      className={`
        group cursor-pointer transition-all duration-400 overflow-hidden
        ${isDark 
          ? "bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/80 backdrop-blur-xl shadow-2xl shadow-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 hover:shadow-slate-900/70 hover:shadow-3xl"
          : "bg-gradient-to-br from-slate-50/80 via-white to-slate-50/80 backdrop-blur-xl shadow-xl shadow-slate-200/50 border border-slate-200/50 hover:border-slate-300/50 hover:shadow-slate-300/70 hover:shadow-2xl"
        }
      `}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="p-6 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 pr-4">
            <h3 className="mb-2 text-lg font-bold leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {complaint.subject}
            </h3>
            <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
              <MessageSquare className="w-4 h-4" />
              <span>{formatDate(complaint.createdAt)}</span>
            </div>
            <StatusBadge status={complaint.status} priority={complaint.priority} />
          </div>
          <div className="flex-shrink-0 ml-3">
            {isExpanded ? (
              <ChevronUp className="w-6 h-6 transition-colors text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            ) : (
              <ChevronDown className="w-6 h-6 transition-colors text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-4">
        {/* Message */}
        <div className={`mb-4 p-4 rounded-2xl ${isDark ? "bg-slate-800/50 border border-slate-700/50" : "bg-slate-50/50 border border-slate-200/50"}`}>
          <p className={`text-sm leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
            {complaint.message}
          </p>
        </div>

        {/* Category Tag */}
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold mb-4 ${
          isDark 
            ? "bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border-purple-500/30" 
            : "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-500/20"
        }`}>
          {complaint.category || "General"}
        </div>

        {/* Admin Reply Section */}
        {isExpanded && complaint.replyMessage && (
          <div className={`
            p-5 rounded-2xl border-2 transition-all duration-300 backdrop-blur-md
            ${isDark 
              ? "bg-gradient-to-r from-emerald-900/30 via-emerald-900/20 to-emerald-900/30 border-emerald-500/30 shadow-emerald-500/10 shadow-xl hover:shadow-emerald-500/20 hover:shadow-2xl" 
              : "bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-emerald-50 border-emerald-200/50 shadow-emerald-200/20 shadow-xl hover:shadow-emerald-300/40 hover:shadow-2xl"
            }
          `}>
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-2 h-2 mt-2 rounded-full ${isDark ? "bg-emerald-400" : "bg-emerald-600"} animate-pulse`} />
              <div className="flex-1">
                <h4 className={`font-semibold text-sm ${isDark ? "text-emerald-200" : "text-emerald-800"} mb-1`}>
                  Admin Reply
                </h4>
                <p className={`text-xs ${isDark ? "text-emerald-300/80" : "text-emerald-700/80"}`}>
                  {formatDate(complaint.repliedAt)}
                </p>
              </div>
            </div>
            <div className={`p-4 mt-3 rounded-xl ${isDark ? "bg-slate-800/50 border border-slate-700/50" : "bg-white/80 border border-slate-200/50"}`}>
              <p className={`text-sm leading-relaxed ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                {complaint.replyMessage}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Dashboard Component
// ============================================
export default function StaffComplaintsDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // Redirect only admins to the admin complaints management page
  useEffect(() => {
    if (user?.role === ROLES.ADMIN) {
      navigate("/admin/complaints", { replace: true });
    }
  }, [user, navigate]);

  // Early return for admin only
  if (user?.role === ROLES.ADMIN) {
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedComplaint, setExpandedComplaint] = useState(null);
  const [formData, setFormData] = useState({
    subject: "",
    category: "Others",
    message: ""
  });

  // Load complaints
  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/complaints/my");
      setComplaints(response.data || []);
    } catch (error) {
      toast({
        title: "Error Loading Complaints",
        description: "Failed to fetch your complaints",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message are required",
        type: "error"
      });
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/complaints", {
        subject: formData.subject.trim(),
        category: formData.category,
        message: formData.message.trim()
      });
      
      toast({
        title: "Success",
        description: "Your complaint has been submitted and is under review",
        type: "success"
      });

      // Reset form and reload
      setFormData({ subject: "", category: "Others", message: "" });
      setShowForm(false);
      loadComplaints();
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error?.response?.data?.message || "Please try again",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplaint = (complaintId) => {
    setExpandedComplaint(expandedComplaint?._id === complaintId ? null : complaints.find(c => c._id === complaintId));
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-12 ${isDark ? "bg-gradient-to-br from-slate-900 via-slate-900/50 to-slate-950" : "bg-gradient-to-br from-slate-50 to-white"}`}>
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Header */}
        <div className="pt-8 pb-12">
          <PageTitle
            icon={AlertCircle}
            title="Raise a Ticket"
            subtitle="Submit a confidential ticket or complaint. Admin team responds within 7 working days. All submissions are confidential."
          />
          
          {/* New Complaint CTA */}
          <div className="flex gap-4 mb-8">
            <Button 
              onClick={() => setShowForm(!showForm)}
              leftIcon={<Plus className="w-4 h-4" />}
              className="group"
              size="lg"
            >
              {showForm ? "Cancel" : "Raise Ticket"}
            </Button>
          </div>
        </div>

        {/* Submission Form */}
        {showForm && (
          <div className="mb-12">
            <Card className={`backdrop-blur-xl ${isDark ? "bg-white/5 border-white/20 shadow-2xl shadow-black/20" : "bg-white/80 border-slate-200 shadow-2xl shadow-slate-200/50"}`}>
              <form onSubmit={handleSubmit} className="p-8">
                <h2 className="mb-8 text-2xl font-bold text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text">
                  Raise Ticket
                </h2>

                <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-2">
                  <Input
                    label="Subject"
                    placeholder="Brief subject of your confidential feedback..."
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                    className="py-4 text-lg"
                  />
                  
                  <div>
                    <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className={`
                        w-full px-5 py-4 rounded-xl border-2 transition-all duration-300
                        ${isDark 
                          ? "bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder-slate-400 hover:border-slate-500/70 focus:border-blue-500 focus:ring-blue-500/30" 
                          : "bg-white/70 border-slate-200 text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-blue-500/30 shadow-sm"
                        }
                      `}
                    >
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Leave Management">Leave Management</option>
                      <option value="Payroll">Payroll</option>
                      <option value="Attendance">Attendance</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                </div>

                <div className="mb-8">
                  <label className="block mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Your Message (Confidential)
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    placeholder="Please describe your feedback or complaint in detail. All submissions are confidential and will be handled professionally..."
                    rows={6}
                    required
                    className={`
                      w-full resize-vertical rounded-2xl border-2 p-6 text-lg leading-relaxed
                      ${isDark 
                        ? "bg-slate-800/50 border-slate-600/50 text-slate-100 placeholder-slate-400 hover:border-slate-500/70 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                        : "bg-white/70 border-slate-200 text-slate-900 placeholder-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-sm"
                      }
                    `}
                  />
                </div>

                <div className="flex flex-col justify-end gap-4 sm:flex-row">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setFormData({ subject: "", category: "Others", message: "" });
                    }}
                    variant="secondary"
                    size="lg"
                    className="px-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.subject.trim() || !formData.message.trim()}
                    leftIcon={submitting ? <Spinner className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    size="lg"
                    className="px-8"
                  >
                    {submitting ? "Submitting..." : "Submit Confidentially"}
                  </Button>
                </div>

                {/* Confidentiality Notice */}
                <div className={`mt-8 p-5 rounded-2xl border-2 ${isDark ? "bg-slate-800/50 border-slate-700/50" : "bg-slate-50 border-slate-200/50"}`}>
                  <AlertTriangle className={`w-5 h-5 inline ${isDark ? "text-yellow-400" : "text-yellow-600"} mr-2`} />
                  <span className="text-sm font-medium">
                    🔒 This submission is confidential and will only be visible to authorized Admin personnel.
                  </span>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Complaints Grid */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className={`text-3xl font-bold ${isDark ? "bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent" : "bg-gradient-to-r from-slate-800 to-slate-700 bg-clip-text text-transparent"}`}>
              Your Submissions ({complaints.length})
            </h2>
          </div>

          {complaints.length === 0 ? (
            <Card className={`backdrop-blur-xl p-16 text-center ${isDark ? "bg-white/5 border-white/20 shadow-2xl" : "bg-white/80 border-slate-200 shadow-2xl"}`}>
              <MessageSquare className={`w-16 h-16 mx-auto mb-6 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
              <h3 className="mb-2 text-xl font-bold text-slate-700 dark:text-slate-200">
                No submissions yet
              </h3>
              <p className={`text-slate-600 dark:text-slate-400 mb-6`}>
                All your confidential submissions will appear here
              </p>
              {!showForm && (
                <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="w-4 h-4" />}>
                  Create First Submission
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {complaints.map((complaint) => (
                <ComplaintCard
                  key={complaint._id}
                  complaint={complaint}
                  isExpanded={expandedComplaint?._id === complaint._id}
                  onToggle={() => toggleComplaint(complaint._id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

