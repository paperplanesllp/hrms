import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';

export default function ExtensionRequestsPage() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchExtensionRequests();
  }, []);

  const fetchExtensionRequests = async () => {
    try {
      setIsLoading(true);
      
      // Fetch pending approvals (requests I need to approve)
      const pendingRes = await api.get('/extensions/pending-approvals');
      setPendingRequests(pendingRes.data.requests || []);

      // Fetch my extension requests history
      const historyRes = await api.get('/extensions/my-requests', {
        params: { status: 'all' }
      });
      setHistoryRequests(historyRes.data.requests || []);
    } catch (error) {
      console.error('Error fetching extension requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load extension requests',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (extensionId) => {
    try {
      setActionLoading(true);
      await api.put(`/extensions/${extensionId}/approve`, {
        approvalNotes
      });
      toast({
        title: 'Approved ✅',
        description: 'Extension request has been approved',
        type: 'success'
      });
      setApprovalNotes('');
      setSelectedRequest(null);
      fetchExtensionRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve request',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (extensionId) => {
    try {
      setActionLoading(true);
      await api.put(`/extensions/${extensionId}/reject`, {
        rejectionReason: approvalNotes
      });
      toast({
        title: 'Rejected ❌',
        description: 'Extension request has been rejected',
        type: 'success'
      });
      setApprovalNotes('');
      setSelectedRequest(null);
      fetchExtensionRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject request',
        type: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-600',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-300 dark:border-red-600'
    };
    return styles[status] || styles.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={16} />;
      case 'rejected':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Extension Requests</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">Manage and track task extension requests</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'pending'
              ? 'border-orange-600 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            Pending Approval ({pendingRequests.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Download size={18} />
            History & Records
          </div>
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading requests...</p>
        </div>
      ) : activeTab === 'pending' ? (
        // Pending Approvals
        <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">All caught up!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending extension requests to approve</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <div
                key={request._id}
                className="p-5 bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-orange-700 rounded-lg hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {request.taskId?.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Requested by: <span className="font-medium text-slate-900 dark:text-white">{request.requestedBy?.name}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 ${getStatusBadge(request.status)}`}>
                    {getStatusIcon(request.status)}
                    PENDING
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">Current Required Time</p>
                    <p className="text-slate-900 dark:text-white font-bold mt-1">
                      {request.taskId?.estimatedHours}h {request.taskId?.estimatedMinutes}m
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-700">
                    <p className="text-orange-700 dark:text-orange-400 text-xs font-semibold">Additional Time Requested</p>
                    <p className="text-orange-900 dark:text-orange-200 font-bold mt-1">
                      +{request.additionalHoursRequested}h {request.additionalMinutesRequested}m
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded">
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-semibold">New Total Time</p>
                    <p className="text-slate-900 dark:text-white font-bold mt-1">
                      {(request.taskId?.estimatedHours || 0) + request.additionalHoursRequested}h {((request.taskId?.estimatedMinutes || 0) + request.additionalMinutesRequested) % 60}m
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded border border-slate-200 dark:border-slate-700 mb-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reason for Extension:</p>
                  <p className="text-sm text-slate-900 dark:text-white">{request.reason}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setApprovalNotes('');
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} />
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequest(request);
                      setApprovalNotes('');
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // History & Records
        <div className="space-y-3">
          {historyRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <AlertCircle size={48} className="mx-auto text-slate-400 mb-2" />
              <p className="text-slate-600 dark:text-slate-400">No extension requests found</p>
            </div>
          ) : (
            historyRequests.map((request) => (
              <div
                key={request._id}
                className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        {request.taskId?.title}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${getStatusBadge(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {request.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Requested</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-xs">Additional Time</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          +{request.additionalHoursRequested}h {request.additionalMinutesRequested}m
                        </p>
                      </div>
                      {request.status !== 'pending' && (
                        <>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs">Decision Date</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {request.approvedAt || request.rejectedAt ? new Date(request.approvedAt || request.rejectedAt).toLocaleDateString() : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-600 dark:text-slate-400 text-xs">Decided By</p>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {request.approvedBy?.name || '—'}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {request.approvalNotes && (
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700 text-sm">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                          {request.status === 'approved' ? '✓ Approval Notes:' : '✗ Rejection Reason:'}
                        </p>
                        <p className="text-blue-900 dark:text-blue-200">{request.approvalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review & Decision Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white dark:bg-slate-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Review Extension Request
              </h2>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task Title</p>
                  <p className="text-slate-900 dark:text-white mt-1">{selectedRequest.taskId?.title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Requested By</p>
                  <p className="text-slate-900 dark:text-white mt-1">{selectedRequest.requestedBy?.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Time</p>
                  <p className="text-slate-900 dark:text-white font-bold mt-1">
                    {selectedRequest.taskId?.estimatedHours}h {selectedRequest.taskId?.estimatedMinutes}m
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded border border-orange-300 dark:border-orange-700">
                  <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">Additional</p>
                  <p className="text-orange-900 dark:text-orange-200 font-bold mt-1">
                    +{selectedRequest.additionalHoursRequested}h {selectedRequest.additionalMinutesRequested}m
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded border border-green-300 dark:border-green-700">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">New Total</p>
                  <p className="text-green-900 dark:text-green-200 font-bold mt-1">
                    {(selectedRequest.taskId?.estimatedHours || 0) + selectedRequest.additionalHoursRequested}h {((selectedRequest.taskId?.estimatedMinutes || 0) + selectedRequest.additionalMinutesRequested) % 60}m
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reason</p>
                <p className="text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-3 rounded">
                  {selectedRequest.reason}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Your Notes (Optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add approval or rejection notes..."
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                  rows="3"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{approvalNotes.length} characters</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRequest(null);
                  setApprovalNotes('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleReject(selectedRequest._id)}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <XCircle size={16} />
                )}
                {actionLoading ? 'Processing...' : 'Reject'}
              </Button>
              <Button
                onClick={() => handleApprove(selectedRequest._id)}
                disabled={actionLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {actionLoading ? 'Processing...' : 'Approve'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

