import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";

import LoginPage from "../features/auth/LoginPage.jsx";
import ResetPasswordPage from "../features/auth/ResetPasswordPage.jsx";

import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import MyProfilePage from "../features/profile/MyProfilePage.jsx";

import AttendancePage from "../features/attendance/AttendancePage.jsx";
import CalendarPage from "../features/calendar/CalendarPage.jsx";

import LeaveMyPage from "../features/leave/LeaveMyPage.jsx";
import LeaveManagePage from "../features/leave/LeaveManagePage.jsx";
import LeaveTypeManagementPage from "../features/leave/LeaveTypeManagementPage.jsx";
import HRLeaveApprovalPage from "../features/leave/HRLeaveApprovalPage.jsx";

import PayrollMyPage from "../features/payroll/PayrollMyPage.jsx";
import PayrollManagePage from "../features/payroll/PayrollManagePage.jsx";

import NewsPage from "../features/news/NewsPage.jsx";
import NewsStudio from "../features/news/NewsStudio.jsx";
import PoliciesPage from "../features/policies/PoliciesPage.jsx";
import PrivacyPolicyPage from "../features/policy/PrivacyPolicyPage.jsx";
import PolicyEditor from "../features/policy/PolicyEditor.jsx";
import WorksheetPage from "../features/worksheet/WorksheetPage.jsx";
import DocumentsPage from "../features/documents/DocumentsPage.jsx";
import TasksPage from "../features/tasks/TasksPage.jsx";
import MyTasksPage from "../features/tasks/MyTasksPage.jsx";
import TasksManagePage from "../features/tasks/TasksManagePage.jsx";

import UsersPage from "../features/users/UsersPage.jsx";
import HrPage from "../features/users/HrPage.jsx";
import HRTeamPage from "../features/admin/HRTeamPage.jsx";
import AdminAttendancePage from "../features/admin/AdminAttendancePage.jsx";
import AdminAnalyticsDashboard from "../features/admin/AdminAnalyticsDashboard.jsx";
import CompanySettingsPage from "../features/admin/CompanySettingsPage.jsx";
import AdminDocumentManagementPage from "../features/admin/AdminDocumentManagementPage.jsx";
import HRDocumentsManagementPage from "../features/hr/HRDocumentsManagementPage.jsx";
import AdminComplaintsPage from "../features/complaints/AdminComplaintsPage.jsx";
import ComplaintsPage from "../features/complaints/ComplaintsPage.jsx";
import ChatPage from "../features/chat/PremiumChatPage.jsx";
import StaffComplaintsDashboard from "../features/complaints/StaffComplaintsDashboard.jsx";
import DepartmentManagePage from "../features/department/DepartmentManagePage.jsx";
import HRActivityTimelinePage from "../features/hr/HRActivityTimelinePage.jsx";
import HRAttendanceManagementPage from "../features/hr/HRAttendanceManagementPage.jsx";
import ActivityTimelinePage from "../features/admin/ActivityTimelinePage.jsx";
import AdminAttendanceManagementPage from "../features/admin/AdminAttendanceManagementPage.jsx";
import EmployeeAnalyticsDashboard from "../features/analytics/EmployeeAnalyticsDashboard.jsx";

import { ROLES } from "./constants.js";

export default function AppRoutes() {
  return (
    <Routes>
      {/* ✅ Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ✅ Protected app routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        {/* Common pages */}
        <Route path="profile" element={<MyProfilePage />} />
        <Route path="analytics" element={<EmployeeAnalyticsDashboard />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="leave" element={<LeaveMyPage />} />
        <Route path="payroll" element={<PayrollMyPage />} />
        <Route path="worksheet" element={<WorksheetPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="policy" element={<PoliciesPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="tasks/my-tasks" element={<MyTasksPage />} />
        <Route path="tasks/manage" element={<TasksManagePage />} />
<Route path="complaints" element={<StaffComplaintsDashboard />} />
        <Route
          path="news-studio"
          element={
            <ProtectedRoute roles={[ROLES.HR]}>
              <NewsStudio />
            </ProtectedRoute>
          }
        />
        <Route path="privacy-policy" element={<PrivacyPolicyPage />} />
        <Route
          path="policy-editor"
          element={
            <ProtectedRoute roles={[ROLES.HR]}>
              <PolicyEditor />
            </ProtectedRoute>
          }
        />

        {/* HR + Admin */}
        <Route
          path="leave/manage"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <LeaveManagePage />
            </ProtectedRoute>
          }
        />

        {/* Admin only - Leave Type Management */}
        <Route
          path="leave/types"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <LeaveTypeManagementPage />
            </ProtectedRoute>
          }
        />

        {/* Admin only - HR Leave Approval */}
        <Route
          path="leave/hr-approval"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <HRLeaveApprovalPage />
            </ProtectedRoute>
          }
        />

        {/* HR + Admin - Payroll Management */}
        <Route
          path="payroll/manage"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <PayrollManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/hr"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <HRTeamPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/attendance"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <AdminAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <AdminAnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/company-settings"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/department"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN, ROLES.HR]}>
              <DepartmentManagePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/complaints"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <AdminComplaintsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/documents"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <AdminDocumentManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/documents"
          element={
            <ProtectedRoute roles={[ROLES.HR]}>
              <HRDocumentsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/activity-timeline"
          element={
            <ProtectedRoute roles={[ROLES.HR]}>
              <HRActivityTimelinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="hr/attendance-management"
          element={
            <ProtectedRoute roles={[ROLES.HR]}>
              <HRAttendanceManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/activity-timeline"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <ActivityTimelinePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/attendance-management"
          element={
            <ProtectedRoute roles={[ROLES.ADMIN]}>
              <AdminAttendanceManagementPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}