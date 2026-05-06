import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button.jsx";
import { logout } from "../../store/authStore.js";

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/superadmin");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Super Admin Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Choose what you want to manage.</p>
            </div>
            <Button variant="secondary" onClick={handleLogout}>Log out</Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate("/superadmin/companies")}
            className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900">Companies</h2>
            <p className="text-sm text-slate-500 mt-1">Add companies and view admin list.</p>
          </button>
          <button
            type="button"
            onClick={() => navigate("/superadmin/admins")}
            className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900">Company Admins</h2>
            <p className="text-sm text-slate-500 mt-1">Create admins for a company.</p>
          </button>
        </section>
      </div>
    </div>
  );
}
