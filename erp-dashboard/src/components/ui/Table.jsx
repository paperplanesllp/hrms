import React from "react";

export default function Table({ 
  columns = [], 
  rows = [], 
  renderRow, 
  compact = false,
  striped = true 
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs dark:shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className={`text-left font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                  compact ? "px-4 py-3" : "px-6 py-4"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={`border-b border-slate-200/50 dark:border-slate-700/50 transition-colors duration-150 ${
                striped && i % 2 === 0 ? "bg-slate-50 dark:bg-slate-900/20" : "bg-white dark:bg-slate-800/50"
              } hover:bg-slate-50 dark:hover:bg-slate-700`}
            >
              {renderRow(r)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableCell({ children, className = "", compact = false, align = "left" }) {
  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <td className={`text-slate-900 dark:text-slate-100 ${compact ? "px-4 py-3" : "px-6 py-4"} ${alignClass} ${className}`}>
      {children}
    </td>
  );
}