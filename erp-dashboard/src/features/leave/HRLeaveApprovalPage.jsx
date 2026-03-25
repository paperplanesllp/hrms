import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Button from "../../components/ui/Button.jsx";
import RejectionModal from "../../components/ui/RejectionModal.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Calendar, User, Shield, Check, X, Clock } from "lucide-react";

export default function HRLeaveApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  // Only admins can view HR leave approvals
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <Shield className="w-12 h-12 mx-auto text-[#C5221F] mb-4" />
          <p className="text-lg font-semibold text-[#0A1931] mb-2">Access Restricted</p>
          <p className="text-[#70757A] mb-6">Only Admin can approve HR staff leave requests.</p>
          <Button onClick={() => window.location.href = "/leave"} className="bg-[#4A7FA7] text-white">
            Back to Leave Management
          </Button>
        </Card>
      </div>
    );
  }

  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all"); // all, PENDING, APPROVED, REJECTED
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, leaveId: null, employeeName: "" });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leave/admin/hr-leaves");
      setLeaves(res.data || []);
    } catch (err) {
      toast({ title: "Failed to load HR leave requests", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateLeaveStatus = async (leaveId, status) => {
    try {
      await api.patch(`/leave/${leaveId}`, { status });
      toast({ title: `Leave ${status.toLowerCase()}`, type: "success" });
      load();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to update leave", type: "error" });
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/leave/${id}`, { status: "APPROVED" });
      toast({ title: "Leave approved successfully", type: "success" });
      load();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Action failed", type: "error" });
    }
  };

  const handleReject = (id, employeeName) => {
    setRejectionModal({ isOpen: true, leaveId: id, employeeName });
  };

  const confirmReject = async (reason) => {
    try {
      await api.patch(`/leave/${rejectionModal.leaveId}`, { 
        status: "REJECTED", 
        rejectionReason: reason 
      });
      toast({ title: "Leave rejected", type: "success" });
      load();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Action failed", type: "error" });
    }
  };

  const filteredLeaves = filterStatus === "all" 
    ? leaves 
    : leaves.filter(leave => leave.status === filterStatus);

  const stats = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === "PENDING").length,
    approved: leaves.filter(l => l.status === "APPROVED").length,
    rejected: leaves.filter(l => l.status === "REJECTED").length
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="HR Staff Leave Approval"
        subtitle="Review and approve leave requests from HR team members (Admin Only)"
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Requests</p>
              <p className="text-3xl font-bold text-[#4A7FA7] mt-1">{stats.total}</p>
            </div>
            <Clock className="w-6 h-6 text-[#4A7FA7] opacity-30" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-orange-500 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Pending</p>
              <p className="mt-1 text-3xl font-bold text-orange-600">{stats.pending}</p>
            </div>
            <Clock className="w-6 h-6 text-orange-600 opacity-30" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#137333] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Approved</p>
              <p className="text-3xl font-bold text-[#137333] mt-1">{stats.approved}</p>
            </div>
            <Check className="w-6 h-6 text-[#137333] opacity-30" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#C5221F] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Rejected</p>
              <p className="text-3xl font-bold text-[#C5221F] mt-1">{stats.rejected}</p>
            </div>
            <X className="w-6 h-6 text-[#C5221F] opacity-30" />
          </div>
        </Card>
      </div>

      {/* Filter */}
      <Card className="p-4 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-[#0A1931]">Filter:</label>
          {["all", "PENDING", "APPROVED", "REJECTED"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                filterStatus === status
                  ? "bg-[#4A7FA7] text-white"
                  : "bg-[#F6FAFD] text-[#4A7FA7] border border-[#B3CFE5]"
              }`}
            >
              {status === "all" ? "All" : status}
            </button>
          ))}
        </div>
      </Card>

      {/* Leave Requests Table */}
      <Card className="p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : filteredLeaves.length === 0 ? (
          <div className="py-10 text-center">
            <Calendar className="w-12 h-12 mx-auto text-[#B3CFE5] mb-3 opacity-50" />
            <p className="text-[#70757A]">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0A1931] text-white border-b">
                  <th className="px-6 py-4 font-semibold text-left">HR Staff</th>
                  <th className="px-6 py-4 font-semibold text-left">From Date</th>
                  <th className="px-6 py-4 font-semibold text-left">To Date</th>
                  <th className="px-6 py-4 font-semibold text-left">Request Reason</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-center">Decision Reason</th>
                  <th className="px-6 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave, idx) => (
                  <tr
                    key={leave._id}
                    className={`border-b border-[#B3CFE5] hover:bg-[#E6F4EA]/10 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-[#F6FAFD]'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A7FA7] to-[#1A3D63] flex items-center justify-center text-white font-semibold">
                          {(leave.userId?.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-[#0A1931]">{leave.userId?.name || "Unknown"}</p>
                          <p className="text-xs text-[#70757A]">{leave.userId?.email || "N/A"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#0A1931]">{leave.fromDate}</td>
                    <td className="px-6 py-4 font-medium text-[#0A1931]">{leave.toDate}</td>
                    <td className="px-6 py-4 text-[#70757A] max-w-xs truncate">{leave.reason || "—"}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                        leave.status === "PENDING" ? "bg-orange-50 border-orange-400 text-orange-700" :
                        leave.status === "APPROVED" ? "bg-[#E6F4EA] border-[#137333] text-[#137333]" :
                        "bg-[#FCE8E6] border-[#C5221F] text-[#C5221F]"
                      }`}>
                        {leave.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="text-sm text-[#70757A]">
                        {leave.status === 'REJECTED' && leave.rejectionReason ? (
                          <span className="text-[#C5221F] font-medium">{leave.rejectionReason}</span>
                        ) : leave.status === 'APPROVED' ? (
                          <span className="text-[#137333] font-medium">Approved</span>
                        ) : (
                          <span className="text-[#70757A]">—</span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {leave.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(leave._id)}
                              className="bg-[#137333] hover:bg-[#0d5628] text-white gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReject(leave._id, leave.userId?.name)}
                              className="bg-[#C5221F] hover:bg-[#a41e18] text-white gap-1"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        {leave.status !== "PENDING" && (
                          <p className="text-xs text-[#70757A]">Finalized</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={() => setRejectionModal({ isOpen: false, leaveId: null, employeeName: "" })}
        onConfirm={confirmReject}
        employeeName={rejectionModal.employeeName}
      />
    </div>
  );
}
