import React, { useEffect } from "react";
import { HRTimeline } from "../../components/common/ActivityTimeline";
import { useAuthStore } from "../../store/authStore";
import { ROLES } from "../../app/constants";

/**
 * HR Dashboard Activity Timeline Page
 * Shows all staff activities relevant to HR monitoring
 */
export default function HRActivityTimelinePage() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Verify user has HR access
    if (user && ![ROLES.HR, ROLES.ADMIN].includes(user.role)) {
      // Redirect or show access denied
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Activity Timeline</h1>
          <p className="text-gray-600 mt-2">
            Monitor all staff activities including profile updates, attendance, and leave requests
          </p>
        </div>

        <div className="grid gap-6">
          <HRTimeline />
        </div>
      </div>
    </div>
  );
}
