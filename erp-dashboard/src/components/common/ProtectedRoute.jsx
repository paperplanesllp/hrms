import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore.js";
import { hasRole } from "../../lib/rbac.js";

export default function ProtectedRoute({ roles, children }) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);

  if (!token) return <Navigate to="/login" replace />;
  if (roles && !hasRole(user, roles)) return <Navigate to="/" replace />;

  return children;
}