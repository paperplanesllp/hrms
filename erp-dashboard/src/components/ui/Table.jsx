import React from "react";

export default function Table({ 
  columns = [], 
  rows = [], 
  renderRow, 
  compact = false,
  striped = true 
}) {
  return (
    <div className="glass-table responsive-table-shell overflow-x-auto">
      <table className="w-full min-w-[42rem] theme-table-text">
        <thead className="border-b theme-border bg-white/45 dark:bg-slate-900/35">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className={`text-left theme-table-heading ${
                  compact ? "px-3 py-3 sm:px-4" : "px-3 py-3 sm:px-6 sm:py-4"
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
              className={`border-b border-slate-200/40 dark:border-slate-700/40 transition-colors duration-150 ${
                striped && i % 2 === 0 ? "bg-white/35 dark:bg-slate-900/18" : "bg-white/15 dark:bg-slate-800/22"
              } hover:bg-emerald-50/45 dark:hover:bg-slate-700/45`}
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
    <td className={`theme-table-text whitespace-nowrap ${compact ? "px-3 py-3 sm:px-4" : "px-3 py-3 sm:px-6 sm:py-4"} ${alignClass} ${className}`}>
      {children}
    </td>
  );
}
