import React, { useState, useEffect, useRef } from "react";
import Card from "../../components/ui/Card.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import { toast } from "../../store/toastStore.js";
import api from "../../lib/api.js";
import { requestGeolocation } from "../../lib/geolocation.js";
import { convertTo12HourFormat } from "../attendance/attendanceUtils.js";
import { Clock, LogIn, LogOut, Timer, CheckCircle } from "lucide-react";

export default function QuickAttendanceMarking() {
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [hasCheckedOutToday, setHasCheckedOutToday] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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

  // Load attendance status on mount
  useEffect(() => {
    loadAttendanceStatus();
  }, []);

  const loadAttendanceStatus = async () => {
    try {
      setInitialLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get("/attendance/me", {
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
    } finally {
      setInitialLoading(false);
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
        description: `Distance from office: ${res.data.attendance?.distanceFromOffice || 0}m`,
        type: "success" 
      });
      
      setHasCheckedInToday(true);
      setCheckInTime(res.data.attendance?.checkIn || clientCheckInTime);
    } catch (e) {
      toast({ title: "Check-in failed: " + (e?.response?.data?.message || e.message), type: "error" });
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setAttendanceLoading(true);
      
      // Get current time from client
      const now = new Date();
      const clientCheckOutTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      await api.post("/attendance/checkout", {
        checkOut: clientCheckOutTime
      });
      toast({ title: "✅ Checked out successfully", type: "success" });
      
      setHasCheckedOutToday(true);
    } catch (e) {
      toast({ title: "Check-out failed: " + (e?.response?.data?.message || e.message), type: "error" });
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <Card elevated className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/30 dark:border-blue-800/50">
        <div className="p-6 flex items-center justify-center">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <Card elevated className="border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-900/30 dark:border-blue-800/50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-[#0A1931] dark:text-white">Quick Attendance Marking</h3>
              <p className="text-xs text-[#4A7FA7] dark:text-slate-400">Mark your attendance from dashboard</p>
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
                  ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed"
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
                  ? "bg-green-50 text-green-600 border border-green-200 cursor-not-allowed"
                  : !hasCheckedInToday
                  ? "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
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

        {/* Info message */}
        <div className="p-3 mt-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800/50">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> Marking attendance requires your location. Make sure to grant geolocation permission when prompted.
          </p>
        </div>
      </div>
    </Card>
  );
}
