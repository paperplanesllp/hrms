import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";

export default function SuperAdminProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  if (!token) return <Navigate to="/superadmin" replace />;
  if (user?.role !== "SUPERADMIN") return <Navigate to="/" replace />;

  return children;
}
