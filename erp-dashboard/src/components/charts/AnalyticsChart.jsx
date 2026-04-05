import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from "recharts";

import Card from "../ui/Card.jsx";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";

/* ============================================================
THEME
============================================================ */

const CHART_THEME = {
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
};

/* ============================================================
TOOLTIP
============================================================ */

function PremiumTooltip({ active, payload, label }) {
  if (!active || !payload) return null;

  return (
    <div className="p-4 bg-white border shadow-xl rounded-xl border-slate-200">
      <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>

      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-slate-700">
            {entry.name}: <b>{entry.value}</b>
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
CARD
============================================================ */

function PremiumChartCard({ title, subtitle, lastUpdated, children }) {
  const [timeAgo, setTimeAgo] = useState("");

  useEffect(() => {
    if (!lastUpdated) return;

    const diff = Math.floor((Date.now() - new Date(lastUpdated)) / 60000);
    if (diff < 1) setTimeAgo("just now");
    else setTimeAgo(`${diff} min ago`);
  }, [lastUpdated]);

  return (
    <Card className="p-6 bg-white border shadow-lg rounded-3xl border-slate-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {timeAgo}
          </div>
        )}
      </div>

      {children}
    </Card>
  );
}

/* ============================================================
STAT BLOCK
============================================================ */

function StatBlock({ label, value }) {
  return (
    <div className="p-4 border rounded-xl bg-slate-50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

/* ============================================================
ATTENDANCE TREND
============================================================ */

export function AttendanceTrendChart({
  data = [],
  totals = {},
  title = "Attendance Trends",
  lastUpdated,
}) {
  if (!data.length) {
    return (
      <PremiumChartCard title={title}>
        <div className="h-[280px] flex items-center justify-center text-slate-400">
          No attendance data
        </div>
      </PremiumChartCard>
    );
  }

  const totalPresent =
    totals.present ?? data.reduce((sum, d) => sum + (d.present || 0), 0);

  const totalLate =
    totals.late ?? data.reduce((sum, d) => sum + (d.late || 0), 0);

  const totalHalfDay =
    totals.halfDay ?? data.reduce((sum, d) => sum + (d.halfDay || 0), 0);

  const totalAbsent =
    totals.absent ?? data.reduce((sum, d) => sum + (d.absent || 0), 0);

  return (
    <PremiumChartCard
      title={title}
      subtitle="Weekly attendance overview"
      lastUpdated={lastUpdated}
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="date" />
          <YAxis />

          <Tooltip content={<PremiumTooltip />} />
          <Legend />

          <Area
            type="monotone"
            dataKey="present"
            stroke={CHART_THEME.success}
            fillOpacity={0.2}
            fill={CHART_THEME.success}
          />

          <Area
            type="monotone"
            dataKey="late"
            stroke={CHART_THEME.warning}
            fillOpacity={0.2}
            fill={CHART_THEME.warning}
          />

          <Area
            type="monotone"
            dataKey="halfDay"
            stroke={CHART_THEME.purple}
            fillOpacity={0.2}
            fill={CHART_THEME.purple}
          />

          <Area
            type="monotone"
            dataKey="absent"
            stroke={CHART_THEME.danger}
            fillOpacity={0.2}
            fill={CHART_THEME.danger}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-4 gap-4 mt-6">
        <StatBlock label="Present" value={totalPresent} />
        <StatBlock label="Short Hours" value={totalLate} />
        <StatBlock label="Half Day" value={totalHalfDay} />
        <StatBlock label="Absent" value={totalAbsent} />
      </div>
    </PremiumChartCard>
  );
}

/* ============================================================
DEPARTMENT PERFORMANCE
============================================================ */

export function DepartmentComparisonChart({
  data = [],
  title = "Department Performance",
  lastUpdated,
}) {
  if (!data.length) {
    return (
      <PremiumChartCard title={title}>
        <div className="h-[280px] flex items-center justify-center text-slate-400">
          No department data
        </div>
      </PremiumChartCard>
    );
  }

  return (
    <PremiumChartCard
      title={title}
      subtitle="Department performance metrics"
      lastUpdated={lastUpdated}
    >
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="department" />
          <YAxis />

          <Tooltip content={<PremiumTooltip />} />
          <Legend />

          <Bar dataKey="efficiency" fill={CHART_THEME.blue} />
          <Bar dataKey="attendance" fill={CHART_THEME.success} />
          <Bar dataKey="productivity" fill={CHART_THEME.purple} />
        </BarChart>
      </ResponsiveContainer>
    </PremiumChartCard>
  );
}

/* ============================================================
PAYROLL DISTRIBUTION
============================================================ */

export function PayrollDistributionChart({
  data = [],
  title = "Payroll Distribution",
  lastUpdated,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!data.length) {
    return (
      <PremiumChartCard title={title}>
        <div className="h-[250px] flex items-center justify-center text-slate-400">
          No payroll data
        </div>
      </PremiumChartCard>
    );
  }

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
      props;

    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  };

  return (
    <PremiumChartCard
      title={title}
      subtitle="Payroll breakdown"
      lastUpdated={lastUpdated}
    >
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={60}
            outerRadius={90}
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={(_, i) => setActiveIndex(i)}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </PremiumChartCard>
  );
}

/* ============================================================
LEAVE ANALYTICS
============================================================ */

export function LeaveAnalyticsChart({
  data = [],
  title = "Leave Analytics",
  lastUpdated,
}) {
  if (!data.length) {
    return (
      <PremiumChartCard title={title}>
        <div className="h-[280px] flex items-center justify-center text-slate-400">
          No leave data
        </div>
      </PremiumChartCard>
    );
  }

  return (
    <PremiumChartCard
      title={title}
      subtitle="Weekly leave requests"
      lastUpdated={lastUpdated}
    >
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="day" />
          <YAxis />

          <Tooltip content={<PremiumTooltip />} />
          <Legend />

          <Line
            type="monotone"
            dataKey="approved"
            stroke={CHART_THEME.success}
            strokeWidth={3}
          />

          <Line
            type="monotone"
            dataKey="pending"
            stroke={CHART_THEME.warning}
            strokeWidth={3}
          />

          <Line
            type="monotone"
            dataKey="rejected"
            stroke={CHART_THEME.danger}
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </PremiumChartCard>
  );
}

/* ============================================================
KPI CARD
============================================================ */

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendDirection = "up",
}) {
  return (
    <div className="p-6 bg-white border shadow-md rounded-2xl border-slate-200">
      <p className="text-xs uppercase text-slate-500">{title}</p>

      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      )}

      {trend && (
        <div
          className={`flex items-center gap-1 mt-3 text-sm font-medium ${
            trendDirection === "up"
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {trendDirection === "up" ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}

          {trend}
        </div>
      )}
    </div>
  );
}