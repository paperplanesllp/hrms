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

    const handleLeaveUpdate = () => load();

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

  <Modal open={open} onOpenChange={setOpen} title="Request Leave">

  <div className="space-y-4">

  <Select
  label="Leave Type"
  value={form.leaveType}
  onChange={(e)=>setForm({...form,leaveType:e.target.value})}
  disabled={loadingTypes}
  >
  {loadingTypes ? (
    <option>Loading leave types...</option>
  ) : leaveTypes.length > 0 ? (
    leaveTypes.map(type => (
      <option key={type._id} value={type._id}>
        {type.name}
      </option>
    ))
  ) : (
    <option disabled>No leave types available</option>
  )}
  </Select>

  <Input
  label="From Date"
  type="date"
  value={form.from}
  onChange={(e)=>setForm({...form,from:e.target.value})}
  />

  <Input
  label="To Date"
  type="date"
  value={form.to}
  onChange={(e)=>setForm({...form,to:e.target.value})}
  />

  <textarea
  placeholder="Reason"
  rows="3"
  value={form.reason}
  onChange={(e)=>setForm({...form,reason:e.target.value})}
  className="w-full px-4 py-3 border rounded-lg"
  />

  <div className="flex justify-end gap-3 pt-4">

  <Button
  variant="secondary"
  onClick={()=>setOpen(false)}
  >
  Cancel
  </Button>

  <Button
  onClick={requestLeave}
  disabled={!form.from || !form.to || !form.reason.trim()}
  className="text-white bg-indigo-600 hover:bg-indigo-700"
  >
  Submit Request
  </Button>

  </div>

  </div>

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