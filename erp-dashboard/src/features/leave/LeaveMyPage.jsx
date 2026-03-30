import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Select from "../../components/ui/Select.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Link } from "react-router-dom";

import {
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Calendar,
  Plus
} from "lucide-react";

export default function LeaveMyPage() {

  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({ total: 0, used: 0, pending: 0, remaining: 0, byType: [] });
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [form, setForm] = useState({
    from: "",
    to: "",
    reason: "",
    leaveType: ""
  });

  /* ---------------- LOAD LEAVE TYPES ---------------- */

  const loadLeaveTypes = async () => {
    try {
      setLoadingTypes(true);
      const res = await api.get("/leave-types");
      const types = res.data.data || [];
      setLeaveTypes(types);
      // Set default to first leave type if available
      if (types.length > 0 && !form.leaveType) {
        setForm(prev => ({ ...prev, leaveType: types[0]._id }));
      }
    } catch (err) {
      console.error("Failed to load leave types:", err);
      toast({ title: "Failed to load leave types", type: "error" });
    } finally {
      setLoadingTypes(false);
    }
  };

  /* ---------------- LOAD LEAVE BALANCE ---------------- */

  const loadLeaveBalance = async () => {
    try {
      setBalanceLoading(true);
      const res = await api.get("/dashboard/leave-balance");
      if (res.data) {
        setLeaveBalance(res.data);
      }
    } catch (err) {
      console.error("Failed to load leave balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  };

  /* ---------------- LOAD LEAVES ---------------- */

  const load = async () => {

    try {

      setLoading(true);

      const res = await api.get("/leave/my");

      setItems(res.data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  };

  useEffect(() => {

    loadLeaveTypes();
    load();
    loadLeaveBalance();

    const handleLeaveUpdate = () => {
      load();
      loadLeaveBalance();
    };

    window.addEventListener("leaveStatusUpdate", handleLeaveUpdate);

    return () => {
      window.removeEventListener("leaveStatusUpdate", handleLeaveUpdate);
    };

  }, []);

  /* ---------------- REQUEST LEAVE ---------------- */

  const requestLeave = async () => {

    try {
// Find the leave type name from ID
      const selectedType = leaveTypes.find(t => t._id === form.leaveType);

      await api.post("/leave", {
        fromDate: form.from,
        toDate: form.to,
        reason: form.reason,
        leaveType: selectedType?.name || form.leaveType
      });

      toast({ title: "Leave requested successfully", type: "success" });

      setOpen(false);

      setForm({
        from: "",
        to: "",
        reason: "",
        leaveType: leaveTypes.length > 0 ? leaveTypes[0]._id : ""
      });

      load();

    } catch (e) {

      toast({
        title: e?.response?.data?.message || "Request failed",
        type: "error"
      });

    }

  };

  /* ---------------- STATS ---------------- */

  const approvedLeaves = items.filter(x => x.status === "APPROVED").length;
  const pendingLeaves = items.filter(x => x.status === "PENDING").length;
  const rejectedLeaves = items.filter(x => x.status === "REJECTED").length;

  const getStatusBadge = (status) => {

    switch (status) {

      case "APPROVED":
        return <Badge className="text-green-700 bg-green-100 border-green-200">Approved</Badge>;

      case "REJECTED":
        return <Badge className="text-red-700 bg-red-100 border-red-200">Rejected</Badge>;

      default:
        return <Badge className="text-yellow-700 bg-yellow-100 border-yellow-200">Pending</Badge>;

    }

  };

  const formatDate = (dateStr) => {

    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });

  };

  /* ---------------- ADMIN VIEW ---------------- */

  if (isAdmin) {

    return (

      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8fbff] to-white">

        <Card className="p-10 text-center shadow-xl rounded-2xl bg-white/80 backdrop-blur">

          <AlertCircle className="mx-auto mb-4 text-indigo-500 w-14 h-14" />

          <h2 className="mb-2 text-xl font-semibold text-gray-800">
            Admin Access
          </h2>

          <p className="mb-6 text-gray-500">
            Leave approvals are managed from the Leave Management panel.
          </p>

          <Link to="/leave/manage">
            <Button className="text-white bg-indigo-600 hover:bg-indigo-700">
              Go to Leave Management
            </Button>
          </Link>

        </Card>

      </div>

    );

  }

  /* ---------------- PAGE ---------------- */

  return (

  <div className="min-h-screen px-6 py-8 space-y-10 bg-gradient-to-br from-[#f8fbff] via-white to-[#eef5ff]">

  <PageTitle
  title="My Leave Requests"
  subtitle="Request leave and track approval status"
  actions={
  <Button
  onClick={()=>setOpen(true)}
  className="flex items-center gap-2 text-white bg-indigo-600 hover:bg-indigo-700"
  >
  <Plus size={16}/>
  Request Leave
  </Button>
  }
  />

  {/* ---------------- LEAVE BALANCE SUMMARY ---------------- */}
  <Card className="rounded-2xl shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-800">
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Leave Balance Summary
        </h3>
      </div>

      {balanceLoading ? (
        <div className="flex items-center justify-center py-4">
          <Clock className="animate-spin text-emerald-600 w-5 h-5" />
          <span className="ml-2 text-sm text-gray-600">Loading balance...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Overall Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white/60 dark:bg-slate-800/40 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Days</span>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{leaveBalance.total}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/40 p-4 rounded-lg border border-orange-100 dark:border-orange-800/30">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Used</span>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{leaveBalance.used}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/40 p-4 rounded-lg border border-amber-100 dark:border-amber-800/30">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pending</span>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{leaveBalance.pending}</p>
            </div>
            <div className="bg-white/60 dark:bg-slate-800/40 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Remaining</span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{leaveBalance.remaining}</p>
            </div>
          </div>

          {/* Leave Type Breakdown */}
          {leaveBalance.byType && leaveBalance.byType.length > 0 && (
            <div className="mt-6 pt-6 border-t border-emerald-200 dark:border-emerald-800/50">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Breakdown by Leave Type</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {leaveBalance.byType.map((type, idx) => (
                  <div key={idx} className="bg-white/60 dark:bg-slate-800/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: type.color || "#3b82f6" }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">{type.leaveTypeName}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        {type.remainingDays}/{type.maxDaysPerYear}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all"
                        style={{ 
                          width: `${(type.remainingDays / type.maxDaysPerYear) * 100}%`,
                          backgroundColor: type.color || "#3b82f6"
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>Used: {type.usedDays}</span>
                      <span>Pending: {type.pendingDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </Card>

  {/* ---------------- STATS ---------------- */}

  <div className="grid gap-6 md:grid-cols-3">

  <StatCard
  title="Approved"
  value={approvedLeaves}
  icon={<CheckCircle2/>}
  color="green"
  />

  <StatCard
  title="Pending"
  value={pendingLeaves}
  icon={<Clock/>}
  color="yellow"
  />

  <StatCard
  title="Rejected"
  value={rejectedLeaves}
  icon={<XCircle/>}
  color="red"
  />

  </div>

  {/* ---------------- HISTORY ---------------- */}

  <Card className="rounded-2xl shadow-xl bg-white/80 backdrop-blur border border-[#eef1f6] overflow-hidden">

  <div className="p-6 border-b">

  <h3 className="text-lg font-semibold text-gray-800">
  Leave History
  </h3>

  <p className="text-sm text-gray-500">
  All your leave requests
  </p>

  </div>

  {loading ? (

  <div className="p-12 text-center">

  <Clock className="mx-auto mb-3 text-gray-400 animate-spin"/>

  <p className="text-gray-500">
  Loading leave records...
  </p>

  </div>

  ) : items.length===0 ? (

  <div className="p-12 text-center">

  <Calendar className="mx-auto mb-3 text-gray-300 w-14 h-14"/>

  <p className="text-gray-500">
  No leave requests yet
  </p>

  </div>

  ) : (

  <div className="divide-y">

  {items.map(item=>(
  <div key={item._id} className="p-6 transition hover:bg-gray-50">

  <div className="flex items-center justify-between mb-2">

  <div className="flex items-center gap-3">

  <span className="font-semibold text-gray-800">
  {item.leaveType}
  </span>

  {getStatusBadge(item.status)}

  </div>

  </div>

  <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">

  <Calendar size={14}/>

  {formatDate(item.fromDate)} — {formatDate(item.toDate)}

  </div>

  <p className="text-gray-700">
  {item.reason || "No reason provided"}
  </p>

  {item.status==="REJECTED" && item.rejectionReason && (

  <div className="p-3 mt-3 border border-red-200 rounded-lg bg-red-50">

  <p className="mb-1 text-sm font-medium text-red-700">
  Rejection Reason
  </p>

  <p className="text-sm text-red-600">
  {item.rejectionReason}
  </p>

  </div>

  )}

  </div>
  ))}

  </div>

  )}

  </Card>

  {/* ---------------- MODAL ---------------- */}

  <Modal open={open} onClose={() => setOpen(false)} title="Request Leave" size="lg">
    <form onSubmit={(e) => { e.preventDefault(); requestLeave(); }} className="space-y-8">
      
      {/* Leave Type Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Leave Type <span className="text-red-500">*</span>
          </label>
        </div>
        <select
          value={form.leaveType}
          onChange={(e) => setForm({...form, leaveType: e.target.value})}
          disabled={loadingTypes}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-gray-400 dark:hover:border-gray-500"
        >
          {loadingTypes ? (
            <option disabled>Loading leave types...</option>
          ) : leaveTypes.length > 0 ? (
            <>
              <option value="" disabled selected>Select a leave type</option>
              {leaveTypes.map(type => (
                <option key={type._id} value={type._id}>
                  {type.name} • {type.maxDaysPerYear} days/year
                </option>
              ))}
            </>
          ) : (
            <option disabled>No leave types available</option>
          )}
        </select>
        {form.leaveType && leaveTypes.find(t => t._id === form.leaveType) && (
          <div className="flex items-start gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
            <Calendar className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              {leaveTypes.find(t => t._id === form.leaveType)?.description || 'Leave type selected'}
            </p>
          </div>
        )}
      </div>

      {/* Date Range Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Leave Duration <span className="text-red-500">*</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* From Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm({...form, from: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
              required
            />
            {form.from && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {new Date(form.from).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* To Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm({...form, to: e.target.value})}
              min={form.from}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-400 dark:hover:border-gray-500"
              required
            />
            {form.to && (
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {new Date(form.to).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Days Display */}
      {form.from && form.to && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-900 dark:text-indigo-300">Total Leave Duration</span>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {Math.ceil((new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24)) + 1} days
          </span>
        </div>
      )}

      {/* Leave Balance Info */}
      {leaveBalance.byType && leaveBalance.byType.length > 0 && form.leaveType && (
        <div>
          {leaveBalance.byType.find(t => t.leaveTypeName === leaveTypes.find(lt => lt._id === form.leaveType)?.name) && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Available Balance</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {leaveBalance.byType.find(t => t.leaveTypeName === leaveTypes.find(lt => lt._id === form.leaveType)?.name)?.remainingDays || 0} days
                  </span>
                </div>
                <div className="w-full h-2 bg-emerald-200 dark:bg-emerald-800/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, (leaveBalance.byType.find(t => t.leaveTypeName === leaveTypes.find(lt => lt._id === form.leaveType)?.name)?.remainingDays || 0) / (leaveTypes.find(t => t._id === form.leaveType)?.maxDaysPerYear || 1) * 100)}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-600" />
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            Reason for Leave <span className="text-red-500">*</span>
          </label>
        </div>
        <textarea
          placeholder="Provide details about your leave request..."
          rows="4"
          value={form.reason}
          onChange={(e) => setForm({...form, reason: e.target.value})}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none hover:border-gray-400 dark:hover:border-gray-500"
          required
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {form.reason.length}/500 characters
          </p>
          {form.reason.length > 450 && (
            <p className="text-xs text-orange-600 dark:text-orange-400">Approaching limit</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-95 transition-all duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!form.from || !form.to || !form.reason.trim() || !form.leaveType || loadingTypes}
          className="flex-1 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submit Request</span>
        </button>
      </div>
    </form>
  </Modal>

  </div>

  );

}

/* ---------------- STAT CARD ---------------- */

function StatCard({title,value,icon,color}){

const colors={
green:"text-green-600 bg-green-100",
yellow:"text-yellow-600 bg-yellow-100",
red:"text-red-600 bg-red-100"
};

return(

<Card className="p-6 transition shadow-lg rounded-2xl bg-white/80 backdrop-blur hover:shadow-xl">

<div className="flex items-start justify-between">

<div>

<p className="text-xs tracking-wide text-gray-500 uppercase">
{title}
</p>

<p className="mt-2 text-3xl font-bold text-gray-800">
{value}
</p>

</div>

<div className={`w-10 h-10 flex items-center justify-center rounded-lg ${colors[color]}`}>
{icon}
</div>

</div>

</Card>

);

}