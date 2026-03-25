import React, { useEffect, useMemo, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import {
  CheckCircle2,
  Clock,
  Activity,
  CalendarDays,
  Briefcase,
  Sparkles,
  Plus,
  Pause,
  Play,
  Flag,
  AlertCircle,
  Timer,
} from "lucide-react";

// Helper function to format date from YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

// Helper to format time string - validates proper HH:MM format
const formatTime = (timeStr) => {
  if (!timeStr) return "--:--";
  
  // Ensure format is HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(timeStr)) {
    return timeStr;
  }
  
  // Try to fix malformed times
  const parts = timeStr.split(":").map(p => p.trim());
  if (parts.length === 2) {
    const hours = Math.min(23, Math.max(0, parseInt(parts[0], 10) || 0));
    const mins = Math.min(59, Math.max(0, parseInt(parts[1], 10) || 0));
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  }
  
  return "--:--";
};

// Helper to format duration in minutes to readable format
const formatDuration = (minutes) => {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

export default function WorksheetPage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [pauseReasonModal, setPauseReasonModal] = useState({ open: false, itemId: null, isResuming: false });
  const [interruptionReason, setInterruptionReason] = useState("");
  const [extensionModal, setExtensionModal] = useState({ open: false, itemId: null });
  const [extensionForm, setExtensionForm] = useState({ reason: "", requestedTime: "" });
  const [form, setForm] = useState({
    date: "",
    task: "",
    hours: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/worksheet/my");
      setItems(res.data || []);
    } catch (err) {
      console.error("Error loading worksheet:", err);
      toast({
        title: "Failed to load worksheet",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 30 seconds to show updated times
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const create = async () => {
    if (!form.date || !form.task.trim() || !form.hours) {
      toast({
        title: "Please fill all fields",
        type: "error",
      });
      return;
    }

    if (Number(form.hours) <= 0) {
      toast({
        title: "Hours must be greater than 0",
        type: "error",
      });
      return;
    }

    try {
      setSaving(true);

      await api.post("/worksheet", {
        ...form,
        task: form.task.trim(),
        hours: Number(form.hours),
      });

      toast({
        title: "Task logged successfully",
        type: "success",
      });

      setForm({
        date: "",
        task: "",
        hours: "",
      });
      setOpen(false);
      load();
    } catch (e) {
      toast({
        title: e?.response?.data?.message || "Failed to save",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePauseClick = (itemId) => {
    setPauseReasonModal({ open: true, itemId, isResuming: false });
  };

  const handleResumeClick = (itemId) => {
    setPauseReasonModal({ open: true, itemId, isResuming: true });
  };

  const confirmPauseResume = async () => {
    if (!pauseReasonModal.itemId) return;

    try {
      setActionLoading(prev => ({ ...prev, [pauseReasonModal.itemId]: true }));

      const endpoint = pauseReasonModal.isResuming
        ? `/worksheet/${pauseReasonModal.itemId}/resume`
        : `/worksheet/${pauseReasonModal.itemId}/pause`;

      await api.post(endpoint, { reason: interruptionReason });

      toast({
        title: pauseReasonModal.isResuming ? "Work resumed successfully" : "Work paused successfully",
        type: "success",
      });

      setInterruptionReason("");
      setPauseReasonModal({ open: false, itemId: null, isResuming: false });
      load();
    } catch (e) {
      toast({
        title: e?.response?.data?.message || "Action failed",
        type: "error",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [pauseReasonModal.itemId]: false }));
    }
  };

  const handleComplete = async (itemId) => {
    try {
      setActionLoading(prev => ({ ...prev, [itemId]: true }));

      await api.post(`/worksheet/${itemId}/complete`);

      toast({
        title: "Work completed successfully",
        type: "success",
      });

      load();
    } catch (e) {
      toast({
        title: e?.response?.data?.message || "Failed to complete",
        type: "error",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [itemId]: false }));
    }
  };

  const handleRequestExtension = (itemId) => {
    setExtensionModal({ open: true, itemId });
  };

  const submitExtensionRequest = async () => {
    if (!extensionForm.reason.trim() || !extensionForm.requestedTime) {
      toast({
        title: "Please fill all fields",
        type: "error",
      });
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [extensionModal.itemId]: true }));

      await api.post(`/worksheet/${extensionModal.itemId}/request-extension`, {
        reason: extensionForm.reason.trim(),
        requestedTime: Number(extensionForm.requestedTime),
      });

      toast({
        title: "Time extended successfully",
        type: "success",
      });

      setExtensionForm({ reason: "", requestedTime: "" });
      setExtensionModal({ open: false, itemId: null });
      load();
    } catch (e) {
      toast({
        title: e?.response?.data?.message || "Failed to request extension",
        type: "error",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [extensionModal.itemId]: false }));
    }
  };

  const totalHours = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [items]);

  const totalActiveWorksheet = items.filter(i => i.status === "active").length;

  const latestEntryDate = useMemo(() => {
    if (!items.length) return "No logs yet";
    return items[0]?.date || "No logs yet";
  }, [items]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Daily Worksheet"
        subtitle="Track your work updates with pause/resume for interruptions like meetings and breaks."
        actions={
          <Button
            onClick={() => setOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-[#137333] via-[#15803d] to-[#166534] hover:from-[#166534] hover:via-[#15803d] hover:to-[#14532d] text-white shadow-[0_12px_30px_rgba(19,115,51,0.28)] border-0 px-5 py-2.5"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Work Log
          </Button>
        }
      />

      {/* HERO CARD */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07130c] via-[#0d3a23] to-[#137333] p-6 md:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="absolute -top-14 right-[-30px] h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-40px] left-[-20px] h-40 w-40 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 border rounded-full border-white/10 bg-white/10 text-white/90 backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Premium Productivity Panel</span>
            </div>

            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Keep every work update neat, elegant, and organized
            </h2>

            <p className="max-w-xl mt-3 text-sm leading-6 text-white/75 md:text-base">
              Add daily tasks, log hours, pause for meetings, and keep your workflow transparent for reporting and internal review.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:min-w-[430px]">
            <div className="p-4 border rounded-2xl border-white/10 bg-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2 text-white/70">
                <Activity className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Hours</span>
              </div>
              <div className="text-2xl font-bold text-white">{totalHours}h</div>
            </div>

            <div className="p-4 border rounded-2xl border-white/10 bg-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2 text-white/70">
                <Briefcase className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.18em]">Active</span>
              </div>
              <div className="text-2xl font-bold text-white">{totalActiveWorksheet}</div>
            </div>

            <div className="p-4 border rounded-2xl border-white/10 bg-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-2 text-white/70">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs uppercase tracking-[0.18em] text-black">Latest</span>
              </div>
              <div className="text-base font-semibold text-white truncate">
                {latestEntryDate === "No logs yet" ? latestEntryDate : formatDate(latestEntryDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E6F4EA] to-[#d9f7e3]">
              <Activity className="h-6 w-6 text-[#137333]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Hours Logged</p>
              <p className="text-2xl font-bold text-slate-900">{totalHours}h</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EEF6FF] to-[#dbeafe]">
              <CheckCircle2 className="h-6 w-6 text-[#2563eb]" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Entries</p>
              <p className="text-2xl font-bold text-slate-900">{items.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {loading ? (
          <Card className="rounded-[28px] border border-slate-200/70 bg-white p-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Loading work logs...</p>
            <p className="mt-1 text-sm text-slate-500">
              Please wait while we fetch your worksheet data.
            </p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="rounded-[28px] border border-slate-200/70 bg-white p-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F4EA]">
              <Briefcase className="h-8 w-8 text-[#137333]" />
            </div>
            <p className="text-xl font-semibold text-slate-900">No work logs yet</p>
            <p className="max-w-md mx-auto mt-2 text-sm text-slate-500">
              Start logging your daily tasks to build a clean and useful work history.
            </p>
            <Button
              onClick={() => setOpen(true)}
              className="mt-6 rounded-2xl bg-gradient-to-r from-[#137333] via-[#15803d] to-[#166534] text-white shadow-[0_12px_30px_rgba(19,115,51,0.22)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Work Log
            </Button>
          </Card>
        ) : (
          items.map((item, idx) => (
            <div
              key={item._id}
              className="group relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(19,115,51,0.12)]"
            >
              <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-[#137333] via-[#16a34a] to-[#86efac] ${
                item.status === "paused" ? "opacity-50" : ""
              }`} />

              <div className="pl-4 space-y-4">
                {/* Header Row */}
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        item.status === "completed" ? "bg-green-50" : item.status === "paused" ? "bg-yellow-50" : "bg-[#E6F4EA]"
                      }`}>
                        <CheckCircle2 className={`h-5 w-5 ${
                          item.status === "completed" ? "text-green-600" : item.status === "paused" ? "text-yellow-600" : "text-[#137333]"
                        }`} />
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Work Log #{idx + 1}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-700">
                            {formatDate(item.date)}
                          </p>
                          <Badge className={`text-xs px-2 py-1 ${
                            item.status === "completed" ? "bg-green-50 text-green-700 border-green-200" :
                            item.status === "paused" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                            "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                            {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || "Active"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-[15px] leading-7 text-slate-900 md:text-base">
                      {item.task}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className="rounded-xl border border-[#b7e4c7] bg-[#E6F4EA] px-4 py-2 text-sm font-semibold text-[#137333] shadow-sm">
                      {item.hours}h
                    </Badge>
                  </div>
                </div>

                {/* Time & Active Duration */}
                {(item.startTime || item.endTime) && (
                  <div className="flex flex-col gap-4 pt-2 border-t md:flex-row border-slate-100">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600">
                        <span className="font-semibold">{formatTime(item.startTime)}</span>
                        {item.endTime && <> - <span className="font-semibold">{formatTime(item.endTime)}</span></>}
                      </span>
                    </div>

                    {item.totalActiveTime > 0 && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-600">
                          Active: <span className="font-semibold text-green-600">{formatDuration(item.totalActiveTime)}</span>
                        </span>
                      </div>
                    )}

                    {item.totalPausedTime > 0 && (
                      <div className="flex items-center gap-2">
                        <Pause className="w-4 h-4 text-amber-600" />
                        <span className="text-sm text-slate-600">
                          Paused: <span className="font-semibold text-amber-600">{formatDuration(item.totalPausedTime)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Interruptions Timeline */}
                {item.interruptions && item.interruptions.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="mb-3 text-xs font-semibold tracking-wide uppercase text-slate-500">
                      Interruptions ({item.interruptions.length})
                    </p>
                    <div className="space-y-2">
                      {item.interruptions.map((interrupt, intIdx) => (
                        <div key={intIdx} className="flex items-start gap-2 p-2 border rounded-lg bg-amber-50/50 border-amber-100/50">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {interrupt.reason || "Interruption"}
                            </p>
                            <p className="text-xs text-slate-600">
                              {formatTime(interrupt.pausedAt)} → {formatTime(interrupt.resumedAt)} 
                              {interrupt.duration && ` (${formatDuration(interrupt.duration)})`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {item.status !== "completed" && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {item.status === "active" ? (
                      <>
                        <Button
                          onClick={() => handlePauseClick(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                        >
                          <Pause className="w-4 h-4" />
                          Pause Work
                        </Button>
                        <Button
                          onClick={() => handleRequestExtension(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100"
                        >
                          <Timer className="w-4 h-4" />
                          Request Extension
                        </Button>
                        <Button
                          onClick={() => handleComplete(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100"
                        >
                          <Flag className="w-4 h-4" />
                          Complete
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => handleResumeClick(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
                        >
                          <Play className="w-4 h-4" />
                          Resume Work
                        </Button>
                        <Button
                          onClick={() => handleRequestExtension(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-700 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100"
                        >
                          <Timer className="w-4 h-4" />
                          Request Extension
                        </Button>
                        <Button
                          onClick={() => handleComplete(item._id)}
                          disabled={actionLoading[item._id]}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 border border-green-200 rounded-lg bg-green-50 hover:bg-green-100"
                        >
                          <Flag className="w-4 h-4" />
                          Complete
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pause/Resume Modal */}
      <Modal 
        open={pauseReasonModal.open} 
        onOpenChange={(open) => setPauseReasonModal({ ...pauseReasonModal, open })} 
        title={pauseReasonModal.isResuming ? "Resume Work" : "Pause Work"} 
        size="sm"
      >
        <div className="space-y-4">
          <div className={`rounded-lg p-3 text-sm ${
            pauseReasonModal.isResuming ? "bg-blue-50 text-blue-800 border border-blue-200" : "bg-amber-50 text-amber-800 border border-amber-200"
          }`}>
            <p className="font-medium">
              {pauseReasonModal.isResuming 
                ? "What got done during the interruption?" 
                : "What caused the interruption?"}
            </p>
            <p className="mt-1 text-xs opacity-75">
              Add details about the meeting or interruption (optional)
            </p>
          </div>

          <Input
            label={pauseReasonModal.isResuming ? "Interruption details" : "Interruption reason"}
            placeholder={pauseReasonModal.isResuming ? "e.g., Team meeting about Q1 planning" : "e.g., Team meeting, Emergency call, etc."}
            value={interruptionReason}
            onChange={(e) => setInterruptionReason(e.target.value)}
            className="border rounded-lg border-slate-200"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setInterruptionReason("");
                setPauseReasonModal({ open: false, itemId: null, isResuming: false });
              }}
              variant="secondary"
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </Button>

            <Button
              onClick={confirmPauseResume}
              disabled={actionLoading[pauseReasonModal.itemId]}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#137333] to-[#15803d] text-white hover:from-[#15803d] hover:to-[#166534]"
            >
              {actionLoading[pauseReasonModal.itemId] ? "Processing..." : (pauseReasonModal.isResuming ? "Resume" : "Pause")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Request Time Extension Modal */}
      <Modal 
        open={extensionModal.open} 
        onOpenChange={(open) => setExtensionModal({ ...extensionModal, open })} 
        title="Request Time Extension" 
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 text-sm text-purple-800 border border-purple-200 rounded-lg bg-purple-50">
            <p className="font-medium">
              Need more time to complete this task?
            </p>
            <p className="mt-1 text-xs opacity-75">
              Your request will be sent to HR/Admin for review. They'll be notified of your need for additional time.
            </p>
          </div>

          <Input
            label="Reason for Extension"
            placeholder="e.g., Task complexity exceeded estimate, waiting for dependencies, etc."
            value={extensionForm.reason}
            onChange={(e) => setExtensionForm({ ...extensionForm, reason: e.target.value })}
            className="border rounded-lg border-slate-200"
          />

          <Input
            label="Additional Time Needed (hours)"
            type="number"
            min="0.5"
            step="0.5"
            placeholder="e.g., 2"
            value={extensionForm.requestedTime}
            onChange={(e) => setExtensionForm({ ...extensionForm, requestedTime: e.target.value })}
            className="border rounded-lg border-slate-200"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => {
                setExtensionForm({ reason: "", requestedTime: "" });
                setExtensionModal({ open: false, itemId: null });
              }}
              variant="secondary"
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </Button>

            <Button
              onClick={submitExtensionRequest}
              disabled={actionLoading[extensionModal.itemId]}
              className="px-4 py-2 text-white rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            >
              {actionLoading[extensionModal.itemId] ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal open={open} onOpenChange={setOpen} title="Log Work" size="md">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[#dbe7df] bg-gradient-to-br from-[#f7fbf8] to-[#eef9f1] p-4 shadow-inner">
            <p className="text-sm font-semibold text-slate-800">
              Add your task details for the day
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Keep entries short, clear, and professional for better reporting. You can pause/resume work later to track interruptions.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-[#137333] focus:ring-[#137333]"
            />

            <Input
              label="Task Description"
              placeholder="What did you accomplish today?"
              value={form.task}
              onChange={(e) => setForm({ ...form, task: e.target.value })}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-[#137333] focus:ring-[#137333]"
            />

            <Input
              label="Estimated Hours"
              type="number"
              min="0"
              step="0.5"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: e.target.value })}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-[#137333] focus:ring-[#137333]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              onClick={() => setOpen(false)}
              variant="secondary"
              className="px-5 bg-white border rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Button>

            <Button
              onClick={create}
              disabled={saving}
              className="rounded-2xl bg-gradient-to-r from-[#137333] via-[#15803d] to-[#166534] px-5 text-white shadow-[0_12px_28px_rgba(19,115,51,0.25)] hover:from-[#166534] hover:to-[#14532d]"
            >
              {saving ? "Saving..." : "Start Work"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
