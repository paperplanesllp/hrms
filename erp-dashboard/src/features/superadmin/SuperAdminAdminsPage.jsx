import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import { toast } from "../../store/toastStore.js";
import { logout } from "../../store/authStore.js";

export default function SuperAdminAdminsPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminForm, setAdminForm] = useState({
    companyId: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get("/companies");
      setCompanies(res.data || []);
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to load companies",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const updateAdminField = (key) => (e) => {
    setAdminForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const submitAdmin = async (e) => {
    e.preventDefault();
    if (!adminForm.companyId) {
      toast({ title: "Select a company", type: "error" });
      return;
    }

    setSaving(true);

    try {
      await api.post(`/companies/${adminForm.companyId}/admin`, {
        name: adminForm.name,
        email: adminForm.email,
        phone: adminForm.phone,
        password: adminForm.password,
      });
      setAdminForm({ companyId: adminForm.companyId, name: "", email: "", phone: "", password: "" });
      toast({ title: "Admin created", type: "success" });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to create admin",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-2xl font-semibold text-slate-900">Company Admins</h1>
              <p className="text-sm text-slate-500 mt-1">Create admins for a company.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate("/superadmin/dashboard")}>Back</Button>
              <Button variant="secondary" onClick={handleLogout}>Log out</Button>
            </div>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Create company admin</h2>
          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submitAdmin}>
            <label className="block">
              <div className="text-sm font-semibold text-slate-900 mb-2.5">Company</div>
              <select
                value={adminForm.companyId}
                onChange={updateAdminField("companyId")}
                className="w-full h-11 rounded-lg bg-white border border-slate-300 px-3 text-slate-900"
                required
              >
                <option value="">Select company</option>
                {companies.map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Admin name" value={adminForm.name} onChange={updateAdminField("name")} required />
            <Input label="Admin email" type="email" value={adminForm.email} onChange={updateAdminField("email")} required />
            <Input label="Admin phone" value={adminForm.phone} onChange={updateAdminField("phone")} />
            <Input label="Temporary password" type="password" value={adminForm.password} onChange={updateAdminField("password")} required />
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Creating..." : "Create admin"}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
