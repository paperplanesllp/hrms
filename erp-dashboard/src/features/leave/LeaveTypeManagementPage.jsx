import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Badge from "../../components/ui/Badge.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { Trash2, Edit2, Plus } from "lucide-react";

export default function LeaveTypeManagementPage() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    color: "#3b82f6",
    icon: "calendar",
    maxDaysPerYear: 5,
    requiresApproval: true
  });

  /* ---- LOAD LEAVE TYPES ---- */
  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/leave-types");
      setItems(res.data.data || []);
    } catch (err) {
      toast({ title: "Failed to load leave types", type: "error" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ---- CREATE/UPDATE LEAVE TYPE ---- */
  const saveLeaveType = async () => {
    try {
      if (!form.name.trim()) {
        toast({ title: "Leave type name is required", type: "error" });
        return;
      }

      setSaving(true);

      if (editingId) {
        // Update
        await api.patch(`/leave-types/${editingId}`, form);
        toast({ title: "Leave type updated successfully", type: "success" });
      } else {
        // Create
        await api.post("/leave-types", form);
        toast({ title: "Leave type created successfully", type: "success" });
      }

      setOpen(false);
      setEditingId(null);
      setForm({
        name: "",
        description: "",
        color: "#3b82f6",
        icon: "calendar",
        maxDaysPerYear: 5,
        requiresApproval: true
      });
      load();
    } catch (err) {
      toast({ title: err?.response?.data?.message || "Operation failed", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ---- DELETE LEAVE TYPE ---- */
  const deleteLeaveType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave type?")) return;

    try {
      await api.delete(`/leave-types/${id}`);
      toast({ title: "Leave type deleted successfully", type: "success" });
      load();
    } catch (err) {
      toast({ title: "Failed to delete leave type", type: "error" });
    }
  };

  /* ---- EDIT LEAVE TYPE ---- */
  const editLeaveType = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      description: item.description,
      color: item.color,
      icon: item.icon,
      maxDaysPerYear: item.maxDaysPerYear,
      requiresApproval: item.requiresApproval
    });
    setOpen(true);
  };

  /* ---- CLOSE MODAL ---- */
  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      color: "#3b82f6",
      icon: "calendar",
      maxDaysPerYear: 5,
      requiresApproval: true
    });
  };

  /* ---- COLOR OPTIONS ---- */
  const colors = [
    { value: "#ef4444", label: "Red" },
    { value: "#f97316", label: "Orange" },
    { value: "#eab308", label: "Yellow" },
    { value: "#22c55e", label: "Green" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#8b5cf6", label: "Purple" },
    { value: "#ec4899", label: "Pink" },
    { value: "#64748b", label: "Gray" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageTitle>Leave Type Management</PageTitle>
        <Button
          onClick={() => {
            setEditingId(null);
            setForm({
              name: "",
              description: "",
              color: "#3b82f6",
              icon: "calendar",
              maxDaysPerYear: 5,
              requiresApproval: true
            });
            setOpen(true);
          }}
          className="gap-2"
        >
          <Plus size={18} />
          New Leave Type
        </Button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading leave types...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-slate-500">No leave types found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Max Days/Year
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Requires Approval
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item._id}
                    className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {item.description || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.maxDaysPerYear}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.requiresApproval ? (
                        <Badge className="text-blue-700 bg-blue-100 border-blue-200">
                          Yes
                        </Badge>
                      ) : (
                        <Badge className="text-green-700 bg-green-100 border-green-200">
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editLeaveType(item)}
                          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-700"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => deleteLeaveType(item._id)}
                          className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-slate-700"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---- MODAL ---- */}
      <Modal open={open} onOpenChange={closeModal} title={editingId ? "Edit Leave Type" : "New Leave Type"}>
        <div className="space-y-4">
          <Input
            label="Leave Type Name"
            placeholder="e.g., Sick Leave"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="Description"
            placeholder="e.g., For medical purposes"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Color
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setForm({ ...form, color: color.value })}
                  className="p-3 rounded border-2 transition-all"
                  style={{
                    backgroundColor: color.value,
                    borderColor: form.color === color.value ? "#000" : "transparent",
                    opacity: form.color === color.value ? 1 : 0.6
                  }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <Input
            label="Max Days Per Year"
            type="number"
            min="1"
            max="365"
            value={form.maxDaysPerYear}
            onChange={(e) => setForm({ ...form, maxDaysPerYear: parseInt(e.target.value) })}
          />

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresApproval}
                onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                Requires HR Approval
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={saveLeaveType}
              loading={saving}
              className="flex-1"
            >
              {editingId ? "Update" : "Create"}
            </Button>
            <Button
              onClick={closeModal}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
