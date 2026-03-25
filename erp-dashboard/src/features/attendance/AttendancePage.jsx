import React, { useEffect, useState, useRef } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Input from "../../components/ui/Input.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { requestGeolocation } from "../../lib/geolocation.js";
import { Clock, AlertCircle, CheckCircle2, Search, LogIn, LogOut, TrendingUp, Calendar, User, Timer, X, ChevronDown } from "lucide-react";

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const isEditor = user?.role === ROLES.ADMIN || user?.role === ROLES.HR;
  const isAdmin = user?.role === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterHROnly, setFilterHROnly] = useState(isAdmin);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Track if user has checked in/out today
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  
  // Real-time timer state
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const timerRef = useRef(null);

  // Calculate elapsed time from check-in
  const calculateElapsedTime = (checkIn) => {
    if (!checkIn) return { hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date();
    const [checkInHours, checkInMinutes] = checkIn.split(':').map(Number);
    
    const checkInDate = new Date();
    checkInDate.setHours(checkInHours, checkInMinutes, 0, 0);
    
    const diff = now - checkInDate;
    if (diff < 0) return { hours: 0, minutes: 0, seconds: 0 };
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  // Format time as HH:MM:SS
  const formatTime = (time) => {
    const h = String(time.hours).padStart(2, '0');
    const m = String(time.minutes).padStart(2, '0');
    const s = String(time.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  // Start timer when checked in
  useEffect(() => {
    if (hasCheckedInToday && checkInTime && !hasCheckedOutToday) {
      // Update immediately
      setElapsedTime(calculateElapsedTime(checkInTime));
      
      // Then update every second
      timerRef.current = setInterval(() => {
        setElapsedTime(calculateElapsedTime(checkInTime));
      }, 1000);
    } else {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [hasCheckedInToday, checkInTime, hasCheckedOutToday]);

  const load = async () => {
    setLoading(true);
    try {
      // Calculate date range: last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const toDate = today.toISOString().split("T")[0];
      const fromDate = thirtyDaysAgo.toISOString().split("T")[0];
      
      const res = await api.get("/attendance", {
        params: { from: fromDate, to: toDate }
      });
      setRows(res.data || []);
      
      // Check if user has already checked in/out today
      const todayRecord = res.data?.find(r => r.date === toDate);
      const hasCheckedIn = !!todayRecord?.checkIn;
      const hasCheckedOut = !!todayRecord?.checkOut;
      
      // Set check-in time for timer
      if (todayRecord?.checkIn) {
        setCheckInTime(todayRecord.checkIn);
      } else {
        setCheckInTime(null);
      }
      
      // Check-in button: disabled if already checked in today
      // Check-out button: disabled if NOT checked in OR already checked out today
      setHasCheckedInToday(hasCheckedIn);
      setHasCheckedOutToday(hasCheckedOut);
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Attendance load failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const checkIn = async () => {
    try {
      console.log("📍 Attempting check-in with geolocation...");
      
      // Capture current GPS location
      const location = await requestGeolocation();
      console.log("✅ Location captured:", location);
      
      // Send check-in with location data
      const res = await api.post("/attendance/checkin", {
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude
      });
      
      console.log("✅ Check-in successful:", res.data);
      toast({ 
        title: "Checked in successfully", 
        description: `Distance from office: ${res.data.attendance?.distanceFromOffice || 0}m`,
        type: "success" 
      });
      
      // Immediately disable check-in button and start timer from ZERO
      setHasCheckedInToday(true);
      // Set current time for fresh timer start (not from database balance)
      setCheckInTime(new Date().toTimeString().slice(0, 5));
      // Reset elapsed time to zero
      setElapsedTime({ hours: 0, minutes: 0, seconds: 0 });
      load();
    } catch (e) {
      console.error("❌ Check-in failed:", e?.response?.data?.message || e.message);
      toast({ title: e?.response?.data?.message || "Check-in failed", type: "error" });
    }
  };

  const checkOut = async () => {
    try {
      console.log("🔚 Attempting check-out...");
      const res = await api.post("/attendance/checkout");
      console.log("✅ Check-out successful:", res.data);
      toast({ title: "Checked out successfully", type: "success" });
      
      // Disable both buttons - both checked in and checked out for today
      setHasCheckedInToday(true);
      setHasCheckedOutToday(true);
      load();
    } catch (e) {
      console.error("❌ Check-out failed:", e?.response?.data?.message || e.message);
      toast({ title: e?.response?.data?.message || "Check-out failed", type: "error" });
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      checkIn: record.checkIn || '',
      checkOut: record.checkOut || '',
      status: record.status || 'PRESENT'
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      if (!editForm.checkIn && !editForm.checkOut) {
        toast({ title: "Please enter at least Clock In or Clock Out time", type: "error" });
        return;
      }

      await api.put(`/attendance/${editingRecord._id}`, editForm);
      toast({ title: "Attendance updated successfully", type: "success" });
      setShowEditModal(false);
      setEditingRecord(null);
      setEditForm({});
      load();
    } catch (e) {
      toast({ title: e?.response?.data?.message || "Update failed", type: "error" });
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setEditForm({});
  };

  // Filter logic
  const filteredRows = rows.filter((record) => {
    // Search filter
    const matchesSearch = !searchTerm || 
      (record.userName || "Unknown").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.email || "").toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    let matchesType = true;
    if (filterType !== "all") {
      if (filterType === "present" && record.status !== "PRESENT") matchesType = false;
      if (filterType === "late" && record.status !== "LATE") matchesType = false;
      if (filterType === "short" && record.status !== "SHORT_HOURS") matchesType = false;
      if (filterType === "absent" && record.status !== "ABSENT") matchesType = false;
    }

    // HR filter (for admin to review HR staff only)
    const matchesHRFilter = !filterHROnly || record.userRole === ROLES.HR;

    return matchesSearch && matchesType && matchesHRFilter;
  });

  // Calculate statistics
  const stats = {
    total: rows.length,
    present: rows.filter(r => r.status === "PRESENT").length,
    shortHours: rows.filter(r => r.status === "SHORT_HOURS").length,
    absent: rows.filter(r => r.status === "ABSENT").length
  };

  // Check if someone checked in but forgot to check out
  const isForgotCheckOut = (record) => {
    return record.status === "ABSENT" && record.checkIn && !record.checkOut;
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch(status) {
      case "PRESENT":
        return { bg: "bg-[#E6F4EA]", border: "border-[#137333]", text: "text-[var(--text-success)]", icon: CheckCircle2 };
      case "SHORT_HOURS":
        return { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-700", icon: AlertCircle };
      case "LATE":
        return { bg: "bg-yellow-50", border: "border-yellow-400", text: "text-yellow-700", icon: Clock };
      case "ABSENT":
        return { bg: "bg-[#FCE8E6]", border: "border-[#C5221F]", text: "text-[var(--text-error)]", icon: AlertCircle };
      default:
        return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", icon: Clock };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title={isAdmin ? "HR Attendance Monitoring" : "My Attendance"}
        subtitle={isAdmin ? "Monitor HR staff attendance and login/logout times" : "Track your daily check-in and check-out times"}
      />

      {/* TODAY'S ATTENDANCE STATUS - PROMINENT SECTION */}
      {!isAdmin && (
        <Card elevated className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50 dark:from-blue-950/50 dark:to-cyan-950/30 dark:border-blue-800">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#0A1931] dark:text-white mb-1">Today's Status</h2>
                <p className="text-sm text-[#4A7FA7] dark:text-slate-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="flex items-center justify-center w-16 h-16 shadow-lg bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl">
                <Clock className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button 
                onClick={checkIn} 
                disabled={hasCheckedInToday}
                className={`h-12 text-base shadow-lg ${hasCheckedInToday ? 'bg-gray-400 cursor-not-allowed' : 'text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}
              >
                <LogIn className="w-5 h-5 mr-2" />
                {hasCheckedInToday ? "Checked In ✓" : "Check In"}
              </Button>
              <Button 
                onClick={checkOut} 
                disabled={!hasCheckedInToday || hasCheckedOutToday}
                className={`h-12 text-base shadow-lg ${(!hasCheckedInToday || hasCheckedOutToday) ? 'bg-gray-400 cursor-not-allowed' : 'text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700'}`}
              >
                <LogOut className="w-5 h-5 mr-2" />
                {hasCheckedOutToday ? "Checked Out ✓" : "Check Out"}
              </Button>
            </div>

            {/* Today's Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-4 bg-white border-l-4 dark:bg-slate-800 rounded-xl border-l-green-500">
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 font-semibold uppercase">Check In</p>
                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                  {rows.find(r => r.date === new Date().toISOString().split('T')[0])?.checkIn || "—"}
                </p>
              </div>
              <div className="p-4 bg-white border-l-4 dark:bg-slate-800 rounded-xl border-l-orange-500">
                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 font-semibold uppercase">Check Out</p>
                <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {rows.find(r => r.date === new Date().toISOString().split('T')[0])?.checkOut || "—"}
                </p>
              </div>
              {/* Real-time Timer Display */}
              <div className="col-span-2 p-4 bg-white border-l-4 dark:bg-slate-800 rounded-xl border-l-purple-500">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-purple-600" />
                  <p className="text-xs text-[#4A7FA7] dark:text-slate-400 font-semibold uppercase">Time Worked Today</p>
                </div>
                <p className="mt-1 font-mono text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {hasCheckedInToday && !hasCheckedOutToday ? formatTime(elapsedTime) : 
                   hasCheckedOutToday ? (rows.find(r => r.date === new Date().toISOString().split('T')[0])?.totalHours ? `${rows.find(r => r.date === new Date().toISOString().split('T')[0])?.totalHours}h` : "—") : 
                   "00:00:00"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Statistics Cards (Admin only) */}
      {isAdmin && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">Total Records</p>
                <p className="text-3xl font-bold text-[#4A7FA7] mt-2">{stats.total}</p>
                <p className="text-xs text-[#4A7FA7] mt-2">This month</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-blue-200 dark:bg-blue-900/50 rounded-xl">
                <Clock className="w-6 h-6 text-[#4A7FA7]" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">✓ Present</p>
                <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">{stats.total > 0 ? Math.round((stats.present/stats.total)*100) : 0}% rate</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-green-200 dark:bg-green-900/50 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-orange-600 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">⏰ Short Hours</p>
                <p className="mt-2 text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.shortHours}</p>
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">{stats.total > 0 ? Math.round((stats.shortHours/stats.total)*100) : 0}% rate</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-orange-200 dark:bg-orange-900/50 rounded-xl">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 border-l-4 border-l-red-600 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">✗ Absent</p>
                <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{stats.total > 0 ? Math.round((stats.absent/stats.total)*100) : 0}% rate</p>
              </div>
              <div className="flex items-center justify-center w-12 h-12 bg-red-200 dark:bg-red-900/50 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Controls (Admin only) */}
      {isAdmin && (
        <Card className="p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/30 dark:to-blue-900/20 border-l-4 border-l-[#4A7FA7] shadow-md">
          <div className="mb-4">
            <h3 className="text-sm font-semibold uppercase text-[#4A7FA7] tracking-wider">Search & Filter</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-[#4A7FA7]" />
              <Input
                placeholder="Search staff name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-[#B3CFE5] rounded-lg focus:border-[#4A7FA7] focus:shadow-md transition-all"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border-2 border-[#B3CFE5] rounded-lg bg-white text-[var(--text-main)] font-medium focus:border-[#4A7FA7] focus:shadow-md transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="present">✓ Present Only</option>
              <option value="short">⏰ Short Hours</option>
              <option value="late">Late Arrivals</option>
              <option value="absent">✗ Absent</option>
            </select>

            <div className="flex items-center gap-3 px-4 py-2 bg-white border-2 border-[#B3CFE5] rounded-lg hover:border-[#4A7FA7] transition-colors cursor-pointer">
              <input
                type="checkbox"
                id="hrFilter"
                checked={filterHROnly}
                onChange={(e) => setFilterHROnly(e.target.checked)}
                className="w-4 h-4 border-2 border-[#B3CFE5] rounded cursor-pointer"
              />
              <label htmlFor="hrFilter" className="text-sm font-medium text-[var(--text-main)] cursor-pointer">
                HR Staff Only
              </label>
            </div>

            <Button
              onClick={load}
              disabled={loading}
              className="bg-gradient-to-r from-[#4A7FA7] to-[#2A5F87] hover:from-[#3a5f87] hover:to-[#1A4F77] text-white font-semibold shadow-lg"
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </Card>
      )}

      {/* Attendance Table */}
      <Card className="p-6 bg-white border shadow-lg border-slate-100">
        {loading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : (
          <div>
            <div className="pb-6 mb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4A7FA7] to-[#2A5F87] rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-main)]">
                    {isAdmin ? `Attendance Records (${filteredRows.length})` : "My Attendance"}
                  </h3>
                  <p className="text-xs text-[var(--text-light)]">
                    {isAdmin ? `Showing ${filteredRows.length} of ${rows.length} records` : "Track your attendance history"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#B3CFE5] rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#0A1931]" style={{ backgroundColor: '#0A1931' }}>
                    {isAdmin && (
                      <>
                        <th className="px-6 py-4 font-bold text-left" style={{ color: 'white' }}>Staff Name</th>
                        <th className="px-6 py-4 font-bold text-left" style={{ color: 'white' }}>Role</th>
                      </>
                    )}
                    <th className="px-6 py-4 font-bold text-left" style={{ color: 'white' }}>Date</th>
                    <th className="px-6 py-4 font-bold text-left" style={{ color: 'white' }}>Shift Hours</th>
                    <th className="px-6 py-4 font-bold text-center" style={{ color: 'white' }}>Clock In</th>
                    <th className="px-6 py-4 font-bold text-center" style={{ color: 'white' }}>Clock Out</th>
                    <th className="px-6 py-4 font-bold text-center" style={{ color: 'white' }}>Total Worked</th>
                    <th className="px-6 py-4 font-bold text-center" style={{ color: 'white' }}>Status</th>
                    {isEditor && <th className="px-6 py-4 font-bold text-center" style={{ color: 'white' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((record, idx) => {
                    const statusStyle = getStatusBadge(record.status || "UNKNOWN");
                    const forgotCheckOut = isForgotCheckOut(record);
                    return (
                      <tr
                        key={record._id}
                        className={`border-t border-[#B3CFE5] transition-colors duration-200 ${
                          forgotCheckOut 
                            ? 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-l-4 border-l-red-600' 
                            : idx % 2 === 0 ? 'bg-white hover:bg-[#E6F4EA]' : 'bg-[#F9FCFD] hover:bg-[#E6F4EA]'
                        }`}
                      >
                        {isAdmin && (
                          <>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#4A7FA7] to-[#2A5F87] grid place-items-center text-white text-xs font-bold shadow-sm">
                                  {(record.userName || "?").slice(0, 1).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-[var(--text-main)]">{record.userName || "Unknown"}</p>
                                  <p className="text-xs text-[var(--text-light)]">{record.email || "—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-full">
                                {record.userRole || "Employee"}
                              </span>
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4 font-semibold text-[var(--text-main)]">{record.date}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-[var(--text-main)]">{record.shiftStart} - {record.shiftEnd}</div>
                          <div className="text-xs text-[var(--text-light)] mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {record.shiftHours || "8h"} expected
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record.checkIn ? (
                            <div>
                              <p className="font-semibold text-[var(--text-main)] flex items-center justify-center gap-2">
                                <LogIn className="w-4 h-4 text-green-600" />
                                {record.checkIn}
                              </p>
                              {record.status === "LATE" && <p className="mt-1 text-xs font-semibold text-orange-600">Late</p>}
                            </div>
                          ) : (
                            <p className="text-[var(--text-light)]">—</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {record.checkOut ? (
                            <div>
                              <p className="font-semibold text-[var(--text-main)] flex items-center justify-center gap-2">
                                <LogOut className="w-4 h-4 text-orange-600" />
                                {record.checkOut}
                              </p>
                              {record.status === "SHORT_HOURS" && <p className="mt-1 text-xs font-semibold text-orange-600">Early</p>}
                            </div>
                          ) : forgotCheckOut ? (
                            <div className="text-center">
                              <p className="font-semibold text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Forgot
                              </p>
                              <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">Check-out</p>
                            </div>
                          ) : (
                            <p className="text-[var(--text-light)]">—</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-[#4A7FA7]">
                          {record.totalHours ? `${record.totalHours}h` : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {forgotCheckOut ? (
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm border-2 bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400">
                              <AlertCircle className="w-4 h-4" />
                              ⚠️ Forgot Check-out
                            </div>
                          ) : (
                            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm border-2 ${statusStyle.bg} ${statusStyle.border} ${statusStyle.text}`}>
                              {statusStyle.icon && <statusStyle.icon className="w-4 h-4" />}
                              {record.status || "—"}
                            </div>
                          )}
                        </td>
                        {isEditor && (
                          <td className="px-6 py-4 text-center">
                            <Button size="sm" onClick={() => handleEdit(record)} variant="ghost" className="text-[#4A7FA7] font-semibold hover:bg-[#E6F4EA]">
                              Edit
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRows.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <Calendar className="w-12 h-12 text-[var(--text-light)] mx-auto mb-3 opacity-50" />
                  <p className="text-[var(--text-light)] font-medium">No attendance records found</p>
                  <p className="text-xs text-[var(--text-light)] mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Edit Attendance Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            {/* Modal Header */}
            <div className="relative sticky top-0 z-10 p-8 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600">
              <div className="absolute top-0 right-0 w-40 h-40 -mt-20 -mr-20 rounded-full bg-white/10 blur-3xl" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-1">Edit Attendance</h2>
                  <p className="text-blue-100 text-sm">Date: {editingRecord.date}</p>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 transition-colors rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              {/* Shift Information */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-blue-50/40 to-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Shift Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shift Start</p>
                    <p className="text-base font-medium text-slate-900 mt-2">{editingRecord.shiftStart}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Shift End</p>
                    <p className="text-base font-medium text-slate-900 mt-2">{editingRecord.shiftEnd}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Expected Hours</p>
                    <p className="text-base font-medium text-slate-900 mt-2">{editingRecord.shiftHours || '8h'}</p>
                  </div>
                </div>
              </div>

              {/* Clock In/Out Times */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-green-50/40 to-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Clock In/Out Times</h3>
                
                <div className="space-y-4">
                  {/* Clock In */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-green-600" />
                      Clock In Time
                    </label>
                    <input
                      type="time"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    />
                    {editingRecord.checkIn && (
                      <p className="text-xs text-slate-500 mt-2">Original: {editingRecord.checkIn}</p>
                    )}
                  </div>

                  {/* Clock Out */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-orange-600" />
                      Clock Out Time
                    </label>
                    <input
                      type="time"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    />
                    {editingRecord.checkOut && (
                      <p className="text-xs text-slate-500 mt-2">Original: {editingRecord.checkOut}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-purple-50/40 to-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Attendance Status</h3>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    <option value="PRESENT">✓ Present</option>
                    <option value="LATE">⏰ Late Arrival</option>
                    <option value="SHORT_HOURS">Early Departure</option>
                    <option value="ABSENT">✗ Absent</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-2">Current: {editingRecord.status}</p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-amber-50/40 to-slate-50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Summary</h3>
                
                <div className="p-4 bg-white rounded-lg border border-amber-200">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date:</span>
                      <span className="font-semibold text-slate-900">
                        {editingRecord.date ? (() => {
                          const [year, month, day] = editingRecord.date.split('-');
                          return `${day}/${month}/${year}`;
                        })() : 'N/A'}
                      </span>
                    </div>
                    {editForm.checkIn && editForm.checkOut && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Hours:</span>
                        <span className="font-semibold text-slate-900">{editingRecord.totalHours || 'Calculating...'}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`font-semibold px-2 py-1 rounded text-xs ${
                        editForm.status === 'PRESENT' ? 'bg-green-100 text-green-700' :
                        editForm.status === 'LATE' ? 'bg-yellow-100 text-yellow-700' :
                        editForm.status === 'SHORT_HOURS' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {editForm.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t border-slate-200">
              <Button
                onClick={handleCancelEdit}
                className="flex-1 px-6 py-3 font-semibold transition-all duration-200 border rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="flex-1 px-6 py-3 font-semibold text-white transition-all duration-200 shadow-lg rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

