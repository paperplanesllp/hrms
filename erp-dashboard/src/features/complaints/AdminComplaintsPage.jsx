import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Input from "../../components/ui/Input.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Button from "../../components/ui/Button.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { AlertCircle, Send, CheckCircle2, Clock, MessageSquare, BarChart3, X, Search, Filter } from "lucide-react";

export default function AdminComplaintsPage() {
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "",
    priority: ""
  });
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [complaintRes, statsRes] = await Promise.all([
        api.get("/complaints/admin/all"),
        api.get("/complaints/admin/stats")
      ]);

      setComplaints(complaintRes.data || []);
      setStats(statsRes.data);
    } catch (e) {
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
    loadData();
  }, []);

  const getFilteredComplaints = () => {
    return complaints.filter((complaint) => {
      let match = true;

      if (filters.status && complaint.status !== filters.status) match = false;
      if (filters.priority && complaint.priority !== filters.priority) match = false;

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const userName = complaint.userId?.name || '';
        match =
          (complaint.subject || '').toLowerCase().includes(search) ||
          (complaint.message || '').toLowerCase().includes(search) ||
          userName.toLowerCase().includes(search);
      }

      return match;
    });
  };

  const handleClearFilters = () => {
    setFilters({ status: "", priority: "" });
    setSearchTerm("");
    setSelectedComplaint(null);
    setReplyMessage("");
  };

  const handleReply = async () => {
    if (!replyMessage.trim()) {
      toast({
        title: "Empty Reply",
        description: "Please write a reply message",
        type: "error"
      });
      return;
    }

    setReplying(true);
    try {
      await api.post(`/complaints/${selectedComplaint._id}/reply`, {
        replyMessage,
        status: "RESOLVED"
      });

      toast({
        title: "Reply Sent",
        description: "Admin response recorded",
        type: "success"
      });

      setReplyMessage("");
      loadData();
    } catch (e) {
      toast({
        title: "Failed to Send",
        description: e?.response?.data?.message || "Could not send reply",
        type: "error"
      });
    } finally {
      setReplying(false);
    }
  };

  const handleViewComplaint = async (complaint) => {
    setSelectedComplaint(complaint);

    if (complaint.status !== "OPEN" && complaint.status !== "IN_PROGRESS" && complaint.status !== "RESOLVED") {
      try {
        await api.patch(`/complaints/${complaint._id}/status`, { status: "OPEN" });

        setComplaints((prevComplaints) =>
          prevComplaints.map((c) =>
            c._id === complaint._id ? { ...c, status: "OPEN" } : c
          )
        );
        
        setSelectedComplaint((prev) => ({ ...prev, status: "OPEN" }));

        const statsRes = await api.get("/complaints/admin/stats");
        setStats(statsRes.data);
      } catch (error) {
        console.error("Failed to update status", error);
      }
    }
  };

  const filteredComplaints = getFilteredComplaints();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6">
      <PageTitle
        icon={AlertCircle}
        title="Complaint Management"
        subtitle="Manage and respond to user complaints"
      />

      {/* Statistics Grid */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <Card 
            className="border cursor-pointer hover:bg-gray-50"
            onClick={handleClearFilters}
          >
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-600">Total</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </Card>

          <Card 
            className="border cursor-pointer hover:bg-gray-50"
            onClick={() => setFilters({ ...filters, status: "OPEN" })}
          >
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-600">Open</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.open}</p>
            </div>
          </Card>

          <Card 
            className="border cursor-pointer hover:bg-gray-50"
            onClick={() => setFilters({ ...filters, status: "RESOLVED" })}
          >
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-600">Resolved</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.resolved}</p>
            </div>
          </Card>

          <Card className="border">
            <div className="p-4">
              <p className="text-sm font-semibold text-gray-600">Overdue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{stats.overDeadline}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filter Section */}
      <Card className="border">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by subject, message, or user name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 border"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="p-2 border rounded"
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>

            <Button
              type="button"
              onClick={handleClearFilters}
              variant="outline"
              className="p-2 border rounded"
            >
              Clear All
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Complaints List */}
        <div className="bg-white border rounded lg:col-span-1">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold">Complaints ({filteredComplaints.length})</h3>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {filteredComplaints.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No complaints found</div>
            ) : (
              filteredComplaints.map((complaint) => (
                <div
                  key={complaint._id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedComplaint?._id === complaint._id ? "bg-gray-100" : ""
                  }`}
                  onClick={() => handleViewComplaint(complaint)}
                >
                  <h4 className="text-sm font-semibold">{complaint.subject || 'No Subject'}</h4>
                  <p className="text-xs text-gray-600">{complaint.userId?.name || 'Unknown User'}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Status: {complaint.status} | Priority: {complaint.priority}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Complaint Details */}
        <div className="lg:col-span-2">
          {selectedComplaint ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedComplaint(null)}
                className="text-sm text-blue-600 lg:hidden"
              >
                ← Back to List
              </button>

              <Card className="p-4 border">
                <h2 className="text-xl font-bold">{selectedComplaint.subject || 'No Subject'}</h2>
                <p className="mt-2 text-sm text-gray-600">
                  From: {selectedComplaint.userId?.name} ({selectedComplaint.userId?.email})
                </p>
                <div className="flex gap-4 mt-4 text-sm text-gray-700">
                  <p><strong>Status:</strong> {selectedComplaint.status}</p>
                  <p><strong>Priority:</strong> {selectedComplaint.priority}</p>
                  <p><strong>Submitted:</strong> {selectedComplaint.submittedAt ? new Date(selectedComplaint.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'N/A'}</p>
                </div>
              </Card>

              <Card className="p-4 border">
                <h3 className="mb-2 text-sm font-semibold">User's Message</h3>
                <p className="text-sm whitespace-pre-wrap">{selectedComplaint.message}</p>
              </Card>

              {selectedComplaint.repliedAt ? (
                <Card className="p-4 border bg-gray-50">
                  <h3 className="mb-2 text-sm font-bold">Reply Sent</h3>
                  <p className="mb-2 text-xs text-gray-600">
                    Replied on {new Date(selectedComplaint.repliedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selectedComplaint.replyMessage}</p>
                </Card>
              ) : (
                <Card className="p-4 border">
                  <h3 className="mb-4 font-bold">Send Reply</h3>
                  <textarea
                    placeholder="Write your response..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={6}
                    className="w-full p-3 mb-4 border rounded"
                  />
                  <Button
                    type="button"
                    onClick={handleReply}
                    disabled={replying || !replyMessage.trim()}
                    className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
                  >
                    {replying ? "Sending..." : "Send Reply"}
                  </Button>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] border rounded bg-gray-50 text-gray-500">
              Select a complaint to view
            </div>
          )}
        </div>
      </div>
    </div>
  );
}