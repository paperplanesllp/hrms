import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PageTitle from "../../components/common/PageTitle.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { requestGeolocation } from "../../lib/geolocation.js";
import { getSocket } from "../../lib/socket.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import QuickAttendanceMarking from "./QuickAttendanceMarking.jsx";
import { taskService } from "../tasks/taskService.js";
import { Users, TrendingUp, Clock, AlertCircle, CheckCircle, XCircle, Eye, LogIn, LogOut, Timer, Home, Calendar, DollarSign, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;
  const canViewStats = isAdmin || isHR;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    presentToday: 0,
    lateToday: 0,
    halfDayToday: 0,
    leavePending: 0,
    payrollPending: 0,
  });

  const [recentNews, setRecentNews] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState([]);
  const [absentEmployees, setAbsentEmployees] = useState([]);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [statEmployeeNames, setStatEmployeeNames] = useState({
    presentToday: [],
    shortHoursToday: [],
    halfDayToday: [],
    absentToday: [],
    leavePending: [],
  });
  
  // Additional data for realistic dashboard
  const [leaveBalance, setLeaveBalance] = useState({ total: 0, used: 0, pending: 0, remaining: 0, byType: [] });
  const [payrollInfo, setPayrollInfo] = useState({ nextPayDate: "2026-03-25", status: "On Track", lastPaid: "2026-03-10" });
  const [pendingTasks, setPendingTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  
  // Attendance check-in/check-out state
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
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
      setElapsedTime(calculateElapsedTime(checkInTime));
      timerRef.current = setInterval(() => {
        setElapsedTime(calculateElapsedTime(checkInTime));
      }, 1000);
    } else {
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

  // Load attendance status
  const loadAttendanceStatus = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get("/attendance", {
        params: { from: today, to: today }
      });
      
      const todayRecord = res.data?.[0];
      if (todayRecord) {
        setHasCheckedInToday(!!todayRecord.checkIn);
        setHasCheckedOutToday(!!todayRecord.checkOut);
        if (todayRecord.checkIn) {
          setCheckInTime(todayRecord.checkIn);
        }
      }
    } catch (e) {
      console.error("Error loading attendance status:", e);
    }
  };

  const handleCheckIn = async () => {
    try {
      setAttendanceLoading(true);
      const location = await requestGeolocation();
      
      // Get current time from client
      const now = new Date();
      const clientCheckInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const res = await api.post("/attendance/checkin", {
        checkIn: clientCheckInTime,
        checkInLatitude: location.latitude,
        checkInLongitude: location.longitude
      });
      
      toast({ 
        title: "✅ Checked in successfully", 
        message: `Distance from office: ${res.data.attendance?.distanceFromOffice || 0}m`,
        type: "success" 
      });
      
      setHasCheckedInToday(true);
      setCheckInTime(res.data.attendance?.checkIn || clientCheckInTime);
    } catch (e) {
      const backendMessage = e?.response?.data?.message || e.message;
      const isTooFar = /away from office|inside the office location/i.test(backendMessage);
      toast({
        title: isTooFar ? "You are too far away from office" : "Check-in failed",
        message: backendMessage,
        type: "error"
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setAttendanceLoading(true);
      const location = await requestGeolocation();
      
      // Device time is sent only for audit; server still records official time
      const now = new Date();
      const deviceTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const res = await api.post("/attendance/checkout", {
        checkOutLatitude: location.latitude,
        checkOutLongitude: location.longitude,
        checkOutAccuracy: location.accuracy,
        deviceTime,
      });

      toast({ 
        title: "✅ Checked out successfully",
        message: `Distance from office: ${res.data.attendance?.checkOutDistanceFromOffice || 0}m`,
        type: "success"
      });
      
      setHasCheckedOutToday(true);
    } catch (e) {
      const backendMessage = e?.response?.data?.message || e.message;
      const isTooFar = /away from office|inside the office location/i.test(backendMessage);
      toast({
        title: isTooFar ? "You are too far away from office" : "Check-out failed",
        message: backendMessage,
        type: "error"
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceStatus();
  }, []);

  // Load pending tasks from API
  const loadPendingTasks = async () => {
    try {
      setTasksLoading(true);
      const tasks = await taskService.getDashboardTasks(3);
      setPendingTasks(tasks || []);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setPendingTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  // Load tasks on mount
  useEffect(() => {
    loadPendingTasks();
  }, []);

  // Set up real-time task updates via Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Listen for task updates
    socket.on("task_created", loadPendingTasks);
    socket.on("task_updated", loadPendingTasks);
    socket.on("task_completed", loadPendingTasks);
    socket.on("task_deleted", loadPendingTasks);

    return () => {
      socket.off("task_created", loadPendingTasks);
      socket.off("task_updated", loadPendingTasks);
      socket.off("task_completed", loadPendingTasks);
      socket.off("task_deleted", loadPendingTasks);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // For regular staff users, don't fetch activity timeline (no access)
        // For HR/Admin, fetch appropriate role-based timeline
        let activityPromise = Promise.resolve({ data: {} });
        let absentPromise = Promise.resolve({ data: [] });
        let todayAttendancePromise = Promise.resolve({ data: [] });
        let pendingLeavesPromise = Promise.resolve({ data: [] });
        
        if (isAdmin || isHR) {
          const activityEndpoint = isAdmin ? "/activity/admin-timeline?limit=20" : "/activity/hr-timeline?limit=20";
          activityPromise = api.get(activityEndpoint).catch(() => 
            api.get("/audit/recent?limit=5")
          );
          // HR only sees absent USER-role employees (not other HR colleagues)
          const absentRolesParam = isHR && !isAdmin ? "?roles=USER" : "";
          absentPromise = api.get(`/dashboard/absent-employees${absentRolesParam}`).catch(() => 
            Promise.resolve({ data: [] })
          );

          const today = new Date().toISOString().split("T")[0];
          todayAttendancePromise = api.get("/attendance", { params: { from: today, to: today } }).catch(() =>
            Promise.resolve({ data: [] })
          );
          pendingLeavesPromise = api.get("/leave").catch(() =>
            Promise.resolve({ data: [] })
          );
        }

        const [s, n, u, lb, ae, todayAttendanceRes, pendingLeavesRes] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/news?limit=5"),
          activityPromise,
          api.get("/dashboard/leave-balance"),
          absentPromise,
          todayAttendancePromise,
          pendingLeavesPromise,
        ]);
        setStats(s.data || stats);
        setRecentNews(n.data || []);
        
        // Handle both activity logs and audit logs formats
        const updates = u.data?.data || u.data?.logs || [];
        setRecentUpdates(updates);
        
        // Update leave balance if available
        if (lb.data) {
          setLeaveBalance(lb.data);
        }
        
        // Update absent employees
        if (ae.data && Array.isArray(ae.data)) {
          setAbsentEmployees(ae.data);
        }

        if (isAdmin || isHR) {
          const todayRows = Array.isArray(todayAttendanceRes?.data) ? todayAttendanceRes.data : [];
          const pendingLeaves = Array.isArray(pendingLeavesRes?.data) ? pendingLeavesRes.data : [];
          const absentRows = Array.isArray(ae?.data) ? ae.data : [];

          const uniqueSorted = (items) =>
            Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));

          const namesByStatus = (statuses) =>
            uniqueSorted(
              todayRows
                .filter((row) => statuses.includes(row.status))
                .map((row) => row.userName || row.name || row.email)
            );

          const toMinutes = (value) => {
            if (!value || typeof value !== "string" || !value.includes(":")) return null;
            const parts = value.split(":");
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            if (Number.isNaN(h) || Number.isNaN(m)) return null;
            return h * 60 + m;
          };

          const lateCheckInNames = uniqueSorted(
            todayRows
              .filter((row) => {
                const checkInMinutes = toMinutes(row?.checkIn);
                const shiftStartMinutes = toMinutes(row?.shiftStart || "09:30");
                return checkInMinutes !== null && shiftStartMinutes !== null && checkInMinutes > shiftStartMinutes;
              })
              .map((row) => row.userName || row.name || row.email)
          );

          const pendingLeaveNames = uniqueSorted(
            pendingLeaves
              .filter((leave) => leave.status === "PENDING")
              .map((leave) => leave.userId?.name || leave.userName || leave.userId?.email)
          );

          const absentNames = uniqueSorted(
            absentRows.map((emp) => emp.name || emp.email)
          );

          setStatEmployeeNames({
            presentToday: namesByStatus(["PRESENT", "SHORT_HOURS", "HALF_DAY"]),
            shortHoursToday: uniqueSorted([
              ...namesByStatus(["SHORT_HOURS"]),
              ...lateCheckInNames,
            ]),
            halfDayToday: namesByStatus(["HALF_DAY"]),
            absentToday: absentNames,
            leavePending: pendingLeaveNames,
          });
        }
      } catch {
        // if backend doesn't have these endpoints yet, UI still loads nicely
      } finally {
        setLoading(false);
      }
    };
    load();
    loadAttendanceStatus();
  }, [isAdmin, isHR]);

  // Set up real-time leave balance updates via Socket.io
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Function to refresh leave balance
    const refreshLeaveBalance = async () => {
      try {
        const response = await api.get("/dashboard/leave-balance");
        if (response.data) {
          setLeaveBalance(response.data);
        }
      } catch (error) {
        console.error("Error refreshing leave balance:", error);
      }
    };

    // Listen for leave status updates and refresh balance
    socket.on("leave_status_update", refreshLeaveBalance);
    socket.on("new_leave_request", refreshLeaveBalance);
    socket.on("leave_deleted", refreshLeaveBalance);
    
    // Also listen for custom leave approval events
    socket.on("leave_approved", refreshLeaveBalance);
    socket.on("leave_rejected", refreshLeaveBalance);

    // Cleanup listeners on unmount
    return () => {
      socket.off("leave_status_update", refreshLeaveBalance);
      socket.off("new_leave_request", refreshLeaveBalance);
      socket.off("leave_deleted", refreshLeaveBalance);
      socket.off("leave_approved", refreshLeaveBalance);
      socket.off("leave_rejected", refreshLeaveBalance);
    };
  }, []);

  const shortHoursDisplayValue =
    statEmployeeNames.shortHoursToday.length > 0
      ? statEmployeeNames.shortHoursToday.length
      : (stats.shortHoursToday ?? stats.lateToday ?? 0);

  const timelinePreviewLimit = 5;
  const timelineItems =
    recentUpdates.length > 0
      ? recentUpdates
      : [
          {
            time: "No updates yet",
            userName: "System",
            action: "Created",
            entityName: "Sample Entry",
            changes: "Timeline is empty",
            color: "slate",
          },
        ];
  const timelinePreviewItems = timelineItems.slice(0, timelinePreviewLimit);
  const hasMoreTimelineItems = recentUpdates.length > timelinePreviewLimit;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <PageTitle
        title="Dashboard Overview"
        subtitle="Monitor attendance, leave requests, payroll, and company announcements at a glance."
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Attendance Quick Actions - For all staff users */}
          {!isAdmin && !isHR && (
            <Card elevated className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/30 dark:border-blue-800/50">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">Quick Attendance</h3>
                      <p className="text-xs text-[#4A7FA7] dark:text-slate-400">Check in or out for today</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Check-In Card */}
                  <div className="p-4 bg-white border border-blue-200 rounded-lg dark:bg-slate-800 dark:border-blue-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#0A1931] dark:text-white">Check-In</span>
                      {hasCheckedInToday && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <button
                      onClick={handleCheckIn}
                      disabled={hasCheckedInToday || attendanceLoading}
                      className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        hasCheckedInToday
                          ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed dark:bg-green-900/30 dark:text-green-400 dark:border-green-700/50"
                          : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-lg active:scale-95"
                      }`}
                    >
                      <LogIn size={18} />
                      <span>{hasCheckedInToday ? "Checked In" : "Check In"}</span>
                      {attendanceLoading && <span className="ml-1 animate-spin">⏳</span>}
                    </button>
                    {hasCheckedInToday && checkInTime && (
                      <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">at {convertTo12HourFormat(checkInTime)}</p>
                    )}
                  </div>

                  {/* Check-Out Card */}
                  <div className="p-4 bg-white border border-red-200 rounded-lg dark:bg-slate-800 dark:border-red-800/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-[#0A1931] dark:text-white">Check-Out</span>
                      {hasCheckedOutToday && <CheckCircle className="w-5 h-5 text-green-500" />}
                    </div>
                    <button
                      onClick={handleCheckOut}
                      disabled={!hasCheckedInToday || hasCheckedOutToday || attendanceLoading}
                      className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                        hasCheckedOutToday
                          ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed dark:bg-green-900/30 dark:text-green-400 dark:border-green-700/50"
                          : !hasCheckedInToday
                          ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed dark:bg-slate-700 dark:text-slate-500 dark:border-slate-600"
                          : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:shadow-lg active:scale-95"
                      }`}
                    >
                      <LogOut size={18} />
                      <span>{hasCheckedOutToday ? "Checked Out" : "Check Out"}</span>
                      {attendanceLoading && <span className="ml-1 animate-spin">⏳</span>}
                    </button>
                    {hasCheckedOutToday && (
                      <p className="mt-2 text-xs text-center text-gray-600 dark:text-gray-300">✓ Completed today</p>
                    )}
                  </div>
                </div>

                {/* Elapsed Time Display */}
                {hasCheckedInToday && !hasCheckedOutToday && (
                  <div className="p-3 mt-4 bg-blue-100 border border-blue-300 rounded-lg dark:bg-blue-900/30 dark:border-blue-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-200">Time Elapsed</span>
                      <div className="flex items-center space-x-1 text-lg font-bold text-blue-600 dark:text-blue-300">
                        <Timer size={18} />
                        <span>{formatTime(elapsedTime)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Attendance Marking - Only for HR */}
          {isHR && (
            <QuickAttendanceMarking />
          )}

          {/* Stats Grid - Only visible to Admin and HR */}
          {canViewStats && (
            <div className="grid grid-cols-1 gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard
                title="Present Today"
                value={stats.presentToday}
                hint="Active employees checked in"
                color="steel-blue"
                icon={CheckCircle}
                hoverTitle="Checked-In Employees"
                hoverList={statEmployeeNames.presentToday}
              />
              <StatCard
                title="Short Hours Today"
                value={shortHoursDisplayValue}
                hint="Late check-ins today"
                color="corporate-blue"
                icon={Clock}
                hoverTitle="Short Hours Employees"
                hoverList={statEmployeeNames.shortHoursToday}
              />
              <StatCard
                title="Half Day Today"
                value={stats.halfDayToday || 0}
                hint="Worked one half only"
                color="deep-navy"
                icon={Timer}
                hoverTitle="Half Day Employees"
                hoverList={statEmployeeNames.halfDayToday}
              />
              <StatCard
                title="Pending Leaves"
                value={stats.leavePending}
                hint="Awaiting approval"
                color="deep-navy"
                icon={AlertCircle}
                hoverTitle="Employees With Pending Leave"
                hoverList={statEmployeeNames.leavePending}
              />
              {(isAdmin || isHR) && (
              <StatCard
                title="Absent Today"
                value={stats.absentToday || 0}
                hint="Employees without check-in"
                color="steel-blue"
                icon={XCircle}
                hoverTitle="Absent Employees"
                hoverList={statEmployeeNames.absentToday}
              />
              )}
            </div>
          )}

          {/* Main Content Grid - Two/Three Column Layout */}
          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {/* Left Column - Quick Stats and Info */}
            <div className="grid gap-6 auto-rows-fr lg:col-span-1">
              {/* Leave Balance Card - Only show for HR and Employees, not Admin */}
              {!isAdmin && (
              <Card elevated className="h-full bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-900/30">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">Leave Balance</h3>
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center py-6">
                      <Spinner />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#4A7FA7] dark:text-slate-400">Total</span>
                        <span className="text-lg font-bold text-[#0A1931] dark:text-white">{leaveBalance.total} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#4A7FA7] dark:text-slate-400">Used</span>
                        <span className="text-sm font-semibold text-orange-600">{leaveBalance.used} days</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#4A7FA7] dark:text-slate-400">Pending</span>
                        <span className="text-sm font-semibold text-amber-600">{leaveBalance.pending} requests</span>
                      </div>
                      
                      {/* Show leave type breakdown if available */}
                      {leaveBalance.byType && leaveBalance.byType.length > 0 && (
                        <div className="pt-3 mt-4 border-t border-emerald-300 dark:border-emerald-800/50">
                          <span className="text-xs font-semibold text-[#4A7FA7] dark:text-slate-400 block mb-2">By Type:</span>
                          <div className="space-y-2">
                            {leaveBalance.byType.map((type, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: type.color || "#3b82f6" }}
                                  />
                                  <span className="text-slate-600 dark:text-slate-400">{type.leaveTypeName}</span>
                                </div>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {type.remainingDays}/{type.maxDaysPerYear}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Progress Bar */}
                      <div className="pt-3 mt-4 border-t border-emerald-300 dark:border-emerald-800/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#4A7FA7] dark:text-slate-400">Remaining</span>
                          <span className="text-sm font-bold text-emerald-600">{leaveBalance.remaining} days</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full dark:bg-slate-700">
                          <div 
                            className="h-2 transition-all rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                            style={{ width: `${leaveBalance.total > 0 ? (leaveBalance.remaining / leaveBalance.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => navigate("/leave")}
                        className="w-full px-3 py-2 mt-3 text-sm font-semibold transition-colors rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">
                        Manage Leave →
                      </button>
                    </div>
                  )}
                </div>
              </Card>
              )}

              {/* Payroll Card */}
              <Card elevated className="h-full min-h-[20rem] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-900/30">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">Payroll Info</h3>
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="space-y-3 flex-1">
                    <div>
                      <span className="text-xs text-[#4A7FA7] dark:text-slate-400">Status</span>
                      <div className="flex items-center mt-1 space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-semibold text-[#0A1931] dark:text-white">{payrollInfo.status}</span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-blue-300 dark:border-blue-800/50">
                      <span className="text-xs text-[#4A7FA7] dark:text-slate-400">Last Paid</span>
                      <p className="text-sm font-semibold text-[#0A1931] dark:text-white mt-1">{new Date(payrollInfo.lastPaid).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                    
                    <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg dark:bg-blue-900/30 dark:border-blue-800/50">
                      <span className="text-xs text-blue-900 dark:text-blue-200">Next Pay Date</span>
                      <p className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-300">{new Date(payrollInfo.nextPayDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Middle Column - Tasks and Company Updates */}
            <div className="grid gap-6 auto-rows-fr lg:col-span-1">
              {/* Pending Tasks Card */}
              <Card elevated className="h-full min-h-[20rem] bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-900/30">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">My Tasks</h3>
                    <BarChart3 className="w-5 h-5 text-violet-600" />
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="space-y-3">
                      {tasksLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Spinner />
                        </div>
                      ) : pendingTasks.length > 0 ? (
                        pendingTasks.slice(0, 3).map((task) => (
                          <div key={task._id || task.id} className="p-3 bg-white border rounded-lg dark:bg-slate-800 border-violet-200 dark:border-violet-800/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-[#0A1931] dark:text-white">{task.title}</p>
                                <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' })}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                task.priority === 'high' 
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              }`}>
                                {task.priority}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-xs text-[#4A7FA7] dark:text-slate-400">No pending tasks yet. Great job! 🎉</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => navigate('/tasks/my-tasks')}
                      className="w-full px-3 py-2 mt-auto text-sm font-semibold transition-colors rounded-lg text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30">
                      View All Tasks → 
                    </button>
                  </div>
                </div>
              </Card>

              {/* Company Updates Card */}
              <Card elevated className="h-full min-h-[20rem] flex flex-col">
                <div className="p-6 border-b border-[#B3CFE5] dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-[#0A1931] dark:text-white">Company Updates</h2>
                      <p className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1">Latest announcements</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 flex-1">
                  <div className="space-y-3">
                    {recentNews?.length ? (
                      recentNews.slice(0, 3).map((x) => (
                        <div
                          key={x._id}
                          className="p-3 rounded-lg border border-[#B3CFE5]/50 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 hover:bg-[#F6FAFD] dark:hover:bg-slate-700/50 transition-all cursor-pointer group"
                        >
                          <div className="font-semibold text-[#1A3D63] dark:text-blue-300 text-sm group-hover:text-[#0A1931] dark:group-hover:text-blue-200">
                            {x.title}
                          </div>
                          <div className="text-xs text-[#4A7FA7] dark:text-slate-400 mt-1 line-clamp-2">
                            {x.message}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center">
                        <div className="text-xs text-[#4A7FA7] dark:text-slate-400">No updates yet.</div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Timeline - Only for HR and Admin */}
            {(isHR || isAdmin) && (
            <Card elevated className="lg:col-span-1 bg-gradient-to-br from-[#F6FAFD] to-white dark:from-slate-800 dark:to-slate-800 flex flex-col h-full min-h-[42rem]">
              <div className="p-6 border-b border-[#B3CFE5] dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 shadow-lg bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 dark:from-purple-400 dark:to-pink-400 rounded-xl">
                      <span className="text-lg font-bold text-white">📍</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">System Updates Timeline</h3>
                      <p className="text-xs text-[#4A7FA7] dark:text-slate-400">Real-time activity log for all changes</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center px-3 py-1 space-x-2 rounded-full bg-purple-50 dark:bg-purple-900/30">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-300">Live</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-6 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {/* Timeline preview */}
                  {timelinePreviewItems.map((item, idx) => {
                    // Handle both activity logs and audit logs
                    const isActivityLog = item.actionType !== undefined;
                    
                    // For activity logs
                    if (isActivityLog) {
                      const action = item.actionType;
                      const getColorByAction = (actionType) => {
                        if (actionType.includes("LOGIN")) return "green";
                        if (actionType.includes("LOGOUT")) return "slate";
                        if (actionType.includes("UPDATE")) return "amber";
                        if (actionType.includes("APPROVAL")) return "green";
                        if (actionType.includes("REJECTION")) return "red";
                        if (actionType.includes("UPLOAD")) return "blue";
                        return "blue";
                      };

                      const color = getColorByAction(action);
                      const colorClasses = {
                        amber: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/30 border-amber-200 dark:border-amber-800/50",
                        blue: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/30 border-blue-200 dark:border-blue-800/50",
                        green: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800/50",
                        red: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/30 border-red-200 dark:border-red-800/50",
                        slate: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-700"
                      };

                      const iconMap = {
                        "LOGIN": "🔓",
                        "LOGOUT": "🔒",
                        "PROFILE_UPDATE": "👤",
                        "CONTACT_UPDATE": "📞",
                        "DOCUMENT_UPLOAD": "📄",
                        "LEAVE_REQUEST": "🏖️",
                        "LEAVE_APPROVAL": "✅",
                        "LEAVE_REJECTION": "❌",
                        "ATTENDANCE_CHECKIN": "📍",
                        "ATTENDANCE_CHECKOUT": "🚪",
                        "EMPLOYEE_CREATE": "👥",
                        "EMPLOYEE_UPDATE": "📝",
                        "EMPLOYEE_DELETE": "🗑️",
                        "TASK_CREATE": "📋",
                        "TASK_UPDATE": "✏️",
                        "TASK_STATUS_CHANGE": "🔄",
                        "TASK_DELETE": "🗑️",
                        "HR_ACTION": "🧑‍💼",
                        "ADMIN_ACTION": "⚙️",
                        "OTHER": "•"
                      };

                      const formatDate = (date) => {
                        if (!date) return "Just now";
                        const d = new Date(date);
                        const now = new Date();
                        const diffMs = now - d;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);
                        
                        if (diffMins < 1) return "Just now";
                        if (diffMins < 60) return `${diffMins}m ago`;
                        if (diffHours < 24) return `${diffHours}h ago`;
                        if (diffDays < 7) return `${diffDays}d ago`;
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                      };

                      return (
                        <div key={idx} className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-4 hover:shadow-md transition-all group`}>
                          <div className="flex items-start space-x-3">
                            {/* Timeline dot and line */}
                            <div className="flex flex-col items-center space-y-2">
                              <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border-2 border-[#4A7FA7] dark:border-slate-500 flex items-center justify-center text-xs font-bold">
                                {iconMap[action] || "•"}
                              </div>
                                {idx < timelinePreviewItems.length - 1 && <div className="w-0.5 h-6 bg-[#B3CFE5] dark:bg-slate-600"></div>}
                            </div>

                            {/* Content */}
                            <div className="flex-grow mt-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-[#0A1931] dark:text-white">{item.actorName || "Unknown"}</span>
                                  <span className="text-xs text-[#4A7FA7] dark:text-slate-400">
                                    {action.replace(/_/g, " ")}
                                  </span>
                                </div>
                                <span className="text-xs text-[#4A7FA7] dark:text-slate-400 font-medium">{formatDate(item.createdAt)}</span>
                              </div>
                              <p className="text-sm font-semibold text-[#0A1931] dark:text-white mt-1">{item.targetUserName || item.actorName}</p>
                              <p className="text-xs text-[#4A7FA7] dark:text-slate-300 mt-1">📌 {item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    // For audit logs (old format)
                    const getColorByAction = (action) => {
                      switch(action) {
                        case "Updated": return "amber";
                        case "Modified": return "blue";
                        case "Created": return "green";
                        case "Deleted": return "red";
                        case "Archived": return "slate";
                        default: return "blue";
                      }
                    };

                    const color = getColorByAction(item.action);
                    const colorClasses = {
                      amber: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-900/30 border-amber-200 dark:border-amber-800/50",
                      blue: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/30 border-blue-200 dark:border-blue-800/50",
                      green: "from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-900/30 border-green-200 dark:border-green-800/50",
                      red: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-900/30 border-red-200 dark:border-red-800/50",
                      slate: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-slate-200 dark:border-slate-700"
                    };

                    const iconMap = {
                      Updated: "✏️",
                      Modified: "🔧",
                      Created: "✨",
                      Deleted: "🗑️",
                      Archived: "📦"
                    };

                    const formatDate = (date) => {
                      if (!date) return "Just now";
                      const d = new Date(date);
                      const now = new Date();
                      const diffMs = now - d;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);
                      
                      if (diffMins < 1) return "Just now";
                      if (diffMins < 60) return `${diffMins}m ago`;
                      if (diffHours < 24) return `${diffHours}h ago`;
                      if (diffDays < 7) return `${diffDays}d ago`;
                      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
                    };

                    return (
                      <div key={idx} className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-4 hover:shadow-md transition-all group`}>
                        <div className="flex items-start space-x-3">
                          {/* Timeline dot and line */}
                          <div className="flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border-2 border-[#4A7FA7] dark:border-slate-500 flex items-center justify-center text-xs font-bold">
                              {iconMap[item.action] || "•"}
                            </div>
                            {idx < timelinePreviewItems.length - 1 && <div className="w-0.5 h-6 bg-[#B3CFE5] dark:bg-slate-600"></div>}
                          </div>

                          {/* Content */}
                          <div className="flex-grow mt-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-bold text-[#0A1931] dark:text-white">{item.userName || "Unknown"}</span>
                                <span className="text-xs text-[#4A7FA7] dark:text-slate-400">{item.action}</span>
                              </div>
                              <span className="text-xs text-[#4A7FA7] dark:text-slate-400 font-medium">{formatDate(item.createdAt)}</span>
                            </div>
                            <p className="text-sm font-semibold text-[#0A1931] dark:text-white mt-1">{item.entityName}</p>
                            <p className="text-xs text-[#4A7FA7] dark:text-slate-300 mt-1">📌 {item.changes}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* View All Updates */}
                {(isHR || isAdmin) && (
                  <div className="mt-4 pt-4 border-t border-[#B3CFE5] dark:border-slate-700">
                    <button 
                      onClick={() => navigate(isAdmin ? "/admin/activity-timeline" : isHR ? "/hr/activity-timeline" : "#")}
                      className="w-full px-4 py-2 text-center text-sm font-semibold text-[#4A7FA7] dark:text-slate-300 hover:text-[#0A1931] dark:hover:text-white transition-colors rounded-lg hover:bg-[#B3CFE5]/10"
                    >
                      {hasMoreTimelineItems ? "View More Timelines →" : "View Full Timeline →"}
                    </button>
                  </div>
                )}
              </div>
            </Card>
            )}
          </div>

        </>
      )}
    </div>
  );
}