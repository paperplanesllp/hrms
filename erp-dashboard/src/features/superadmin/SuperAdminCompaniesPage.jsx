import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import { toast } from "../../store/toastStore.js";
import { logout } from "../../store/authStore.js";

export default function SuperAdminCompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminModalCompany, setAdminModalCompany] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCompany, setEditCompany] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    isActive: true,
  });
  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
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

  const updateField = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const updateEditField = (key) => (e) => {
    const value = key === "isActive" ? e.target.checked : e.target.value;
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };


  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await api.post("/companies", form);
      setCompanies((prev) => [res.data, ...prev]);
      setForm({ name: "", domain: "", contactEmail: "", contactPhone: "", address: "" });
      loadCompanies();
      toast({ title: "Company created", type: "success" });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to create company",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };


  const openAdminModal = (company) => {
    setAdminModalCompany(company);
    setShowAdminModal(true);
  };

  const openEditModal = (company) => {
    setEditCompany(company);
    setEditForm({
      name: company.name || "",
      domain: company.domain || "",
      contactEmail: company.contactEmail || "",
      contactPhone: company.contactPhone || "",
      address: company.address || "",
      isActive: Boolean(company.isActive),
    });
    setShowEditModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate("/superadmin");
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminModalCompany(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditCompany(null);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editCompany?._id) return;

    setSaving(true);
    try {
      await api.patch(`/companies/${editCompany._id}`, editForm);
      loadCompanies();
      closeEditModal();
      toast({ title: "Company updated", type: "success" });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to update company",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (company) => {
    if (!company?._id) return;
    const confirmed = window.confirm(`Delete ${company.name}? This will deactivate the company.`);
    if (!confirmed) return;

    setSaving(true);
    try {
      await api.delete(`/companies/${company._id}`);
      loadCompanies();
      toast({ title: "Company deleted", type: "success" });
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to delete company",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Companies</h1>
              <p className="text-sm text-slate-500 mt-1">
                Create and monitor tenant companies.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => navigate("/superadmin/dashboard")}>Back</Button>
              <Button variant="secondary" onClick={handleLogout}>Log out</Button>
            </div>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add company</h2>
          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
            <Input label="Company name" value={form.name} onChange={updateField("name")} required />
            <Input label="Domain" value={form.domain} onChange={updateField("domain")} />
            <Input label="Contact email" type="email" value={form.contactEmail} onChange={updateField("contactEmail")} />
            <Input label="Contact phone" value={form.contactPhone} onChange={updateField("contactPhone")} />
            <Input label="Address" value={form.address} onChange={updateField("address")} className="md:col-span-2" />
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create company"}
              </Button>
            </div>
          </form>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">All companies</h2>
          {loading ? (
            <p className="text-sm text-slate-500 mt-3">Loading...</p>
          ) : companies.length === 0 ? (
            <p className="text-sm text-slate-500 mt-3">No companies yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Domain</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Admins</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {companies.map((company) => (
                    <tr key={company._id} className="border-t border-slate-100">
                      <td className="py-2 pr-4 font-medium">{company.name}</td>
                      <td className="py-2 pr-4">{company.domain || "-"}</td>
                      <td className="py-2 pr-4">{company.contactEmail || "-"}</td>
                      <td className="py-2 pr-4">{company.contactPhone || "-"}</td>
                      <td className="py-2 pr-4">
                        {company.admins?.length ? (
                          <Button variant="secondary" size="sm" onClick={() => openAdminModal(company)}>
                            View admins ({company.admins.length})
                          </Button>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-2 pr-4">{company.isActive ? "Active" : "Inactive"}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(company)}>
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDelete(company)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {showAdminModal && adminModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Admins</h3>
                <p className="text-xs text-slate-500">{adminModalCompany.name}</p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={closeAdminModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-4">
              {adminModalCompany.admins?.length ? (
                <div className="space-y-3">
                  {adminModalCompany.admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">{admin.name || "Admin"}</div>
                      <div className="text-xs text-slate-500">{admin.email || "-"}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No admins assigned.</p>
              )}
            </div>
            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={closeAdminModal}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit company</h3>
                <p className="text-xs text-slate-500">{editCompany.name}</p>
              </div>
              <button
                className="text-slate-400 hover:text-slate-600"
                onClick={closeEditModal}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <form className="px-6 py-4 space-y-4" onSubmit={submitEdit}>
              <Input label="Company name" value={editForm.name} onChange={updateEditField("name")} required />
              <Input label="Domain" value={editForm.domain} onChange={updateEditField("domain")} />
              <Input label="Contact email" type="email" value={editForm.contactEmail} onChange={updateEditField("contactEmail")} />
              <Input label="Contact phone" value={editForm.contactPhone} onChange={updateEditField("contactPhone")} />
              <Input label="Address" value={editForm.address} onChange={updateEditField("address")} />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={editForm.isActive} onChange={updateEditField("isActive")} />
                Active
              </label>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={closeEditModal}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
