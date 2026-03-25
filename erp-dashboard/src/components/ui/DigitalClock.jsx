import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function DigitalClock() {
  const [time, setTime] = useState("");
  const [dateInfo, setDateInfo] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      
      // Use local system time (no conversion)
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12;
      hours = hours ? hours : 12;
      const displayHours = String(hours).padStart(2, "0");
      
      setTime(`${displayHours}:${minutes}:${seconds} ${ampm}`);
      
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
        <span className="font-mono text-sm font-bold leading-tight tracking-wide text-slate-900 dark:text-white">
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
