import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

// Returns color class based on current time (24h format)
function getClockColor(hour24, minute) {
  const t = hour24 * 60 + minute; // total minutes since midnight
  if (t >= 570 && t < 780) return "text-green-600 dark:text-green-400";       // 9:30 AM – 1:00 PM
  if (t >= 780 && t < 840) return "text-slate-900 dark:text-white";            // 1:00 PM – 2:00 PM
  if (t >= 840 && t < 960) return "text-yellow-500 dark:text-yellow-400";      // 2:00 PM – 4:00 PM
  if (t >= 960 && t < 980) return "text-slate-900 dark:text-white";            // 4:00 PM – 4:20 PM
  if (t >= 980 && t < 1110) return "text-red-600 dark:text-red-400";           // 4:20 PM – 6:30 PM
  return "text-slate-900 dark:text-white";                                      // outside work hours
}

export default function DigitalClock() {
  const [time, setTime] = useState("");
  const [dateInfo, setDateInfo] = useState("");
  const [colorClass, setColorClass] = useState("text-slate-900 dark:text-white");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Use IST (Asia/Kolkata) time
      const istParts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).formatToParts(now);
      
      const hour24Parts = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: false
      }).formatToParts(now);
      
      const h24 = parseInt(hour24Parts.find(p => p.type === 'hour')?.value || '0');
      const min = parseInt(hour24Parts.find(p => p.type === 'minute')?.value || '0');
      
      const hourVal = istParts.find(p => p.type === 'hour')?.value || '12';
      const minuteVal = istParts.find(p => p.type === 'minute')?.value || '00';
      const secondVal = istParts.find(p => p.type === 'second')?.value || '00';
      const ampm = istParts.find(p => p.type === 'dayPeriod')?.value || 'am';
      
      setTime(`${hourVal.padStart(2, '0')}:${minuteVal}:${secondVal} ${ampm}`);
      setColorClass(getClockColor(h24, min));
      
      // Format full date in IST: Tuesday, 24 March 2026
      const dayName = now.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
      const day = now.toLocaleDateString("en-US", { day: "2-digit", timeZone: "Asia/Kolkata" });
      const month = now.toLocaleDateString("en-US", { month: "long", timeZone: "Asia/Kolkata" });
      const year = now.toLocaleDateString("en-US", { year: "numeric", timeZone: "Asia/Kolkata" });
      
      setDateInfo(`${dayName}, ${day} ${month} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex max-w-[18rem] items-center gap-3 overflow-hidden rounded-2xl border border-white/45 bg-gradient-to-br from-white/75 via-white/45 to-emerald-50/35 px-3 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl transition-all duration-300 ease-smooth hover:-translate-y-0.5 hover:scale-[1.01] hover:border-emerald-200/70 hover:shadow-[0_22px_55px_rgba(15,23,42,0.16),0_0_28px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.75)] dark:border-white/10 dark:from-slate-900/80 dark:via-slate-800/55 dark:to-emerald-950/35 dark:shadow-[0_18px_45px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:border-emerald-400/30 dark:hover:shadow-[0_22px_55px_rgba(0,0,0,0.42),0_0_30px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] group md:px-4 md:py-2.5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-emerald-300/30 blur-2xl dark:bg-emerald-400/15" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20" />
      {/* Clock Icon */}
      <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-emerald-200/55 bg-white/45 shadow-inner shadow-white/40 backdrop-blur-md dark:border-emerald-300/15 dark:bg-white/10 dark:shadow-none">
        <Clock className="w-5 h-5 transition-colors text-emerald-600 dark:text-emerald-300 group-hover:text-emerald-500" />
      </div>
      
      {/* Time & Date Display */}
      <div className="relative flex min-w-0 flex-col items-start gap-0.5">
        {/* Time with AM/PM */}
        <span className={`font-mono text-xs font-extrabold leading-tight tracking-wide drop-shadow-sm md:text-sm ${colorClass}`}>
          {time || "12:00 pm"}
        </span>
        
        {/* Full Date */}
        <span className="hidden max-w-44 truncate text-xs font-semibold leading-tight text-slate-600/90 dark:text-slate-300/90 md:block">
          {dateInfo || "Loading..."}
        </span>
      </div>
    </div>
  );
}
