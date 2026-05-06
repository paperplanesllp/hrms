import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { hasRole } from "../../lib/rbac.js";

export default function ProtectedRoute({ roles, children }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  if (!token) {
    const logoutRedirect = sessionStorage.getItem("logoutRedirect");
    if (logoutRedirect) {
      sessionStorage.removeItem("logoutRedirect");
      return <Navigate to={logoutRedirect} replace />;
    }

    return <Navigate to="/auth/login" replace />;
  }
  if (roles && !hasRole(user, roles)) {
    if (user?.role === "SUPERADMIN") {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  return children;
}