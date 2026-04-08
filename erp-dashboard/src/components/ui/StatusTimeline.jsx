import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  ShieldCheck,
} from "lucide-react";

export default function StatusTimeline({ leave }) {
  const formatDate = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });
  };

  const getTimelineSteps = () => {
    const steps = [
      {
        id: "submitted",
        title: "Request Submitted",
        description: `Leave request submitted on ${new Date(
          leave.createdAt
        ).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
        icon: Send,
        status: "completed",
        date: leave.createdAt,
      },
      {
        id: "review",
        title: "Under Review",
        description:
          leave.status === "PENDING"
            ? "Your request is currently being reviewed by HR."
            : "HR reviewed your leave request.",
        icon: ShieldCheck,
        status: leave.status === "PENDING" ? "current" : "completed",
        date: leave.status === "PENDING" ? null : leave.updatedAt,
      },
    ];

    if (leave.status === "APPROVED") {
      steps.push({
        id: "approved",
        title: "Request Approved",
        description: `Approved by ${
          leave.approvedBy?.name || "HR"
        }. Your leave request has been successfully approved.`,
        icon: CheckCircle2,
        status: "approved",
        date: leave.updatedAt,
      });
    } else if (leave.status === "REJECTED") {
      steps.push({
        id: "rejected",
        title: "Request Rejected",
        description: `Rejected by ${
          leave.rejectedBy?.name || "HR"
        }. Please contact HR for more details.`,
        icon: XCircle,
        status: "rejected",
        date: leave.updatedAt,
      });
    } else {
      steps.push({
        id: "decision",
        title: "Decision Pending",
        description: "Final approval decision is still pending.",
        icon: Clock,
        status: "pending",
        date: null,
      });
    }

    return steps;
  };

  const steps = getTimelineSteps();

  const getStepStyles = (status) => {
    switch (status) {
      case "completed":
        return {
          wrapper:
            "bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 border-emerald-200/70 dark:border-emerald-800/40",
          icon:
            "bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/40",
          line: "bg-emerald-200 dark:bg-emerald-800/40",
          title: "text-emerald-800 dark:text-emerald-300",
          text: "text-slate-600 dark:text-slate-400",
          date: "text-emerald-600/80 dark:text-emerald-400/80",
        };
      case "current":
        return {
          wrapper:
            "bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-amber-200/70 dark:border-amber-800/40 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]",
          icon:
            "bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/40 animate-pulse",
          line: "bg-amber-200 dark:bg-amber-800/40",
          title: "text-amber-800 dark:text-amber-300",
          text: "text-slate-600 dark:text-slate-400",
          date: "text-amber-600/80 dark:text-amber-400/80",
        };
      case "approved":
        return {
          wrapper:
            "bg-gradient-to-r from-green-50 to-white dark:from-green-950/20 dark:to-slate-900 border-green-200/70 dark:border-green-800/40",
          icon:
            "bg-green-100 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700/40",
          line: "bg-green-200 dark:bg-green-800/40",
          title: "text-green-800 dark:text-green-300",
          text: "text-slate-600 dark:text-slate-400",
          date: "text-green-600/80 dark:text-green-400/80",
        };
      case "rejected":
        return {
          wrapper:
            "bg-gradient-to-r from-red-50 to-white dark:from-red-950/20 dark:to-slate-900 border-red-200/70 dark:border-red-800/40",
          icon:
            "bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40",
          line: "bg-red-200 dark:bg-red-800/40",
          title: "text-red-800 dark:text-red-300",
          text: "text-slate-600 dark:text-slate-400",
          date: "text-red-600/80 dark:text-red-400/80",
        };
      default:
        return {
          wrapper:
            "bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/70 dark:to-slate-900 border-slate-200/70 dark:border-slate-700/60",
          icon:
            "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
          line: "bg-slate-200 dark:bg-slate-700",
          title: "text-slate-700 dark:text-slate-300",
          text: "text-slate-500 dark:text-slate-400",
          date: "text-slate-400 dark:text-slate-500",
        };
    }
  };

  return (
    <div className="relative">
      <div className="mb-5">
        <h3 className="text-base font-bold text-[#0A1931] dark:text-white">
          Leave Request Timeline
        </h3>
        <p className="mt-1 text-sm text-[#4A7FA7] dark:text-slate-400">
          Track each stage of your leave approval process.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const styles = getStepStyles(step.status);
          const isLast = index === steps.length - 1;
          const IconComponent = step.icon;

          return (
            <div key={step.id} className="relative flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <div
                  className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${styles.icon}`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>

                {!isLast && (
                  <div
                    className={`mt-2 w-0.5 flex-1 min-h-[54px] rounded-full ${styles.line}`}
                  />
                )}
              </div>

              <div
                className={`flex-1 rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow-md ${styles.wrapper}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className={`text-sm font-semibold ${styles.title}`}>
                      {step.title}
                    </h4>
                    <p className={`mt-1 text-sm leading-6 ${styles.text}`}>
                      {step.description}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <span className="rounded-full border border-white/50 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                      {step.status}
                    </span>
                  </div>
                </div>

                {step.date && (
                  <div className={`mt-3 text-xs font-medium ${styles.date}`}>
                    {formatDate(step.date)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}