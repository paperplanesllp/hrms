import React, { useState, useEffect } from "react";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Zap,
  Award,
  Target,
  Activity,
} from "lucide-react";

function PerformanceMetricCard({ icon, label, value, unit, trend, color }) {
  const MetricIcon = icon;
  const hasTrend = typeof trend === "number" && Number.isFinite(trend);
  const trendSymbol = !hasTrend ? "•" : trend > 0 ? "↗" : trend < 0 ? "↘" : "→";
  const trendVariant = !hasTrend ? "light" : trend > 0 ? "success" : trend < 0 ? "danger" : "warning";
  const trendValue = hasTrend ? `${Math.abs(trend).toFixed(1)}%` : "N/A";

  return (
    <Card className="p-6 transition-all duration-300 hover:shadow-lg" elevated>
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-white`}
          style={{ backgroundColor: color }}
        >
          <MetricIcon className="w-6 h-6" />
        </div>
        <Badge variant={trendVariant} className="text-xs">
          {trendSymbol} {trendValue}
        </Badge>
      </div>
      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
        {value}
        <span className="text-sm text-slate-500 dark:text-slate-400 font-normal ml-2">
          {unit}
        </span>
      </h3>
      <p className="text-slate-600 dark:text-slate-400 text-sm">{label}</p>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="p-6" elevated>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </Card>
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getDateDiffDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / DAY_MS);
}

function getWeekStart(date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  const day = weekStart.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + offset);
  return weekStart;
}

function getRangeDates(range, referenceDate = new Date()) {
  const endDate = new Date(referenceDate);
  endDate.setHours(0, 0, 0, 0);

  const startDate = new Date(endDate);
  switch (range) {
    case "daily":
      break;
    case "week":
      startDate.setDate(endDate.getDate() - 6);
      break;
    case "month":
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(endDate.getMonth() - 1);
  }

  return { startDate, endDate };
}

function isStatusPresent(status) {
  return status === "PRESENT" || status === "SHORT_HOURS" || status === "HALF_DAY";
}

function buildAttendanceStats(records) {
  if (!records || records.length === 0) {
    return {
      present: 0,
      shortHours: 0,
      halfDay: 0,
      absent: 0,
      attendanceDays: 0,
      totalTrackedDays: 0,
      attendanceRate: 0,
      onTimeRate: 0,
      performanceScore: 0,
    };
  }

  const present = records.filter((a) => a.status === "PRESENT").length;
  const shortHours = records.filter((a) => a.status === "SHORT_HOURS").length;
  const halfDay = records.filter((a) => a.status === "HALF_DAY").length;
  const absent = records.filter((a) => a.status === "ABSENT").length;

  const attendanceDays = present + shortHours + halfDay;
  const totalTrackedDays = attendanceDays + absent;

  // Weighted performance score so short-hours/half-day/absent lower the final score.
  const weightedPresence = present + shortHours * 0.5 + halfDay * 0.25;
  const performanceScore = totalTrackedDays > 0 ? (weightedPresence / totalTrackedDays) * 100 : 0;

  return {
    present,
    shortHours,
    halfDay,
    absent,
    attendanceDays,
    totalTrackedDays,
    attendanceRate: totalTrackedDays > 0 ? (attendanceDays / totalTrackedDays) * 100 : 0,
    onTimeRate: attendanceDays > 0 ? (present / attendanceDays) * 100 : 0,
    performanceScore,
  };
}

function calculateTrendPercent(currentValue, previousValue) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function getRangeBuckets(startDate, endDate) {
  const totalDays = getDateDiffDays(startDate, endDate) + 1;
  const step = totalDays > 120 ? "month" : totalDays > 45 ? 7 : totalDays > 21 ? 2 : 1;
  const buckets = [];

  if (step === "month") {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    if (cursor < startDate) {
      cursor = new Date(startDate);
    }

    while (cursor <= endDate) {
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const bucketEnd = addDays(nextMonth, -1) > endDate ? new Date(endDate) : addDays(nextMonth, -1);
      buckets.push({ start: new Date(cursor), end: bucketEnd });
      cursor = nextMonth;
    }
  } else {
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const bucketEnd = step === 1 ? new Date(cursor) : addDays(cursor, step - 1);
      buckets.push({ start: new Date(cursor), end: bucketEnd > endDate ? new Date(endDate) : bucketEnd });
      cursor = addDays(cursor, step);
    }
  }

  return { buckets, step, totalDays };
}

function getBucketLabel(bucket, step, totalDays, idx, range) {
  if (range === "daily") {
    return "Today";
  }

  if (step === "month") {
    return bucket.start.toLocaleDateString("en-US", { month: "short" });
  }

  if (range === "week" || totalDays <= 7) {
    return bucket.start.toLocaleDateString("en-US", { weekday: "short" });
  }

  if (step === 7) {
    return `W${idx + 1}`;
  }

  return `${bucket.start.getDate()}/${bucket.start.getMonth() + 1}`;
}

function buildTrendChartData(records, startDate, endDate, range) {
  const recordsByDate = new Map((records || []).map((record) => [record.date, record.status]));
  const { buckets, step, totalDays } = getRangeBuckets(startDate, endDate);

  return buckets.map((bucket, idx) => {
    let present = 0;
    let absent = 0;

    let cursor = new Date(bucket.start);
    while (cursor <= bucket.end) {
      const status = recordsByDate.get(formatDateLocal(cursor));
      if (isStatusPresent(status)) {
        present += 1;
      } else if (status === "ABSENT") {
        absent += 1;
      }
      cursor = addDays(cursor, 1);
    }

    return {
      date: getBucketLabel(bucket, step, totalDays, idx, range),
      present,
      absent,
    };
  });
}

function getAttendanceOverview(records, startDate, endDate, range) {
  const recordsByDate = new Map((records || []).map((record) => [record.date, record]));
  const { buckets, step, totalDays } = getRangeBuckets(startDate, endDate);

  if (range === "week" || range === "daily") {
    return buckets.map((bucket, idx) => {
      const dateStr = formatDateLocal(bucket.start);
      const row = recordsByDate.get(dateStr);
      return {
        day: getBucketLabel(bucket, step, totalDays, idx, range),
        date: dateStr,
        status: row?.status || "NO_RECORD",
        checkIn: row?.checkIn || null,
        checkOut: row?.checkOut || null,
      };
    });
  }

  return buckets.map((bucket, idx) => {
    let present = 0;
    let shortHours = 0;
    let halfDay = 0;
    let absent = 0;

    let cursor = new Date(bucket.start);
    while (cursor <= bucket.end) {
      const status = recordsByDate.get(formatDateLocal(cursor))?.status;
      if (status === "PRESENT") present += 1;
      else if (status === "SHORT_HOURS") shortHours += 1;
      else if (status === "HALF_DAY") halfDay += 1;
      else if (status === "ABSENT") absent += 1;
      cursor = addDays(cursor, 1);
    }

    const presentEquivalent = present + shortHours + halfDay;
    const status =
      presentEquivalent === 0 && absent === 0
        ? "NO_RECORD"
        : absent > presentEquivalent
        ? "ABSENT"
        : shortHours > present
        ? "SHORT_HOURS"
        : halfDay > present
        ? "HALF_DAY"
        : "PRESENT";

    return {
      day: getBucketLabel(bucket, step, totalDays, idx, range),
      date: `${formatDateLocal(bucket.start)} to ${formatDateLocal(bucket.end)}`,
      status,
      checkIn: null,
      checkOut: null,
      meta: { present, shortHours, halfDay, absent },
    };
  });
}

function getHoursWorked(records, startDate, endDate, range) {
  const recordsByDate = new Map((records || []).map((record) => [record.date, record]));
  const { buckets, step, totalDays } = getRangeBuckets(startDate, endDate);

  return buckets.map((bucket, idx) => {
    let totalHours = 0;
    let daysWithHours = 0;

    let cursor = new Date(bucket.start);
    while (cursor <= bucket.end) {
      const row = recordsByDate.get(formatDateLocal(cursor));
      const hours = Number(row?.totalHours || 0);
      if (hours > 0) {
        totalHours += hours;
        daysWithHours += 1;
      }
      cursor = addDays(cursor, 1);
    }

    const label = getBucketLabel(bucket, step, totalDays, idx, range);
    const hours =
      range === "daily" || range === "week"
        ? Number(totalHours.toFixed(2))
        : Number((daysWithHours > 0 ? totalHours / daysWithHours : 0).toFixed(2));

    return {
      day: label,
      hours,
    };
  });
}

export default function EmployeeAnalyticsDashboard() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [currentAttendance, setCurrentAttendance] = useState([]);
  const [previousAttendance, setPreviousAttendance] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { startDate: currentStartDate, endDate: currentEndDate } = getRangeDates(timeRange);
        const currentPeriodDays = getDateDiffDays(currentStartDate, currentEndDate) + 1;

        const previousEndDate = addDays(currentStartDate, -1);
        const previousStartDate = addDays(previousEndDate, -(currentPeriodDays - 1));

        const weeklyStartDate = getWeekStart(currentEndDate);
        const minHistoryDate = addDays(currentEndDate, -6);
        const fetchStartDate = [previousStartDate, weeklyStartDate, minHistoryDate].reduce(
          (minDate, date) => (date < minDate ? date : minDate),
          currentStartDate
        );

        const fetchFrom = formatDateLocal(fetchStartDate);
        const fetchTo = formatDateLocal(currentEndDate);

        const [attendanceRes, leaveRes] = await Promise.all([
          api.get("/attendance", { params: { from: fetchFrom, to: fetchTo } }),
          api.get("/dashboard/leave-balance"),
        ]);

        const allAttendance = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

        const currentStart = formatDateLocal(currentStartDate);
        const currentEnd = formatDateLocal(currentEndDate);
        const previousStart = formatDateLocal(previousStartDate);
        const previousEnd = formatDateLocal(previousEndDate);

        const inRange = (record, start, end) =>
          record?.date && record.date >= start && record.date <= end;

        setCurrentAttendance(allAttendance.filter((record) => inRange(record, currentStart, currentEnd)));
        setPreviousAttendance(allAttendance.filter((record) => inRange(record, previousStart, previousEnd)));
        setLeaveBalance(leaveRes.data || null);
      } catch (err) {
        console.error("Error loading analytics:", err);
        toast({
          title: "Failed to load performance data",
          message: err?.response?.data?.message || "Please try again",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  const personalStats = buildAttendanceStats(currentAttendance);
  const previousStats = buildAttendanceStats(previousAttendance);
  const { startDate: trendStartDate, endDate: trendEndDate } = getRangeDates(timeRange);
  const weeklyData = getAttendanceOverview(currentAttendance, trendStartDate, trendEndDate, timeRange);
  const hoursData = getHoursWorked(currentAttendance, trendStartDate, trendEndDate, timeRange);
  const trendData = buildTrendChartData(currentAttendance, trendStartDate, trendEndDate, timeRange);

  const attendanceRateTrend = calculateTrendPercent(personalStats.attendanceRate, previousStats.attendanceRate);
  const daysPresentTrend = calculateTrendPercent(personalStats.attendanceDays, previousStats.attendanceDays);
  const absentTrend = calculateTrendPercent(previousStats.absent, personalStats.absent);
  const onTimeTrend = calculateTrendPercent(personalStats.onTimeRate, previousStats.onTimeRate);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Spinner />
          <p className="text-slate-600 dark:text-slate-400 mt-4">
            Loading your performance analytics...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Your Performance
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Real-time insights into your attendance, productivity, and
                performance
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Welcome back, {user?.name?.split(" ")[0]}!
            </p>
            <Badge variant="success" className="mt-2">
              ✓ Active
            </Badge>
          </div>
        </div>

        {/* Time Range Filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          {["daily", "week", "month", "quarter", "year"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm ${
                timeRange === range
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PerformanceMetricCard
          icon={CheckCircle2}
          label="Attendance Rate"
          value={personalStats.attendanceRate.toFixed(1)}
          unit="%"
          trend={attendanceRateTrend}
          color="#3B82F6"
        />
        <PerformanceMetricCard
          icon={Clock}
          label="Days Present"
          value={personalStats.attendanceDays}
          unit="days"
          trend={daysPresentTrend}
          color="#10B981"
        />
        <PerformanceMetricCard
          icon={AlertCircle}
          label="Days Absent"
          value={personalStats.absent}
          unit="days"
          trend={absentTrend}
          color="#EF4444"
        />
        <PerformanceMetricCard
          icon={Zap}
          label="On-Time Arrivals"
          value={personalStats.onTimeRate.toFixed(1)}
          unit="%"
          trend={onTimeTrend}
          color="#F59E0B"
        />
      </div>

      {/* Leave Balance */}
      {leaveBalance && (
        <Card className="p-6" elevated>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Leave Balance
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your annual leave status
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Total Days
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {leaveBalance.total}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Remaining
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {leaveBalance.remaining}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                Used / Pending
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-semibold">
                {leaveBalance.used} Used / {leaveBalance.pending} Pending
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Attendance */}
        <ChartCard
          title={timeRange === "daily" ? "Daily Attendance Overview" : `${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} Attendance Overview`}
          subtitle={timeRange === "daily" ? "Your attendance status for today" : "Your attendance status for the selected period"}
        >
          <div className="space-y-3">
            {weeklyData && weeklyData.length > 0 ? (
              weeklyData.map((day, idx) => {
                const statusColor =
                  day.status === "PRESENT"
                    ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                    : day.status === "ABSENT"
                    ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
                    : day.status === "SHORT_HOURS"
                    ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
                    : day.status === "HALF_DAY"
                    ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800"
                    : day.status === "HOLIDAY"
                    ? "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800"
                    : "bg-slate-100 dark:bg-slate-700/30 border-slate-200 dark:border-slate-700";

                const statusText =
                  day.status === "PRESENT"
                    ? "Present"
                    : day.status === "ABSENT"
                    ? "Absent"
                    : day.status === "SHORT_HOURS"
                    ? "Short Hours"
                    : day.status === "HALF_DAY"
                    ? "Half Day"
                    : day.status === "HOLIDAY"
                    ? "Holiday"
                    : "No Record";
                const statusIcon =
                  day.status === "PRESENT"
                    ? "✓"
                    : day.status === "ABSENT"
                    ? "✕"
                    : day.status === "SHORT_HOURS"
                    ? "!"
                    : day.status === "HALF_DAY"
                    ? "◐"
                    : day.status === "HOLIDAY"
                    ? "H"
                    : "−";

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-4 rounded-xl border ${statusColor}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-slate-700 dark:text-slate-300 w-12">
                        {day.day}
                      </span>
                      <span
                        className="text-xl font-bold"
                        style={{
                          color:
                            day.status === "PRESENT"
                              ? "#059669"
                              : day.status === "ABSENT"
                              ? "#DC2626"
                              : day.status === "SHORT_HOURS"
                              ? "#D97706"
                              : day.status === "HALF_DAY"
                              ? "#4338CA"
                              : day.status === "HOLIDAY"
                              ? "#2563EB"
                              : "#6B7280",
                        }}
                      >
                        {statusIcon}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {statusText}
                      </p>
                      {day.checkIn && (
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {convertTo12HourFormat(day.checkIn)}
                          {day.checkOut && ` - ${convertTo12HourFormat(day.checkOut)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-48 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No weekly data yet
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                    Check in this week to see your attendance
                  </p>
                </div>
              </div>
            )}
          </div>
        </ChartCard>

        {/* Hours Worked */}
        {hoursData.some((entry) => entry.hours > 0) ? (
          <ChartCard
            title={`Hours Worked (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)})`}
            subtitle={timeRange === "month" || timeRange === "quarter" || timeRange === "year" ? "Average hours per bucket" : "Hours worked"}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title={`Hours Worked (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)})`} subtitle="No data yet">
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p>Start checking in to see your working hours</p>
            </div>
          </ChartCard>
        )}
      </div>

      {/* Attendance Trend */}
      {personalStats.totalTrackedDays > 0 ? (
        <ChartCard
          title="Attendance Trends"
          subtitle={`Your attendance pattern over the selected period`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="present"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorPresent)"
                name="Present"
              />
              <Area
                type="monotone"
                dataKey="absent"
                stroke="#EF4444"
                fillOpacity={1}
                fill="url(#colorAbsent)"
                name="Absent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : (
        <ChartCard
          title="Attendance Trends"
          subtitle="Build your attendance data by checking in regularly"
        >
          <div className="h-80 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <Activity className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                No attendance data yet
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
                Start checking in and checking out to build your attendance record
              </p>
            </div>
          </div>
        </ChartCard>
      )}

      {/* Performance Summary */}
      <Card className="p-6" elevated>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Performance Summary
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Overall Score
            </p>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {(personalStats.performanceScore || 0).toFixed(0)}
              <span className="text-xl">/100</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Based on {personalStats.totalTrackedDays} records
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Status
            </p>
            <Badge
              variant={personalStats.performanceScore > 85 ? "success" : personalStats.performanceScore > 70 ? "warning" : "danger"}
              className="text-lg p-2 inline-block"
            >
              {personalStats.performanceScore > 85
                ? "Excellent"
                : personalStats.performanceScore > 70
                ? "Good"
                : personalStats.performanceScore > 0 ? "Needs Improvement" : "No Data"}
            </Badge>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Summary
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {personalStats.present} Present<br/>
              {personalStats.shortHours} Short Hours<br/>
              {personalStats.halfDay} Half Day<br/>
              {personalStats.absent} Absent
            </p>
          </div>
        </div>
      </Card>

      {/* Tips & Recommendations */}
      <Card className="p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800" elevated>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Tips to Improve Your Performance
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Maintain Punctuality
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Arrive on time every day to boost your score
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Reduce Absences
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Minimize unplanned absences for better attendance
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Checkout Properly
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Always checkout to record your working hours
              </p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-slate-900 dark:text-white">
                Track Progress
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Review this dashboard regularly
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
