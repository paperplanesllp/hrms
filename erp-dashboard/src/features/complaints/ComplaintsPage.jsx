import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { AlertCircle, Send, CheckCircle2, Clock, MessageSquare, Plus } from "lucide-react";

export default function ComplaintsPage() {
  const [loading, setLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const [formData, setFormData] = useState({
    subject: "",
    message: "",
    priority: "Medium"
  });

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await api.get("/complaints/my");
      setComplaints(res.data || []);
      console.log("✅ My complaints loaded");
    } catch (e) {
      console.error("❌ Load failed:", e);
      toast({
        title: "Failed to Load",
        description: e?.response?.data?.message || "Could not load complaints",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast({
        title: "Missing Subject",
        description: "Please enter a complaint subject",
        type: "error"
      });
      return;
    }

    if (!formData.message.trim()) {
      toast({
        title: "Missing Message",
        description: "Please enter your complaint details",
        type: "error"
      });
      return;
    }

    setSubmitting(true);
    try {
      console.log("📝 Submitting complaint...");
      const res = await api.post("/complaints", {
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority
      });

      console.log("✅ Complaint submitted:", res.data);
      toast({
        title: "Submitted Successfully",
        description: "Your complaint has been submitted. Admin will respond within 7 working days.",
        type: "success"
      });

      setFormData({ subject: "", message: "", priority: "Medium" });
      setShowForm(false);
      loadComplaints();
    } catch (e) {
      console.error("❌ Submit failed:", e);
      toast({
        title: "Failed to Submit",
        description: e?.response?.data?.message || "Could not submit complaint",
        type: "error"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "OPEN":
        return <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "IN_PROGRESS":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "RESOLVED":
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default:
        return <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "IN_PROGRESS":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
      case "RESOLVED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Low":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "High":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "Urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      {/* Header */}
      <PageTitle
        icon={AlertCircle}
        title="Complaints & Feedback"
        subtitle="Submit your complaints and feedback. Admin will respond within 7 working days SLA"
      />

      {/* New Complaint Button */}
      <div className="flex gap-3">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? "Cancel" : "New Complaint"}
        </Button>
      </div>

      {/* Complaint Form */}
      {showForm && (
        <Card className="dark:bg-slate-800/50">
          <form onSubmit={handleSubmitComplaint} className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Submit a Complaint
            </h3>

            <Input
              label="Subject"
              type="text"
              placeholder="Brief subject of your complaint..."
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                Message <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                placeholder="Describe your complaint in detail..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                rows={6}
                className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 px-4 py-3 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ subject: "", message: "", priority: "Medium" });
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Complaints List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          My Complaints ({complaints.length})
        </h2>

        {complaints.length === 0 ? (
          <Card className="dark:bg-slate-800/50 text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No complaints submitted yet. {!showForm && "Click 'New Complaint' to submit one."}
            </p>
          </Card>
        ) : (
          complaints.map((complaint) => (
            <Card
              key={complaint._id}
              className={`dark:bg-slate-800/50 cursor-pointer transition-all hover:shadow-lg ${
                selectedComplaint?._id === complaint._id
                  ? "ring-2 ring-blue-500"
                  : ""
              }`}
              onClick={() =>
                setSelectedComplaint(
                  selectedComplaint?._id === complaint._id ? null : complaint
                )
              }
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(complaint.status)}
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        {complaint.subject}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Submitted on {new Date(complaint.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(complaint.priority)}`}>
                      {complaint.priority}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
                  <p className="text-slate-700 dark:text-slate-300 text-sm">
                    {complaint.message}
                  </p>
                </div>

                {/* Admin Reply (if available) */}
                {selectedComplaint?._id === complaint._id && complaint.adminReply && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                      Admin Response
                    </h4>
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-900/40">
                      <p className="text-green-900 dark:text-green-300 text-sm">
                        {complaint.adminReply}
                      </p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                        Responded on {new Date(complaint.repliedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Expand indicator */}
                <div className="flex justify-center text-gray-400">
                  {selectedComplaint?._id === complaint._id ? "▲" : "▼"}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
