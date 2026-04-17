import React, { useEffect, useState, useCallback } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  Clock,
  Plus,
  X
} from "lucide-react";

function purposeLabel(purpose) {
  if (!purpose) return "Personal";
  return purpose
    .split("_")
    .map((part) => part[0] + part.slice(1).toLowerCase())
    .join(" ");
}

function purposeTone(purpose) {
  if (purpose === "PUBLIC_HOLIDAY") return "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
  if (purpose === "REMINDER") return "text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30";
  if (purpose === "MEETING") return "text-indigo-700 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30";
  return "text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-800";
}

function statusTone(status) {
  if (status === "PRESENT") return "text-green-600 dark:text-green-400";
  if (status === "SHORT_HOURS") return "text-yellow-600 dark:text-yellow-400";
  if (status === "HALF_DAY") return "text-indigo-600 dark:text-indigo-400";
  return "text-red-600 dark:text-red-400";
}

export default function CalendarPage() {
  const user = useAuthStore((s) => s.user);
  const canManagePublicHolidays = user?.role === ROLES.ADMIN || user?.role === ROLES.HR;
  const defaultEventPurpose = canManagePublicHolidays ? "PUBLIC_HOLIDAY" : "PERSONAL";
  const purposeOptions = canManagePublicHolidays
    ? ["PUBLIC_HOLIDAY", "REMINDER", "MEETING", "PERSONAL"]
    : ["REMINDER", "MEETING", "PERSONAL"];

  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [hoveringDate, setHoveringDate] = useState(null);

  const [worksheetData, setWorksheetData] = useState(null);
  const [showWorksheetPanel, setShowWorksheetPanel] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);

  const [events, setEvents] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    color: "blue",
    purpose: defaultEventPurpose
  });

  useEffect(() => {
    if (!canManagePublicHolidays && eventForm.purpose === "PUBLIC_HOLIDAY") {
      setEventForm((prev) => ({ ...prev, purpose: "PERSONAL" }));
    }
  }, [canManagePublicHolidays, eventForm.purpose]);

  const loadMonthlyAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();

      const res = await api.get("/calendar/monthly", {
        params: { year, month }
      });

      setAttendanceData(res.data.data || []);
    } catch (err) {
      console.error(err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  }, [viewDate]);

  const loadEventsAndHeatmap = useCallback(async () => {
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();

      const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`;

      const [evRes, heatRes] = await Promise.all([
        api.get("/calendar/events", { params: { startDate: monthStart, endDate: monthEnd } }),
        api.get("/calendar/heatmap", { params: { startDate: monthStart, endDate: monthEnd } })
      ]);

      // Filter out past events - only show events from today onwards
      const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format
      const upcomingEvents = (evRes.data.events || []).filter(event => event.date >= today);

      setEvents(upcomingEvents);
      setHeatmapData(heatRes.data.heatmap || []);
    } catch (err) {
      console.error("Error loading events/heatmap:", err);
    }
  }, [viewDate]);

  useEffect(() => {
    loadMonthlyAttendance();
    loadEventsAndHeatmap();
  }, [loadMonthlyAttendance, loadEventsAndHeatmap]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const statusMap = {};
  attendanceData.forEach((item) => {
    statusMap[item.date] = item;
  });

  const getDateStatus = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return statusMap[dateStr];
  };

  const totalDays = attendanceData.length;
  const presentDays = attendanceData.filter((d) => d.status === "PRESENT").length;
  const shortHoursDays = attendanceData.filter((d) => d.status === "SHORT_HOURS").length;
  const halfDayDays = attendanceData.filter((d) => d.status === "HALF_DAY").length;

  const percentage =
    totalDays > 0 ? Math.round(((presentDays + shortHoursDays + halfDayDays) / totalDays) * 100) : 0;

  const monthName = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const changeMonth = (offset) => {
    setViewDate(new Date(year, month + offset, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  const handleDayClick = async (day) => {
    try {
      setLoadingWorksheet(true);
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      setSelectedDate(dateStr);

      const [worksheetRes, attendanceRes] = await Promise.all([
        api.get("/worksheet/by-date", { params: { date: dateStr } }).catch(() => ({ data: { data: null } })),
        api.get("/attendance/by-date", { params: { date: dateStr } }).catch(() => ({ data: { data: null } }))
      ]);

      const combined = {
        ...attendanceRes.data.data,
        ...worksheetRes.data.data
      };

      setWorksheetData(combined);
      setShowWorksheetPanel(true);
    } catch (err) {
      console.error("Error fetching worksheet:", err);
      setWorksheetData(null);
      setShowWorksheetPanel(true);
    } finally {
      setLoadingWorksheet(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventForm.title.trim()) {
      toast({ title: "Event title is required", type: "error" });
      return;
    }

    try {
      await api.post("/calendar/events", {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        color: eventForm.color,
        purpose: eventForm.purpose
      });

      toast({ title: "Event created successfully", type: "success" });
      setShowEventModal(false);
      setEventForm({
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "10:00",
        color: "blue",
        purpose: defaultEventPurpose
      });
      loadEventsAndHeatmap();
    } catch (err) {
      console.error(err);
      toast({
        title: err?.response?.data?.message || err?.response?.data?.error || "Failed to create event",
        type: "error"
      });
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 space-y-10 bg-gradient-to-br from-[#f7f9fc] via-white to-[#eef3fb] dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <PageTitle
        title="Attendance Calendar"
        subtitle="Track attendance, events and productivity"
        icon={Calendar}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Present" value={presentDays} icon={<Check size={22} />} color="green" />
        <StatCard title="Short Hours" value={shortHoursDays} icon={<Clock size={22} />} color="orange" />
        <StatCard title="Half Day" value={halfDayDays} icon={<Clock size={22} />} color="purple" />
        <StatCard title="Total Days" value={totalDays} icon={<Calendar size={22} />} color="blue" />
        <StatCard title="Attendance" value={`${percentage}%`} icon={"★"} color="purple" />
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 border shadow-xl rounded-3xl border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{monthName}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Click a date to see details</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-2 transition rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronLeft size={18} className="dark:text-slate-300" />
            </button>
            <button onClick={goToToday} className="px-4 py-2 text-sm font-semibold text-indigo-700 rounded-xl bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/30">
              Today
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 transition rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronRight size={18} className="dark:text-slate-300" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 mb-4 text-xs font-semibold tracking-wide text-center uppercase text-slate-500 dark:text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={i} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const status = getDateStatus(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayOfWeek = new Date(year, month, day).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const dayEvents = events.filter((e) => e.date === dateStr);

                const weekendBgClass = isWeekend ? "bg-slate-50 dark:bg-slate-800/50 opacity-60" : "bg-white dark:bg-slate-800";
                const weekendBorderClass = isWeekend ? "border-slate-300 dark:border-slate-600" : "border-slate-200 dark:border-slate-700";

                return (
                  <div
                    key={day}
                    onMouseEnter={() => setHoveringDate(day)}
                    onMouseLeave={() => setHoveringDate(null)}
                    onClick={() => handleDayClick(day)}
                    className={`relative group p-3 transition border shadow-sm cursor-pointer rounded-xl hover:shadow-lg hover:-translate-y-[2px] dark:hover:shadow-slate-700/50 ${weekendBgClass} ${weekendBorderClass}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-slate-800 dark:text-slate-100">{day}</div>
                      {isWeekend && (
                        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                          Week Off
                        </div>
                      )}
                    </div>

                    {status?.checkIn && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        {status.checkIn}
                      </div>
                    )}

                    {status?.eventName && (
                      <div className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">{status.eventName}</div>
                    )}

                    {status?.status === "ABSENT" && !isWeekend && (
                      <div className="mt-1 text-xs text-red-500">Absent</div>
                    )}

                    {dayEvents.length > 0 && (
                      <div className="mt-1 text-xs text-purple-600 dark:text-purple-400">
                        {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                      </div>
                    )}

                    {hoveringDate === day && (
                      <div className="absolute z-30 w-64 mb-3 transition duration-150 ease-out -translate-x-1/2 pointer-events-none left-1/2 bottom-full">
                        <div className="absolute w-3 h-3 rotate-45 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 -bottom-1 left-1/2" />

                        <div className={`p-4 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl ${isWeekend ? "opacity-75" : ""}`}>
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {new Date(dateStr).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric"
                              })}
                            </div>
                            {isWeekend && (
                              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                Week Off
                              </div>
                            )}
                          </div>

                          {status?.checkIn && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Check-in</span>
                              <span className="font-semibold text-slate-900 dark:text-white">{status.checkIn}</span>
                            </div>
                          )}

                          {status?.status && !isWeekend && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500 dark:text-slate-400">Status</span>
                              <span className={`font-semibold ${statusTone(status.status)}`}>{status.status}</span>
                            </div>
                          )}

                          {dayEvents.length > 0 && (
                            <div className="pt-2 space-y-2 border-t border-slate-200 dark:border-slate-700">
                              <div className="text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">Events</div>
                              {dayEvents.slice(0, 2).map((e) => (
                                <div key={e._id} className="space-y-1">
                                  <div className="flex items-start justify-between gap-2 text-sm">
                                    <span className="font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">{e.startTime}</span>
                                    <span className="flex-1 text-right truncate text-slate-700 dark:text-slate-300">{e.title}</span>
                                  </div>
                                  <div className="flex justify-end">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${purposeTone(e.purpose)}`}>
                                      {purposeLabel(e.purpose)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card className="p-6 bg-white dark:bg-slate-900 border shadow-xl rounded-3xl border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <div className="flex gap-1 pb-2">
            {heatmapData.slice(-84).map((day, idx) => {
              const intensity = day.intensity;
              const colorMap = {
                0: "bg-slate-200 dark:bg-slate-700",
                1: "bg-green-200 dark:bg-green-900/40",
                2: "bg-green-400 dark:bg-green-700/60",
                3: "bg-green-500 dark:bg-green-600/70",
                4: "bg-green-600 dark:bg-green-500/80"
              };

              return (
                <div
                  key={idx}
                  title={`${day.date}: ${day.status || "No data"}`}
                  className={`w-3 h-3 rounded-sm ${colorMap[intensity]} hover:ring-2 hover:ring-indigo-400 dark:hover:ring-indigo-500 cursor-pointer transition`}
                />
              );
            })}
          </div>
        </div>
      </Card>

      {events.length > 0 && (
        <Card className="p-6 bg-white dark:bg-slate-900 border shadow-xl rounded-3xl border-slate-200 dark:border-slate-700">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Events</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{events.length} events this month</p>
          </div>

          <div className="space-y-3">
            {events.slice(0, 8).map((event) => (
              <div key={event._id} className="flex items-start gap-3 p-3 transition border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50">
                <div className={`w-3 h-3 rounded-full mt-1 bg-${event.color || "blue"}-500`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-slate-900 dark:text-white">{event.title}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {event.date} • {event.startTime} - {event.endTime}
                  </div>
                  <div className="mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${purposeTone(event.purpose)}`}>
                      {purposeLabel(event.purpose)}
                    </span>
                  </div>
                  {event.description && (
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{event.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-900 shadow-2xl rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold dark:text-white">Create Event</h2>
              <button onClick={() => setShowEventModal(false)} className="dark:text-slate-300">
                <X />
              </button>
            </div>

            <input
              placeholder="Event title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />

            <textarea
              placeholder="Description"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                className="px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />

              <select
                value={eventForm.purpose}
                onChange={(e) => setEventForm({ ...eventForm, purpose: e.target.value })}
                className="px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {purposeOptions.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purposeLabel(purpose)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select
                value={eventForm.color}
                onChange={(e) => setEventForm({ ...eventForm, color: e.target.value })}
                className="px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
                <option value="purple">Purple</option>
                <option value="yellow">Yellow</option>
              </select>

              <div className="px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Access Rule</div>
                <div className="text-xs mt-1 text-slate-700 dark:text-slate-300">
                  {canManagePublicHolidays
                    ? "HR/Admin can create public holidays and personal events."
                    : "You can create only your own reminder, meeting, and personal events."}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">Start Time</label>
                <input
                  type="time"
                  value={eventForm.startTime}
                  onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-700 dark:text-slate-300">End Time</label>
                <input
                  type="time"
                  value={eventForm.endTime}
                  onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              onClick={handleCreateEvent}
              className="w-full py-3 font-semibold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 dark:from-indigo-700 dark:to-indigo-900 dark:hover:from-indigo-600 dark:hover:to-indigo-800"
            >
              Create Event
            </button>
          </Card>
        </div>
      )}

      <div className="fixed bottom-8 right-8">
        <button
          onClick={() => {
            setEventForm((prev) => ({
              ...prev,
              date: new Date().toISOString().split("T")[0],
              purpose: defaultEventPurpose
            }));
            setShowEventModal(true);
          }}
          className="flex items-center gap-2 px-6 py-4 font-semibold text-white transition rounded-full shadow-xl bg-gradient-to-r from-indigo-600 to-indigo-800 dark:from-indigo-700 dark:to-indigo-900 hover:shadow-2xl dark:hover:shadow-indigo-900/50 hover:scale-105"
        >
          <Plus size={20} />
          New Event
        </button>
      </div>

      {showWorksheetPanel && (
        <>
          <div
            className="fixed inset-0 z-40 transition-opacity duration-300 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowWorksheetPanel(false)}
          />

          <div className="fixed top-0 right-0 z-50 w-full h-screen max-w-md overflow-y-auto transition-transform duration-300 ease-out transform translate-x-0 bg-white dark:bg-slate-900 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Worksheet</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedDate &&
                    new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                </p>
              </div>
              <button
                onClick={() => setShowWorksheetPanel(false)}
                className="p-2 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} className="text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {loadingWorksheet ? (
                <div className="flex justify-center py-12">
                  <Spinner size="md" />
                </div>
              ) : worksheetData ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="mb-1 text-xs font-semibold tracking-wide text-green-700 dark:text-green-400 uppercase">Check In</div>
                      <div className="text-2xl font-bold text-green-900 dark:text-green-300">{worksheetData.checkIn || "—"}</div>
                    </div>

                    <div className="p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="mb-1 text-xs font-semibold tracking-wide text-blue-700 dark:text-blue-400 uppercase">Check Out</div>
                      <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">{worksheetData.checkOut || "—"}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-purple-200 dark:border-purple-800 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <div className="mb-1 text-xs font-semibold tracking-wide text-purple-700 dark:text-purple-400 uppercase">Total Hours</div>
                      <div className="text-2xl font-bold text-purple-900 dark:text-purple-300">
                        {worksheetData.totalHours
                          ? `${worksheetData.totalHours}h`
                          : worksheetData.hours
                          ? `${worksheetData.hours}h`
                          : "—"}
                      </div>
                    </div>

                    {worksheetData.status && (
                      <div className="p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <div className="mb-1 text-xs font-semibold tracking-wide text-indigo-700 dark:text-indigo-400 uppercase">Status</div>
                        <div className={`text-xl font-bold capitalize ${statusTone(worksheetData.status)}`}>
                          {worksheetData.status}
                        </div>
                      </div>
                    )}
                  </div>

                  {worksheetData.task && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold tracking-wide uppercase text-slate-900 dark:text-white">Task</h3>
                      <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-700 dark:text-slate-300">{worksheetData.task}</p>
                      </div>
                    </div>
                  )}

                  {worksheetData.notes && (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold tracking-wide uppercase text-slate-900 dark:text-white">Notes</h3>
                      <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{worksheetData.notes}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-12 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800">
                    <Calendar size={32} className="text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">No data found for this date</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, color, icon }) {
  const colors = {
    green: "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    orange: "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
    blue: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    purple: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20"
  };

  return (
    <Card className="p-6 transition border shadow-lg rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:shadow-xl dark:hover:shadow-slate-700/50 hover:-translate-y-[2px]">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 text-xs font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">{title}</div>
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{value}</div>
        </div>

        <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
