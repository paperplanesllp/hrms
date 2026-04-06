import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { Plus, Search, Trash2, Edit, ChevronDown, ChevronUp, Building2 } from "lucide-react";

export default function DepartmentManagePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === ROLES.ADMIN;
  const isHR = user?.role === ROLES.HR;
  const canManage = isAdmin || isHR;

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDept, setExpandedDept] = useState(null);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [desigModalOpen, setDesigModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [editingDesig, setEditingDesig] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

  const [deptForm, setDeptForm] = useState({
    name: "",
    description: "",
    headName: "",
    email: "",
    phone: "",
    budget: ""
  });

  const [desigForm, setDesigForm] = useState({
    name: "",
    description: "",
    level: "mid",
    salary: ""
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get(canManage ? "/department/all" : "/department");
      const deptRows = Array.isArray(response.data) ? response.data : [];
      setDepartments(deptRows);

      if (deptRows.length === 0) {
        setDesignations({});
        return;
      }

      // Preload designation lists so each department shows accurate role counts/previews.
      const designationEntries = await Promise.all(
        deptRows.map(async (dept) => {
          try {
            const designationRes = await api.get(`/department/designation/department/${dept._id}`);
            return [dept._id, Array.isArray(designationRes.data) ? designationRes.data : []];
          } catch (designationErr) {
            console.error(`Load designations error for ${dept.name}:`, designationErr);
            return [dept._id, []];
          }
        })
      );

      setDesignations(Object.fromEntries(designationEntries));
    } catch (err) {
      console.error("Load departments error:", err);
      const message = err.response?.status === 401
        ? "Session expired. Please log in again."
        : err.response?.status === 403
        ? "Access denied."
        : "Failed to load departments.";
      toast({ title: message, type: "error" });
      if (err.response?.status === 401) {
        setTimeout(() => window.location.href = "/login", 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDesignations = async (departmentId) => {
    try {
      const response = await api.get(`/department/designation/department/${departmentId}`);
      setDesignations(prev => ({ ...prev, [departmentId]: response.data || [] }));
    } catch (err) {
      console.error("Load designations error:", err);
      toast({ title: "Failed to load designations", type: "error" });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============ Department Handlers ============
  const handleSubmitDept = async (e) => {
    e.preventDefault();

    if (!deptForm.name.trim()) {
      toast({ title: "Department name is required", type: "error" });
      return;
    }

    try {
      const payload = {
        ...deptForm,
        budget: deptForm.budget ? Number(deptForm.budget) : 0
      };
      if (editingDept) {
        await api.put(`/department/${editingDept._id}`, payload);
        toast({ title: "Department updated successfully", type: "success" });
      } else {
        await api.post("/department", payload);
        toast({ title: "Department created successfully", type: "success" });
      }
      setDeptModalOpen(false);
      setEditingDept(null);
      setDeptForm({ name: "", description: "", headName: "", email: "", phone: "", budget: "" });
      loadData();
    } catch (err) {
      console.error("Submit department error:", err);
      toast({ title: err?.response?.data?.message || "Failed to save department", type: "error" });
    }
  };

  const handleEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      description: dept.description || "",
      headName: dept.headName || "",
      email: dept.email || "",
      phone: dept.phone || "",
      budget: dept.budget || ""
    });
    setDeptModalOpen(true);
  };

  const handleDeleteDept = async (deptId) => {
    if (!window.confirm("Are you sure? This will also delete all designations in this department.")) return;

    try {
      await api.delete(`/department/${deptId}`);
      toast({ title: "Department deleted successfully", type: "success" });
      loadData();
      if (expandedDept === deptId) setExpandedDept(null);
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to delete department", type: "error" });
    }
  };

  // ============ Designation Handlers ============
  const handleSubmitDesig = async (e) => {
    e.preventDefault();

    if (!desigForm.name.trim() || !selectedDeptId) {
      toast({ title: "Designation name and department are required", type: "error" });
      return;
    }

    try {
      const payload = {
        name: desigForm.name,
        departmentId: selectedDeptId,
        description: desigForm.description,
        level: desigForm.level,
        salary: desigForm.salary ? Number(desigForm.salary) : 0
      };

      if (editingDesig) {
        await api.put(`/department/designation/${editingDesig._id}`, payload);
        toast({ title: "Designation updated successfully", type: "success" });
      } else {
        await api.post("/department/designation", payload);
        toast({ title: "Designation created successfully", type: "success" });
      }
      setDesigModalOpen(false);
      setEditingDesig(null);
      setDesigForm({ name: "", description: "", level: "mid", salary: "" });
      loadDesignations(selectedDeptId);
    } catch (err) {
      console.error("Submit designation error:", err);
      toast({ title: err?.response?.data?.message || "Failed to save designation", type: "error" });
    }
  };

  const handleEditDesig = (desig) => {
    setEditingDesig(desig);
    setDesigForm({
      name: desig.name,
      description: desig.description || "",
      level: desig.level || "mid",
      salary: desig.salary || ""
    });
    setDesigModalOpen(true);
  };

  const handleDeleteDesig = async (desigId) => {
    if (!window.confirm("Are you sure you want to delete this designation?")) return;

    try {
      await api.delete(`/department/designation/${desigId}`);
      toast({ title: "Designation deleted successfully", type: "success" });
      loadDesignations(selectedDeptId);
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Failed to delete designation", type: "error" });
    }
  };

  const handleExpandDept = async (deptId) => {
    setExpandedDept(expandedDept === deptId ? null : deptId);
    if (expandedDept !== deptId && !designations[deptId]) {
      await loadDesignations(deptId);
    }
  };

  // Filter departments by search term
  const filteredDepts = departments.filter(d =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Department & Designation Management"
        subtitle="Manage organizational departments and job designations"
        actions={
          canManage && (
            <Button
              onClick={() => {
                setEditingDept(null);
                setDeptForm({ name: "", description: "", headName: "", email: "", phone: "", budget: "" });
                setDeptModalOpen(true);
              }}
              className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </Button>
          )
        }
      />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6 border-l-4 border-l-[#137333] bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Departments</p>
              <p className="text-3xl font-bold text-[#137333] mt-2">{departments.length}</p>
            </div>
            <Building2 className="w-6 h-6 text-[#137333]" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Designations</p>
              <p className="text-3xl font-bold text-[#4A7FA7] mt-2">
                {Object.values(designations).reduce((sum, arr) => sum + arr.length, 0)}
              </p>
            </div>
            <Building2 className="w-6 h-6 text-[#4A7FA7]" />
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="p-4 bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-[#70757A]" />
          <Input
            placeholder="Search by department name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Departments List */}
      <Card className="bg-white">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#0A1931] mb-4">Departments</h3>
          {loading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : filteredDepts.length === 0 ? (
            <div className="px-4 py-12 text-center text-[#70757A]">
              No departments found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDepts.map((dept) => (
                <div key={dept._id} className="border border-[#B3CFE5] rounded-lg">
                  {/* Department Row */}
                  <div
                    className="flex items-center justify-between p-4 hover:bg-[#F6FAFD] cursor-pointer transition"
                    onClick={() => handleExpandDept(dept._id)}
                  >
                    <div className="flex items-center flex-1 gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpandDept(dept._id);
                        }}
                        className="p-1 hover:bg-[#E8F0F7] rounded"
                      >
                        {expandedDept === dept._id ? (
                          <ChevronUp className="w-5 h-5 text-[#70757A]" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-[#70757A]" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#0A1931]">{dept.name}</h4>
                        <p className="text-sm text-[#70757A]">{dept.description || "No description"}</p>
                        {dept.headName && <p className="text-xs text-[#4A7FA7]">Head: {dept.headName}</p>}
                        {expandedDept === dept._id && (designations[dept._id]?.length || 0) > 0 && (
                          <p className="text-xs text-[#4A7FA7] mt-1">
                            Roles: {designations[dept._id].map((desig) => desig.name).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="px-2 py-1 text-blue-700 border border-blue-300 bg-blue-50">
                        {designations[dept._id]?.length || 0} roles
                      </Badge>
                      {canManage && (
                        <div className="flex gap-2 ml-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDept(dept);
                            }}
                            variant="ghost"
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDept(dept._id);
                            }}
                            variant="ghost"
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Designations Section */}
                  {expandedDept === dept._id && (
                    <div className="border-t border-[#B3CFE5] bg-[#F6FAFD] p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-semibold text-[#0A1931]">Designations in {dept.name}</h5>
                        {canManage && (
                          <Button
                            onClick={() => {
                              setSelectedDeptId(dept._id);
                              setEditingDesig(null);
                              setDesigForm({ name: "", description: "", level: "mid", salary: "" });
                              setDesigModalOpen(true);
                            }}
                            className="bg-[#137333] hover:bg-[#0d5628] text-white gap-2 text-sm"
                          >
                            <Plus className="w-3 h-3" />
                            Add Designation
                          </Button>
                        )}
                      </div>

                      {designations[dept._id]?.length === 0 ? (
                        <p className="text-sm text-[#70757A] italic">No designations yet</p>
                      ) : (
                        <div className="space-y-2">
                          {designations[dept._id]?.map((desig) => (
                            <div
                              key={desig._id}
                              className="flex items-center justify-between p-3 bg-white border border-[#B3CFE5]/50 rounded hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-[#0A1931]">{desig.name}</div>
                                <div className="text-xs text-[#70757A]">{desig.description || "—"}</div>
                                <div className="flex gap-2 mt-1">
                                  <Badge className="bg-purple-50 border border-purple-300 text-purple-700 text-xs px-2 py-0.5">
                                    {desig.level || "mid"}
                                  </Badge>
                                  {desig.salary > 0 && (
                                    <span className="text-xs text-[#137333] font-medium">₹{desig.salary.toLocaleString()}</span>
                                  )}
                                </div>
                              </div>

                              {canManage && (
                                <div className="flex gap-2 ml-2">
                                  <Button
                                    onClick={() => {
                                      setSelectedDeptId(dept._id);
                                      handleEditDesig(desig);
                                    }}
                                    variant="ghost"
                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedDeptId(dept._id);
                                      handleDeleteDesig(desig._id);
                                    }}
                                    variant="ghost"
                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Department Modal */}
      <Modal
        open={deptModalOpen}
        onClose={() => {
          setDeptModalOpen(false);
          setEditingDept(null);
        }}
        title={editingDept ? "Edit Department" : "Add Department"}
      >
        <form onSubmit={handleSubmitDept} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">Department Name *</label>
            <Input
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g., Engineering, Sales, HR"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">Description</label>
            <textarea
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Department description..."
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm font-normal text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#137333]"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Department Head</label>
              <Input
                value={deptForm.headName}
                onChange={(e) => setDeptForm({ ...deptForm, headName: e.target.value })}
                placeholder="Head name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Email</label>
              <Input
                type="email"
                value={deptForm.email}
                onChange={(e) => setDeptForm({ ...deptForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Phone</label>
              <Input
                value={deptForm.phone}
                onChange={(e) => setDeptForm({ ...deptForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>

            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={() => {
                setDeptModalOpen(false);
                setEditingDept(null);
              }}
              variant="ghost"
              className="text-[#70757A] hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#137333] hover:bg-[#0d5628] text-white">
              {editingDept ? "Update" : "Create"} Department
            </Button>
          </div>
        </form>
      </Modal>

      {/* Designation Modal */}
      <Modal
        open={desigModalOpen}
        onClose={() => {
          setDesigModalOpen(false);
          setEditingDesig(null);
        }}
        title={editingDesig ? "Edit Designation" : "Add Designation"}
      >
        <form onSubmit={handleSubmitDesig} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">Designation Name *</label>
            <Input
              value={desigForm.name}
              onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })}
              placeholder="e.g., Senior Developer, Product Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#0A1931] mb-2">Description</label>
            <textarea
              value={desigForm.description}
              onChange={(e) => setDesigForm({ ...desigForm, description: e.target.value })}
              placeholder="Designation description..."
              className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm font-normal text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#137333]"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Level</label>
              <select
                value={desigForm.level}
                onChange={(e) => setDesigForm({ ...desigForm, level: e.target.value })}
                className="w-full px-3 py-2 border border-[#B3CFE5] rounded-lg text-sm"
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior Level</option>
                <option value="lead">Lead</option>
                <option value="manager">Manager</option>
                <option value="director">Director</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0A1931] mb-2">Salary (₹)</label>
              <Input
                type="number"
                value={desigForm.salary}
                onChange={(e) => setDesigForm({ ...desigForm, salary: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              onClick={() => {
                setDesigModalOpen(false);
                setEditingDesig(null);
              }}
              variant="ghost"
              className="text-[#70757A] hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-[#137333] hover:bg-[#0d5628] text-white">
              {editingDesig ? "Update" : "Create"} Designation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
