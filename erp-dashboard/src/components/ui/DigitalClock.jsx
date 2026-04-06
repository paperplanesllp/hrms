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
      
      // Use local system time (no conversion)
      const hour24 = now.getHours();
      const min = now.getMinutes();
      let hours = hour24;
      const minutes = String(min).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const displayHours = String(hours).padStart(2, "0");
      
      setTime(`${displayHours}:${minutes}:${seconds} ${ampm}`);
      setColorClass(getClockColor(hour24, min));
      
      // Format full date: Tuesday, 24 March 2026
      const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
      const day = String(now.getDate()).padStart(2, "0");
      const month = now.toLocaleDateString("en-US", { month: "long" });
      const year = now.getFullYear();
      
      setDateInfo(`${dayName}, ${day} ${month} ${year}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/60 dark:to-slate-800/60 border border-slate-200/70 dark:border-slate-600/70 hover:shadow-lg hover:border-slate-300/70 dark:hover:border-slate-500/70 transition-all duration-300 ease-smooth group">
      {/* Clock Icon */}
      <Clock className="flex-shrink-0 w-5 h-5 transition-colors text-brand-accent dark:text-brand-accent/90 group-hover:text-brand-accent/80" />
      
      {/* Time & Date Display */}
      <div className="flex flex-col items-start gap-0.5">
        {/* Time with AM/PM */}
        <span className={`font-mono text-sm font-bold leading-tight tracking-wide ${colorClass}`}>
          {time || "12:00 pm"}
        </span>
        
        {/* Full Date */}
        <span className="text-xs font-medium leading-tight text-slate-600 dark:text-slate-300">
          {dateInfo || "Loading..."}
        </span>
      </div>
    </div>
  );
}
