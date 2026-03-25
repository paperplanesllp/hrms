import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Badge from "../../components/ui/Badge.jsx";
import RejectionModal from "../../components/ui/RejectionModal.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { CheckCircle, XCircle, Calendar, User, Mail, Clock, Search, Filter } from "lucide-react";

export default function LeaveManagePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, leaveId: null, employeeName: "" });

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      // Admin sees ONLY HR leave requests
      if (isAdmin) {
        const res = await api.get(`/leave/admin/hr-leaves${params.toString() ? '?' + params.toString() : ''}`);
        setItems(Array.isArray(res.data) ? res.data : []);
      } else {
        // HR sees ONLY employee/user leave requests
        const res = await api.get(`/leave/hr/user-leaves${params.toString() ? '?' + params.toString() : ''}`);
        setItems(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    
    // Listen for real-time leave request notifications
    const handleNewRequest = () => {
      load(); // Refresh leave requests
    };
    
    window.addEventListener('leaveStatusUpdate', handleNewRequest);
    
    return () => {
      window.removeEventListener('leaveStatusUpdate', handleNewRequest);
    };
  }, [searchTerm]);

  useEffect(() => {
    // Auto-scroll to highlighted item
    if (highlightId) {
      setTimeout(() => {
        const element = document.getElementById(`leave-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightId, items]);

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

  const getStatusBadge = (status) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="font-semibold text-green-800 bg-green-100 border-green-300">Approved</Badge>;
      case "REJECTED":
        return <Badge className="font-semibold text-red-800 bg-red-100 border-red-300">Rejected</Badge>;
      default:
        return <Badge className="font-semibold text-orange-800 bg-orange-100 border-orange-300">Pending</Badge>;
    }
  };

  // Separate pending requests for quick action queue
  const pendingRequests = items.filter(item => item.status === 'PENDING');
  const otherRequests = items.filter(item => item.status !== 'PENDING');

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A7FA7]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle 
        title={isAdmin ? "HR Leave Requests" : "Leave Management Center"} 
        subtitle={isAdmin ? "Approve or reject leave requests from HR staff members" : "Quick-action approval system for efficient leave management"} 
      />

      {/* Search and Filter Bar */}
      <Card className="p-4 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-[#0A1931] mb-2">
              <Search className="inline w-4 h-4 mr-2" />
              Search {isAdmin ? "HR Staff" : "Employees"}
            </label>
            <Input
              placeholder={isAdmin ? "Search by HR name or email..." : "Search by name, email, or reason..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-[#B3CFE5] focus:border-[#4A7FA7]"
            />
          </div>
        </div>
      </Card>

      {/* Pending Requests Queue */}
      {pendingRequests.length > 0 && (
        <Card className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="p-6 border-b border-[#B3CFE5] bg-orange-50">
            <h3 className="text-lg font-semibold text-[#0A1931] flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Pending Requests Queue ({pendingRequests.length})
            </h3>
            <p className="text-sm text-[#70757A] mt-1">Newest requests first - requires immediate action</p>
          </div>
          
          <div className="divide-y divide-[#B3CFE5]">
            {pendingRequests.map((leave) => (
              <div 
                key={leave._id} 
                id={`leave-${leave._id}`}
                className={`p-6 hover:bg-[#F6FAFD] transition-colors ${
                  highlightId === leave._id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center flex-1 gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#4A7FA7] flex items-center justify-center text-white font-semibold text-lg">
                      {leave.userId?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-semibold text-[#0A1931] text-lg">{leave.userId?.name || 'Unknown'}</h4>
                        <span className="text-sm font-medium text-[#4A7FA7] bg-[#F6FAFD] px-2 py-1 rounded">
                          {leave.leaveType || 'Personal'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-[#70757A] mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span className="font-medium">{formatDate(leave.fromDate)} - {formatDate(leave.toDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{leave.userId?.email || 'No email'}</span>
                        </div>
                      </div>
                      <p className="text-[#0A1931] font-medium">{leave.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleApprove(leave._id)}
                      className="gap-2 px-6 py-3 font-semibold text-white bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(leave._id, leave.userId?.name)}
                      className="gap-2 px-6 py-3 font-semibold text-white bg-red-600 hover:bg-red-700"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* All Requests Table */}
      <Card className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">All Leave Requests</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Complete history of leave requests</p>
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 mx-auto border-b-2 rounded-full animate-spin border-brand-accent"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading requests...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-600" />
            <p className="text-lg text-slate-600 dark:text-slate-400">No leave requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Employee</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Leave Type</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Duration</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Request Reason</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Decision Reason</th>
                  <th className="px-6 py-4 text-sm font-semibold text-left text-slate-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((leave) => (
                  <tr 
                    key={leave._id} 
                    id={`leave-${leave._id}`}
                    className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                      highlightId === leave._id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 font-semibold rounded-full bg-brand-accent text-slate-900">
                          {leave.userId?.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{leave.userId?.name || 'Unknown'}</p>
                          <p className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                            <Mail className="w-3 h-3" />
                            {leave.userId?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{leave.leaveType || 'Personal'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(leave.fromDate)} - {formatDate(leave.toDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-xs text-sm truncate text-slate-600 dark:text-slate-400" title={leave.reason}>
                        {leave.reason || 'No reason provided'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(leave.status)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
                        {leave.status === 'REJECTED' && leave.rejectionReason ? (
                          <span className="font-medium text-red-600">{leave.rejectionReason}</span>
                        ) : leave.status === 'APPROVED' ? (
                          <span className="font-medium text-green-600">Approved</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {leave.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(leave._id)}
                            className="gap-1 text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleReject(leave._id, leave.userId?.name)}
                            className="gap-1 text-white bg-red-600 hover:bg-red-700"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-[#70757A]">
                          <Clock className="w-3 h-3" />
                          {formatDate(leave.updatedAt)}
                        </div>
                      )}
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


