import React, { useEffect } from "react";
import { AdminTimeline } from "../../components/common/ActivityTimeline";
import { useAuthStore } from "../../store/authStore";
import { ROLES } from "../../app/constants";

/**
 * Admin Dashboard Activity Timeline Page
 * Shows ALL activities - staff activities + HR activities (complete audit trail)
 */
export default function AdminActivityTimelinePage() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Verify user has Admin access
    if (user && user.role !== ROLES.ADMIN) {
      // Redirect or show access denied
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Activity Log</h1>
          <p className="text-gray-600 mt-2">
            Monitor all system activities including staff profiles, leave, attendance, documents, and HR actions
          </p>
        </div>

        <div className="grid gap-6">
          <AdminTimeline />
        </div>
      </div>
    </div>
  );
}
