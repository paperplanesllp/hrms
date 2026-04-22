import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '../../store/toastStore.js';
import api from '../../lib/api.js';
import { useAuthStore } from '../../store/authStore.js';

const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short',
  year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
}) : '—';

export default function ExtensionRequestsPage() {
  const currentUser = useAuthStore(s => s.user);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  // Per-request reject reason state
  const [rejectReasons, setRejectReasons] = useState({});

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pendingRes, myRes] = await Promise.all([
        api.get('/extensions/pending-approvals'),
        api.get('/extensions/my-requests')
      ]);
      setPendingRequests(pendingRes.data?.data?.requests || pendingRes.data?.requests || []);
      setMyRequests(myRes.data?.data?.requests || myRes.data?.requests || []);
    } catch (err) {
      console.error('Error fetching extension requests:', err);
      toast({ title: 'Failed to load extension requests', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req) => {
    setActionLoading(req._id + '_approve');
    try {
      await api.put(`/extensions/${req._id}/approve`, { approvalNotes: '' });
      toast({ title: '✅ Extension Approved', message: `+${req.additionalHoursRequested}h ${req.additionalMinutesRequested}m added. Employee notified.`, type: 'success' });
      fetchAll();
    } catch (err) {
      toast({ title: 'Failed to approve', message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req) => {
    const reason = rejectReasons[req._id]?.trim();
    if (!reason) {
      toast({ title: 'Rejection reason is required', type: 'error' });
      return;
    }
    setActionLoading(req._id + '_reject');
    try {
      await api.put(`/extensions/${req._id}/reject`, { rejectionReason: reason });
      toast({ title: '❌ Extension Rejected', message: 'Employee has been notified.', type: 'warning' });
      setRejectReasons(prev => { const n = { ...prev }; delete n[req._id]; return n; });
      fetchAll();
    } catch (err) {
      toast({ title: 'Failed to reject', message: err.response?.data?.message || err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const StatusBadge = ({ status }) => {
    const cfg = {
      pending:  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const icon = { pending: <Clock size={12} />, approved: <CheckCircle2 size={12} />, rejected: <XCircle size={12} /> };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${cfg[status] || cfg.pending}`}>
        {icon[status]} {status?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Extension Requests</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage task time extension requests</p>
        </div>
        <button onClick={fetchAll} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
          <RefreshCw size={18} className={`text-slate-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[
          { key: 'pending', label: `Pending Approval`, count: pendingRequests.length },
          { key: 'my',      label: 'My Requests',      count: myRequests.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab.key === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-slate-500 dark:text-slate-400 text-sm">Loading...</p>
        </div>
      ) : activeTab === 'pending' ? (
        // ── Pending Approvals (HR/Manager view) ──
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <CheckCircle2 size={40} className="mx-auto text-green-400 mb-3" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No pending extension requests</p>
            </div>
          ) : pendingRequests.map(req => (
            <div key={req._id} className="bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">{req.taskId?.title || 'Task'}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Requested by <span className="font-semibold text-slate-700 dark:text-slate-300">{req.requestedBy?.name}</span>
                    {' · '}{fmtDate(req.createdAt)}
                  </p>
                </div>
                <StatusBadge status={req.status} />
              </div>

              {/* Time info */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Current Estimate</p>
                  <p className="font-bold text-slate-900 dark:text-white">{req.taskId?.estimatedHours || 0}h {req.taskId?.estimatedMinutes || 0}m</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1">Requesting</p>
                  <p className="font-bold text-orange-800 dark:text-orange-200">+{req.additionalHoursRequested}h {req.additionalMinutesRequested}m</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">New Total</p>
                  <p className="font-bold text-green-800 dark:text-green-200">
                    {(req.taskId?.estimatedHours || 0) + req.additionalHoursRequested}h{' '}
                    {((req.taskId?.estimatedMinutes || 0) + req.additionalMinutesRequested) % 60}m
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Reason:</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{req.reason}</p>
              </div>

              {/* Reject reason input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Rejection reason <span className="text-slate-400">(required only if rejecting)</span>
                </label>
                <input
                  type="text"
                  value={rejectReasons[req._id] || ''}
                  onChange={e => setRejectReasons(prev => ({ ...prev, [req._id]: e.target.value }))}
                  placeholder="Enter reason for rejection..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50"
                >
                  {actionLoading === req._id + '_approve'
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <CheckCircle2 size={16} />}
                  Approve & Notify Employee
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={!!actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50"
                >
                  {actionLoading === req._id + '_reject'
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <XCircle size={16} />}
                  Reject & Notify Employee
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // ── My Requests (Employee view) ──
        <div className="space-y-3">
          {myRequests.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <AlertCircle size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No extension requests yet</p>
            </div>
          ) : myRequests.map(req => (
            <div key={req._id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{req.taskId?.title || 'Task'}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Requested {fmtDate(req.createdAt)}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>

              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">Requested</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">+{req.additionalHoursRequested}h {req.additionalMinutesRequested}m</p>
                </div>
                {req.status !== 'pending' && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Decision</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{fmtDate(req.approvedAt || req.rejectedAt)}</p>
                  </div>
                )}
              </div>

              {req.approvalNotes && (
                <div className={`p-2.5 rounded-lg text-sm border ${
                  req.status === 'approved'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                }`}>
                  <span className="font-semibold text-xs">{req.status === 'approved' ? '✅ Note:' : '❌ Reason:'}</span>{' '}
                  {req.approvalNotes}
                </div>
              )}

              {req.status === 'pending' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <Clock size={12} /> Waiting for manager/HR approval...
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
