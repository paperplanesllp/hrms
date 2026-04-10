import React, { useEffect, useState, useMemo } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import GoogleMapSelector from "../../components/ui/GoogleMapSelector.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { usePresenceStore } from "../../store/presenceStore.js";
import { ROLES } from "../../app/constants.js";
import { getSocket } from "../../lib/socket.js";
import { getDerivedPresenceStatus, getAvatarDotStyle, formatExactTimestamp } from "../../lib/presenceUtils.js";
import { 
  Users, 
  Shield, 
  UserCheck, 
  Briefcase, 
  Search, 
  Plus, 
  Eye,
  Pencil,
  User,
  Mail,
  Phone,
  Heart,
  MapPin,
  Droplet,
  Lock,
  X,
  Sparkles,
  Calendar,
  Users2,
  UserPlus,
  Building2
} from "lucide-react";

// Helper function to format date to DD/MM/YY
const formatDateForDisplay = (dateString) => {
  if (!dateString) return "";
  
  try {
    let date;
    
    // Handle ISO 8601 format (e.g., "2006-03-20T00:00:00.000Z")
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } 
    // Handle YYYY-MM-DD format
    else if (dateString.includes('-')) {
      const [year, month, day] = dateString.split("-");
      date = new Date(year, month - 1, day);
    }
    // Handle DD/MM/YYYY or DD/MM/YY format
    else if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        date = new Date(year, month - 1, day);
      }
    }
    
    if (isNaN(date)) return dateString; // Return original if can't parse
    
    // Format as DD/MM/YY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // Last 2 digits
    
    return `${day}/${month}/${year}`;
  } catch (err) {
    return dateString; // Return original on error
  }
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const socket = getSocket();
  const presenceUsers = usePresenceStore(s => s.users);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterPresence, setFilterPresence] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loadingDesignations, setLoadingDesignations] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: ROLES.USER,
    gender: "",
    dateOfBirth: "",
    emergencyContact: "",
    profilePhoto: null,
    maritalStatus: "",
    nationality: "",
    bloodGroup: "",
    departmentId: "",
    designationId: "",
  });
  const [companyLocation, setCompanyLocation] = useState({ latitude: 0, longitude: 0 });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [pendingTemporaryUsers, setPendingTemporaryUsers] = useState([]);
  const [pendingActionId, setPendingActionId] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertDesignations, setConvertDesignations] = useState([]);
  const [convertLoadingDesignations, setConvertLoadingDesignations] = useState(false);
  const [convertForm, setConvertForm] = useState({
    employeeId: "",
    departmentId: "",
    designationId: "",
    salaryBand: "",
    joiningDate: "",
  });
  const [showApproveLocationModal, setShowApproveLocationModal] = useState(false);
  const [approvingTempUser, setApprovingTempUser] = useState(null);
  const [approvalLocation, setApprovalLocation] = useState({ latitude: 0, longitude: 0 });
  const [editDesignations, setEditDesignations] = useState([]);
  const [editLoadingDesignations, setEditLoadingDesignations] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", email: "", phone: "", gender: "", dateOfBirth: "",
    emergencyContact: "", maritalStatus: "", nationality: "", bloodGroup: "",
    departmentId: "", designationId: "", role: ROLES.USER,
  });

  // Presence comes from the global presenceStore (kept in sync by SocketProvider)
  const getProfilePresence = (userId) => {
    const presence = getDerivedPresenceStatus(presenceUsers[userId]);
    const data = presenceUsers[userId];
    const rawDate = presence.status === 'offline' ? data?.lastSeen : presence.status === 'away' ? data?.lastActivityAt : null;
    const exactTooltip = rawDate ? `Last active on ${formatExactTimestamp(rawDate)}` : '';
    const dotStyle = getAvatarDotStyle(presence.status);
    let label = presence.label;
    if (presence.status === 'offline' && presence.lastSeen && presence.lastSeen !== 'never') {
      label = `Last seen ${presence.lastSeen}`;
    }
    return { ...presence, label, exactTooltip, dotBg: dotStyle.bg, dotRing: dotStyle.ring, dotPulse: dotStyle.pulse };
  };

  const openProfileModal = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "",
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
      emergencyContact: user.emergencyContact || "",
      maritalStatus: user.maritalStatus || "",
      nationality: user.nationality || "",
      bloodGroup: user.bloodGroup || "",
      departmentId: user.departmentId?.toString() || "",
      designationId: user.designationId?.toString() || "",
      role: user.role || ROLES.USER,
    });
    if (user.departmentId) {
      loadEditDesignations(user.departmentId.toString());
    } else {
      setEditDesignations([]);
    }
    setShowEditModal(true);
  };

  const loadEditDesignations = async (departmentId) => {
    if (!departmentId) { setEditDesignations([]); return; }
    try {
      setEditLoadingDesignations(true);
      const res = await api.get(`/department/designation/department/${departmentId}`);
      setEditDesignations(res.data || []);
    } catch (err) {
      console.error("Error loading designations:", err);
      setEditDesignations([]);
    } finally {
      setEditLoadingDesignations(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        emergencyContact: editForm.emergencyContact,
        nationality: editForm.nationality,
        departmentId: editForm.departmentId || null,
        designationId: editForm.designationId || null,
      };
      if (editForm.gender) payload.gender = editForm.gender;
      if (editForm.maritalStatus) payload.maritalStatus = editForm.maritalStatus;
      if (editForm.bloodGroup) payload.bloodGroup = editForm.bloodGroup;
      if (editForm.dateOfBirth) payload.dateOfBirth = editForm.dateOfBirth;
      if (currentUser?.role === ROLES.ADMIN && editForm.role) payload.role = editForm.role;

      const res = await api.patch(`/users/${editUser._id}`, payload);
      setItems((prev) => prev.map((u) => u._id === editUser._id ? res.data.user : u));
      toast({ title: "Employee updated successfully", type: "success" });
      setShowEditModal(false);
    } catch (err) {
      toast({
        title: "Failed to update employee",
        message: err?.response?.data?.message || "Please check your information and try again.",
        type: "error",
      });
    } finally {
      setEditLoading(false);
    }
  };

  const loadCompanyLocation = async () => {
    try {
      const res = await api.get("/admin/company-location");
      const nextLocation = {
        latitude: res.data.latitude || 0,
        longitude: res.data.longitude || 0
      };
      setCompanyLocation(nextLocation);
      return nextLocation;
    } catch (err) {
      console.error("Error loading company location:", err);
      const fallback = { latitude: 0, longitude: 0 };
      setCompanyLocation(fallback);
      return fallback;
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await api.get("/department");
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Error loading departments:", err);
    }
  };

  const loadDesignations = async (departmentId) => {
    if (!departmentId) {
      setDesignations([]);
      return;
    }
    try {
      setLoadingDesignations(true);
      const res = await api.get(`/department/designation/department/${departmentId}`);
      setDesignations(res.data || []);
    } catch (err) {
      console.error("Error loading designations:", err);
      setDesignations([]);
    } finally {
      setLoadingDesignations(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const canManageTemporaryApprovals =
        currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.HR;

      const requests = [api.get("/users")];
      if (canManageTemporaryApprovals) {
        requests.push(api.get("/users/temporary/pending"));
      }

      const [usersRes, pendingRes] = await Promise.all(requests);
      setItems(usersRes?.data || []);
      setPendingTemporaryUsers(pendingRes?.data || []);
    } catch (err) {
      console.error("Error loading users:", err);
      const message = err.response?.status === 403 
        ? "Access denied. You don't have permission to view users."
        : err.response?.status === 401
        ? "Session expired. Please log in again."
        : "Failed to load users. Please try again.";
      toast({ title: message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleTemporaryApprovalAction = async (userId, action) => {
    setPendingActionId(`${action}:${userId}`);
    try {
      await api.patch(`/users/temporary/${userId}/${action}`);
      toast({
        title: action === "approve" ? "Associate approved" : "Associate rejected",
        type: "success",
      });
      await load();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || `Failed to ${action} associate`,
        type: "error",
      });
    } finally {
      setPendingActionId("");
    }
  };

  const openApproveLocationModal = async (user) => {
    const location = await loadCompanyLocation();
    setApprovingTempUser(user);
    setApprovalLocation(location);
    setShowApproveLocationModal(true);
  };

  const handleApproveWithLocation = async () => {
    if (!approvingTempUser?._id) return;

    setPendingActionId(`approve:${approvingTempUser._id}`);
    try {
      await api.patch(`/users/temporary/${approvingTempUser._id}/approve`, {
        officeLatitude: approvalLocation.latitude,
        officeLongitude: approvalLocation.longitude,
      });

      toast({ title: "Associate approved with office location", type: "success" });
      setShowApproveLocationModal(false);
      setApprovingTempUser(null);
      await load();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to approve associate",
        type: "error",
      });
    } finally {
      setPendingActionId("");
    }
  };

  const loadConvertDesignations = async (departmentId) => {
    if (!departmentId) {
      setConvertDesignations([]);
      return;
    }

    try {
      setConvertLoadingDesignations(true);
      const res = await api.get(`/department/designation/department/${departmentId}`);
      setConvertDesignations(res.data || []);
    } catch (err) {
      console.error("Error loading conversion designations:", err);
      setConvertDesignations([]);
    } finally {
      setConvertLoadingDesignations(false);
    }
  };

  const openConvertModal = async (user) => {
    if (!departments.length) {
      await loadDepartments();
    }

    const nextForm = {
      employeeId: user.employeeId || "",
      departmentId: user.departmentId?.toString?.() || user.departmentId || "",
      designationId: user.designationId?.toString?.() || user.designationId || "",
      salaryBand: user.salaryBand || "",
      joiningDate: user.joiningDate ? new Date(user.joiningDate).toISOString().split("T")[0] : "",
    };

    setConvertForm(nextForm);
    if (nextForm.departmentId) {
      await loadConvertDesignations(nextForm.departmentId);
    } else {
      setConvertDesignations([]);
    }

    setShowConvertModal(true);
  };

  const handleConvertToPermanent = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;

    setConvertLoading(true);
    try {
      await api.patch(`/users/temporary/${selectedUser._id}/convert-permanent`, {
        employeeId: convertForm.employeeId,
        departmentId: convertForm.departmentId,
        designationId: convertForm.designationId,
        salaryBand: convertForm.salaryBand,
        joiningDate: convertForm.joiningDate,
      });

      toast({
        title: "Converted to permanent staff",
        message: `${selectedUser.name} is now a permanent employee`,
        type: "success",
      });

      setShowConvertModal(false);
      setShowProfileModal(false);
      setSelectedUser(null);
      await load();
    } catch (err) {
      toast({
        title: err?.response?.data?.message || "Failed to convert user to permanent",
        type: "error",
      });
    } finally {
      setConvertLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    
    try {
      await api.post("/users", {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        password: createForm.password,
        role: createForm.role,
        gender: createForm.gender,
        dateOfBirth: createForm.dateOfBirth,
        emergencyContact: createForm.emergencyContact,
        maritalStatus: createForm.maritalStatus,
        nationality: createForm.nationality,
        bloodGroup: createForm.bloodGroup,
        departmentId: createForm.departmentId || null,
        designationId: createForm.designationId || null,
        officeLatitude: companyLocation.latitude,
        officeLongitude: companyLocation.longitude,
      });
      
      toast({
        title: "User created successfully",
        message: `${createForm.name} has been added to the system`,
        type: "success",
      });
      
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: ROLES.USER,
        gender: "",
        dateOfBirth: "",
        emergencyContact: "",
        profilePhoto: null,
        maritalStatus: "",
        nationality: "",
        bloodGroup: "",
        departmentId: "",
        designationId: "",
      });
      load(); // Refresh the list
    } catch (err) {
      toast({
        title: "Failed to create user",
        message: err?.response?.data?.message || "Please check your information",
        type: "error",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadDepartments();
  }, []);

  // Presence counts (recompute when items or status map changes)
  const presenceCounts = useMemo(() => {
    let online = 0, away = 0, offline = 0;
    items.forEach(u => {
      const p = getDerivedPresenceStatus(presenceUsers[u._id]);
      if (['online', 'active-now', 'active-recently', 'typing'].includes(p.status)) online++;
      else if (p.status === 'away') away++;
      else offline++;
    });
    return { online, away, offline };
  }, [items, presenceUsers]);

  // Filter logic
  const filteredItems = items.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    if (!matchesSearch || !matchesRole) return false;
    if (!filterPresence) return true;
    const p = getDerivedPresenceStatus(presenceUsers[user._id]);
    if (filterPresence === 'online') return ['online', 'active-now', 'active-recently', 'typing'].includes(p.status);
    if (filterPresence === 'away') return p.status === 'away';
    if (filterPresence === 'offline') return p.status === 'offline' || p.status === 'unknown';
    return true;
  });

  // Load designations when department changes
  const handleDepartmentChange = (departmentId) => {
    setCreateForm({ ...createForm, departmentId, designationId: "" });
    if (departmentId) {
      loadDesignations(departmentId);
    } else {
      setDesignations([]);
    }
  };

  // Calculate role stats
  const stats = {
    total: items.length,
    admins: items.filter(u => u.role === ROLES.ADMIN).length,
    hr: items.filter(u => u.role === ROLES.HR).length,
    employees: items.filter(u => u.role === ROLES.USER).length
  };

  // Get role colors
  const getRoleColor = (role) => {
    switch(role) {
      case ROLES.ADMIN:
        return { bg: "bg-red-50", border: "border-red-300", text: "text-red-700", icon: Shield };
      case ROLES.HR:
        return { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", icon: UserCheck };
      case ROLES.USER:
        return { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", icon: Briefcase };
      default:
        return { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", icon: Users };
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Staff Directory"
          subtitle={currentUser?.role === ROLES.HR 
            ? "View and manage employee staff members."
            : "Global view of all staff members with full Read/Write access. Manage roles and permissions."
          }
        />
        {(currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.HR) && (
          <Button
            onClick={async () => {
              await loadCompanyLocation();
              setShowCreateModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Staff Member
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {currentUser?.role === ROLES.ADMIN ? (
          <>
            <Card className="p-6 border-l-4 border-l-[#4A7FA7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Staff</p>
                  <p className="text-3xl font-bold text-[#4A7FA7] mt-1">{stats.total}</p>
                </div>
                <Users className="w-6 h-6 text-[#4A7FA7] opacity-30" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-red-500 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Admins</p>
                  <p className="mt-1 text-3xl font-bold text-red-600">{stats.admins}</p>
                </div>
                <Shield className="w-6 h-6 text-red-600 opacity-30" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-blue-500 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">HR Staff</p>
                  <p className="mt-1 text-3xl font-bold text-blue-600">{stats.hr}</p>
                </div>
                <UserCheck className="w-6 h-6 text-blue-600 opacity-30" />
              </div>
            </Card>

            <Card className="p-6 border-l-4 border-l-[#137333] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Employees</p>
                  <p className="text-3xl font-bold text-[#137333] mt-1">{stats.employees}</p>
                </div>
                <Briefcase className="w-6 h-6 text-[#137333] opacity-30" />
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-6 border-l-4 border-l-[#137333] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] md:col-span-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#70757A] uppercase tracking-wide">Total Employees</p>
                <p className="text-3xl font-bold text-[#137333] mt-1">{stats.employees}</p>
              </div>
              <Briefcase className="w-6 h-6 text-[#137333] opacity-30" />
            </div>
          </Card>
        )}
      </div>

      {(currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.HR) && (
        <Card className="p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#0A1931]">Associate Registrations</h3>
              <p className="text-sm text-[#70757A]">Pending self-registrations waiting for HR approval</p>
            </div>
            <Badge className="bg-amber-100 text-amber-700 border border-amber-300">
              Pending: {pendingTemporaryUsers.length}
            </Badge>
          </div>

          {pendingTemporaryUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#B3CFE5] px-4 py-6 text-sm text-[#70757A]">
              No pending associate registrations.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#B3CFE5]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F6FAFD] text-[#0A1931]">
                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                    <th className="px-4 py-3 text-left font-semibold">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                    <th className="px-4 py-3 text-left font-semibold">Registered</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTemporaryUsers.map((user) => (
                    <tr key={user._id} className="border-t border-[#E3EEF8]">
                      <td className="px-4 py-3 font-medium text-[#0A1931]">{user.name}</td>
                      <td className="px-4 py-3 text-[#1A3D63]">{user.phone || "-"}</td>
                      <td className="px-4 py-3 text-[#1A3D63]">{user.email || "-"}</td>
                      <td className="px-4 py-3 text-[#70757A]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => openApproveLocationModal(user)}
                            disabled={pendingActionId.length > 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {pendingActionId === `approve:${user._id}` ? "Approving..." : "Approve + Set Location"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleTemporaryApprovalAction(user._id, "reject")}
                            disabled={pendingActionId.length > 0}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {pendingActionId === `reject:${user._id}` ? "Rejecting..." : "Reject"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Search & Filter Controls */}
      <Card className="p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-[#70757A]" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border border-[#B3CFE5] rounded-lg focus:border-[#4A7FA7]"
            />
          </div>

          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border border-[#B3CFE5] rounded-lg focus:border-[#4A7FA7] bg-white text-[#0A1931] font-medium"
              disabled={currentUser?.role === ROLES.HR}
            >
              {currentUser?.role === ROLES.HR ? (
                <>
                  <option value="">All Employees</option>
                  <option value={ROLES.USER}>Employees</option>
                </>
              ) : (
                <>
                  <option value="">All Roles</option>
                  <option value={ROLES.ADMIN}>Admin Only</option>
                  <option value={ROLES.HR}>HR Only</option>
                  <option value={ROLES.USER}>Employees Only</option>
                </>
              )}
            </select>
          </div>

          <Button
            onClick={load}
            disabled={loading}
            className="bg-[#4A7FA7] hover:bg-[#3a5f87] text-white shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </Card>

      {/* Presence Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: '', label: 'All', count: items.length },
          { key: 'online', label: 'Online', count: presenceCounts.online, dot: 'bg-green-500' },
          { key: 'away', label: 'Away', count: presenceCounts.away, dot: 'bg-amber-500' },
          { key: 'offline', label: 'Offline', count: presenceCounts.offline, dot: 'bg-slate-400' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterPresence(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              filterPresence === tab.key
                ? 'bg-[#0A1931] text-white border-[#0A1931]'
                : 'bg-white text-[#1A3D63] border-[#B3CFE5] hover:bg-[#F6FAFD]'
            }`}
          >
            {tab.dot && <span className={`w-2 h-2 rounded-full ${tab.dot}${filterPresence === tab.key ? ' ring-1 ring-white/50' : ''}`}></span>}
            {tab.label}
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              filterPresence === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>{tab.count}</span>
          </button>
        ))}

        {presenceCounts.online > 0 && (
          <span className="ml-auto text-sm text-green-700 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {presenceCounts.online} online now
          </span>
        )}
      </div>

      {/* Staff Table */}
      <Card className="p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-x-auto">
        <h3 className="text-lg font-semibold text-[#0A1931] mb-4">Staff Members ({filteredItems.length})</h3>
        <div className="border border-[#B3CFE5] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0A1931] text-red-500">
                <th className="px-6 py-4 font-semibold text-left">Name</th>
                <th className="px-6 py-4 font-semibold text-left">Email</th>
                <th className="px-6 py-4 font-semibold text-left">Role</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#70757A]">Loading staff...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[#70757A]">No staff members found</td>
                </tr>
              ) : (
                filteredItems.map((user, idx) => {
                  const roleColor = getRoleColor(user.role);
                  return (
                    <tr key={user._id} className={`border-t border-[#B3CFE5] hover:bg-[#E6F4EA]/10 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F6FAFD]'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0A1931] to-[#1A3D63] grid place-items-center text-white font-semibold text-sm">
                            {user.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#0A1931]">{user.name}</p>
                            <p className="text-xs text-[#70757A]">{user._id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#1A3D63]">{user.email}</td>
                      <td className="px-6 py-4">
                        <Badge className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${roleColor.bg} ${roleColor.border} ${roleColor.text}`}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {(() => {
                          const p = getProfilePresence(user._id);
                          const badgeMap = {
                            'active-now': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
                            'active-recently': { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', dot: 'bg-green-500' },
                            online: { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                            typing: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-500' },
                            away: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', dot: 'bg-amber-500' },
                            offline: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-600', dot: 'bg-slate-400' },
                          };
                          const s = badgeMap[p.status] || badgeMap.offline;
                          return (
                            <Badge className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.border} ${s.text}`}
                                   title={p.exactTooltip}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></span>
                              {p.label}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => openProfileModal(user)}
                            className="bg-[#4A7FA7] hover:bg-[#3a5f87] text-white border-0 shadow-sm flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Profile
                          </Button>
                          {(currentUser?.role === ROLES.ADMIN || (currentUser?.role === ROLES.HR && user.role === ROLES.USER)) && (
                            <Button
                              size="sm"
                              onClick={() => openEditModal(user)}
                              className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-sm flex items-center gap-1.5"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approve Associate with Location Modal */}
      {showApproveLocationModal && approvingTempUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-[24px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            <div className="relative p-6 overflow-hidden bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
              <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 rounded-full bg-white/20 blur-2xl" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-11 h-11 border rounded-xl bg-white/20 border-white/40">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Approve Associate</h3>
                    <p className="text-sm text-emerald-100/90">
                      Select office location for {approvingTempUser.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowApproveLocationModal(false);
                    setApprovingTempUser(null);
                  }}
                  className="p-2 transition rounded-lg text-white/90 hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <p className="text-sm text-slate-600">
                HR must choose office latitude and longitude before approving this associate.
              </p>

              <GoogleMapSelector
                latitude={approvalLocation.latitude}
                longitude={approvalLocation.longitude}
                onLocationSelect={(location) => {
                  setApprovalLocation({
                    latitude: location.latitude,
                    longitude: location.longitude,
                  });
                }}
                markerLabel={`Office location for ${approvingTempUser.name}`}
              />

              <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                <p className="text-sm font-semibold text-green-900">Selected Coordinates</p>
                <p className="text-sm text-green-800 mt-1">
                  Latitude: {approvalLocation.latitude || 0}
                </p>
                <p className="text-sm text-green-800">
                  Longitude: {approvalLocation.longitude || 0}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowApproveLocationModal(false);
                    setApprovingTempUser(null);
                  }}
                  className="flex-1 border rounded-xl border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleApproveWithLocation}
                  disabled={pendingActionId === `approve:${approvingTempUser._id}`}
                  className="flex-1 rounded-xl bg-green-600 text-white hover:bg-green-700"
                >
                  {pendingActionId === `approve:${approvingTempUser._id}`
                    ? "Approving..."
                    : "Approve with Location"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal - Premium Design */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-[28px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            {/* Premium Header */}
            <div className="relative sticky top-0 z-10 p-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
              <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 rounded-full bg-emerald-500/20 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-40 h-40 -mb-20 -ml-20 rounded-full bg-blue-500/10 blur-3xl" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center justify-center w-12 h-12 border rounded-xl bg-emerald-500/20 border-emerald-500/40">
                      <UserPlus className="w-6 h-6 text-emerald-300" />
                    </div>
                    <h2 className="text-3xl font-bold text-white">Add Staff Member</h2>
                  </div>
                  <p className="mt-1 text-sm text-emerald-100/80 ml-15">
                    {currentUser?.role === ROLES.ADMIN && "✨ Create admin, HR, or employee accounts"}
                    {currentUser?.role === ROLES.HR && "✨ Create new employee accounts and manage profiles"}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 transition-colors rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Basic Information Section */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-slate-50 to-emerald-50/30">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-emerald-600/10 border-emerald-600/20">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Basic Information</h4>
                </div>
                
                <div>
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5">Gender</label>
                    <select
                      value={createForm.gender}
                      onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={createForm.dateOfBirth}
                      onChange={(e) => setCreateForm({ ...createForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-blue-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-blue-600/10 border-blue-600/20">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Contact Information</h4>
                </div>
                
                <div>
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="john@company.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    required
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                  />

                  <Input
                    label="Emergency Contact"
                    placeholder="+1 (555) 000-0001"
                    value={createForm.emergencyContact}
                    onChange={(e) => setCreateForm({ ...createForm, emergencyContact: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Personal Details Section */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-purple-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-purple-600/10 border-purple-600/20">
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Personal Details</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Marital Status</label>
                  <select
                    value={createForm.maritalStatus}
                    onChange={(e) => setCreateForm({ ...createForm, maritalStatus: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nationality"
                    placeholder="Indian"
                    value={createForm.nationality}
                    onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-purple-500"
                  />

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-red-500" />
                      Blood Group
                    </label>
                    <select
                      value={createForm.bloodGroup}
                      onChange={(e) => setCreateForm({ ...createForm, bloodGroup: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    >
                      <option value="">Blood Group</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization Section */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-cyan-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-cyan-600/10 border-cyan-600/20">
                    <Building2 className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Organization</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Department</label>
                  <select
                    value={createForm.departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Designation</label>
                  <select
                    value={createForm.designationId}
                    onChange={(e) => setCreateForm({ ...createForm, designationId: e.target.value })}
                    disabled={!createForm.departmentId || loadingDesignations}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">
                      {loadingDesignations
                        ? "Loading designations..."
                        : !createForm.departmentId
                        ? "Select a department first"
                        : "Select Designation"}
                    </option>
                    {designations.map((desig) => (
                      <option key={desig._id} value={desig._id}>
                        {desig.name} ({desig.level})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Office Location Section - Map Integration */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-green-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-green-600/10 border-green-600/20">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Office Location</h4>
                </div>
                
                <p className="mb-3 text-sm text-slate-600">
                  Employee will be assigned the company office location. Click on the map to verify/adjust.
                </p>

                <GoogleMapSelector
                  latitude={companyLocation.latitude}
                  longitude={companyLocation.longitude}
                  onLocationSelect={(location) => {
                    setCompanyLocation({
                      latitude: location.latitude,
                      longitude: location.longitude
                    });
                  }}
                  markerLabel="Company Office Location"
                />

                <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                  <p className="text-sm font-medium text-green-900">📍 Office Coordinates:</p>
                  <p className="mt-2 text-sm text-green-800">
                    <strong>Latitude:</strong> {companyLocation.latitude || "Not set"}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Longitude:</strong> {companyLocation.longitude || "Not set"}
                  </p>
                </div>
              </div>

              {/* Account Settings Section */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-orange-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-orange-600/10 border-orange-600/20">
                    <Users2 className="w-5 h-5 text-orange-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Account Settings</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    {currentUser?.role === ROLES.ADMIN && (
                      <>
                        <option value={ROLES.ADMIN}>👑 Admin</option>
                        <option value={ROLES.HR}>💼 HR Manager</option>
                      </>
                    )}
                    <option value={ROLES.USER}>👤 Employee</option>
                  </select>
                </div>

                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={8}
                  className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-orange-500"
                />
                <div className="ml-1 space-y-1 text-xs text-slate-500">
                  <p>✓ Minimum 8 characters required</p>
                  <p className={createForm.password?.match(/[A-Z]/) ? "text-green-600 font-medium" : ""}>✓ At least one uppercase letter</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 flex gap-3 pt-6 bg-white border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 font-semibold transition-all duration-200 border rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLoading}
                  className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-all duration-200 shadow-lg rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Staff Member
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-[28px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            {/* Modal Header with Background */}
            <div className="relative sticky top-0 z-10 p-8 overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-600">
              <div className="absolute top-0 right-0 w-40 h-40 -mt-20 -mr-20 rounded-full bg-white/10 blur-3xl" />
              
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'E'}
                    </div>
                    {/* Live presence dot */}
                    {(() => {
                      const p = getProfilePresence(selectedUser._id);
                      return <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-[2.5px] border-blue-500 transition-colors duration-300 ${p.dotBg} ring-2 ${p.dotRing}${p.dotPulse ? ' animate-pulse' : ''}`}></div>;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedUser.name}</h2>
                    <p className="text-blue-100 text-sm mt-1">{selectedUser.role}</p>
                    {/* Live presence label */}
                    {(() => {
                      const p = getProfilePresence(selectedUser._id);
                      return (
                        <p className="text-sm mt-1 text-blue-50 font-medium" title={p.exactTooltip}>
                          {p.label}
                          {p.exactTooltip && <span className="ml-2 text-xs text-blue-200/80">({p.exactTooltip})</span>}
                        </p>
                      );
                    })()}
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 transition-colors rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Contact Information */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-blue-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-blue-600/10 border-blue-600/20">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Contact Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</p>
                    <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.phone || 'N/A'}</p>
                  </div>
                  {selectedUser.emergencyContact && (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Emergency Contact</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.emergencyContact}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-purple-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-purple-600/10 border-purple-600/20">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {selectedUser.gender && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gender</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.gender}</p>
                    </div>
                  )}
                  {selectedUser.dateOfBirth && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date of Birth</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{formatDateForDisplay(selectedUser.dateOfBirth)}</p>
                    </div>
                  )}
                  {selectedUser.maritalStatus && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Marital Status</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.maritalStatus}</p>
                    </div>
                  )}
                  {selectedUser.nationality && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nationality</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.nationality}</p>
                    </div>
                  )}
                  {selectedUser.bloodGroup && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                        <Droplet className="w-3 h-3" /> Blood Group
                      </p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.bloodGroup}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Organization Information */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-green-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-green-600/10 border-green-600/20">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Organization</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</p>
                    <Badge className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${
                      selectedUser.role === ROLES.ADMIN 
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : selectedUser.role === ROLES.HR
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-green-50 border-green-300 text-green-700'
                    }`}>
                      {selectedUser.role}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Presence</p>
                    {(() => {
                      const p = getProfilePresence(selectedUser._id);
                      const badgeColors = {
                        'active-now': 'bg-green-50 border-green-300 text-green-700',
                        'active-recently': 'bg-green-50 border-green-300 text-green-700',
                        online: 'bg-emerald-50 border-emerald-300 text-emerald-700',
                        away: 'bg-amber-50 border-amber-300 text-amber-700',
                        offline: 'bg-slate-50 border-slate-300 text-slate-600',
                        typing: 'bg-blue-50 border-blue-300 text-blue-700',
                      };
                      return (
                        <Badge className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${badgeColors[p.status] || badgeColors.offline}`}
                               title={p.exactTooltip}>
                          {p.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account Type</p>
                    <Badge
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${
                        selectedUser.accountType === "TEMPORARY"
                          ? "bg-amber-50 border-amber-300 text-amber-700"
                          : "bg-emerald-50 border-emerald-300 text-emerald-700"
                      }`}
                    >
                      {selectedUser.accountType === "TEMPORARY" ? "ASSOCIATE" : selectedUser.accountType || "EMPLOYEE"}
                    </Badge>
                  </div>
                  {selectedUser.accountType === "TEMPORARY" && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Associate Approval</p>
                      <Badge
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-1 ${
                          selectedUser.approvalStatus === "APPROVED"
                            ? "bg-green-50 border-green-300 text-green-700"
                            : selectedUser.approvalStatus === "REJECTED"
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-amber-50 border-amber-300 text-amber-700"
                        }`}
                      >
                        {selectedUser.approvalStatus || "PENDING"}
                      </Badge>
                    </div>
                  )}
                  {selectedUser.department && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.department?.name || 'N/A'}</p>
                    </div>
                  )}
                  {selectedUser.designation && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Designation</p>
                      <p className="text-base font-medium text-slate-900 mt-1">{selectedUser.designation?.name || 'N/A'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information */}
              <div className="p-6 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-amber-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-amber-600/10 border-amber-600/20">
                    <Shield className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Account Information</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">User ID</p>
                    <p className="text-base font-medium text-slate-900 mt-1 font-mono">{selectedUser._id?.substring(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Account Status</p>
                    {(() => {
                      const p = getProfilePresence(selectedUser._id);
                      const dotColor = p.status === 'offline' ? 'bg-slate-400' : p.status === 'away' ? 'bg-amber-500' : 'bg-green-500';
                      const textColor = p.status === 'offline' ? 'text-slate-600' : p.status === 'away' ? 'text-amber-700' : 'text-green-700';
                      return (
                        <div className="flex items-center gap-2 mt-1" title={p.exactTooltip}>
                          <div className={`w-2 h-2 rounded-full ${dotColor}${p.dotPulse ? ' animate-pulse' : ''}`}></div>
                          <span className={`text-sm font-medium ${textColor}`}>{p.label}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t border-slate-200">
              {(currentUser?.role === ROLES.ADMIN || currentUser?.role === ROLES.HR) && (
                <Button
                  type="button"
                  onClick={() => {
                    if (selectedUser?.accountType === "TEMPORARY" && selectedUser?.approvalStatus === "APPROVED") {
                      openConvertModal(selectedUser);
                    }
                  }}
                  disabled={
                    selectedUser?.accountType !== "TEMPORARY" ||
                    selectedUser?.approvalStatus !== "APPROVED"
                  }
                  title={
                    selectedUser?.accountType !== "TEMPORARY"
                      ? "This user is already permanent"
                      : selectedUser?.approvalStatus !== "APPROVED"
                      ? "Approve associate registration first"
                      : "Convert this associate to permanent"
                  }
                  className="flex-1 px-6 py-3 font-semibold text-white transition-all duration-200 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedUser?.accountType !== "TEMPORARY"
                    ? "Already Permanent"
                    : selectedUser?.approvalStatus !== "APPROVED"
                    ? "Approve Associate First"
                    : "Convert to Permanent"}
                </Button>
              )}
              <Button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 px-6 py-3 font-semibold transition-all duration-200 border rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-[28px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            {/* Header */}
            <div className="relative sticky top-0 z-10 p-8 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900">
              <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 rounded-full bg-amber-500/20 blur-2xl" />
              <div className="relative z-10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 border rounded-xl bg-amber-500/20 border-amber-500/40">
                    <Pencil className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">Edit Employee</h2>
                    <p className="mt-1 text-sm text-amber-100/80">Editing: {editUser.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 transition-colors rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleEditUser} className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Basic Information */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-slate-50 to-amber-50/30">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-amber-600/10 border-amber-600/20">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Basic Information</h4>
                </div>
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-amber-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5">Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={editForm.dateOfBirth}
                      onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-blue-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-blue-600/10 border-blue-600/20">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Contact Information</h4>
                </div>
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@company.com"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone Number"
                    placeholder="+1 (555) 000-0000"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                  />
                  <Input
                    label="Emergency Contact"
                    placeholder="+1 (555) 000-0001"
                    value={editForm.emergencyContact}
                    onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Personal Details */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-purple-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-purple-600/10 border-purple-600/20">
                    <Heart className="w-5 h-5 text-purple-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Personal Details</h4>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Marital Status</label>
                  <select
                    value={editForm.maritalStatus}
                    onChange={(e) => setEditForm({ ...editForm, maritalStatus: e.target.value })}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Nationality"
                    placeholder="e.g. Indian"
                    value={editForm.nationality}
                    onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                    className="bg-white shadow-sm rounded-xl border-slate-300 focus:ring-purple-500"
                  />
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5 flex items-center gap-2">
                      <Droplet className="w-4 h-4 text-red-500" />
                      Blood Group
                    </label>
                    <select
                      value={editForm.bloodGroup}
                      onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    >
                      <option value="">Blood Group</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-cyan-50/40 to-slate-50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-cyan-600/10 border-cyan-600/20">
                    <Building2 className="w-5 h-5 text-cyan-600" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Organization</h4>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Department</label>
                  <select
                    value={editForm.departmentId}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      setEditForm({ ...editForm, departmentId: deptId, designationId: "" });
                      loadEditDesignations(deptId);
                    }}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">Designation</label>
                  <select
                    value={editForm.designationId}
                    onChange={(e) => setEditForm({ ...editForm, designationId: e.target.value })}
                    disabled={!editForm.departmentId || editLoadingDesignations}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="">
                      {editLoadingDesignations
                        ? "Loading..."
                        : !editForm.departmentId
                        ? "Select a department first"
                        : "Select Designation"}
                    </option>
                    {editDesignations.map((desig) => (
                      <option key={desig._id} value={desig._id}>{desig.name} ({desig.level})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* System Role — Admin only */}
              {currentUser?.role === ROLES.ADMIN && (
                <div className="p-6 space-y-4 border rounded-2xl border-slate-200/60 bg-gradient-to-br from-orange-50/40 to-slate-50">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 border rounded-lg bg-orange-600/10 border-orange-600/20">
                      <Users2 className="w-5 h-5 text-orange-600" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900">System Role</h4>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2.5">Role</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white text-slate-900 font-medium transition-colors shadow-sm"
                    >
                      <option value={ROLES.ADMIN}>👑 Admin</option>
                      <option value={ROLES.HR}>💼 HR Manager</option>
                      <option value={ROLES.USER}>👤 Employee</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="sticky bottom-0 flex gap-3 pt-6 bg-white border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 font-semibold transition-all duration-200 border rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="flex items-center justify-center flex-1 gap-2 px-6 py-3 font-semibold text-white transition-all duration-200 shadow-lg rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 hover:shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 rounded-full border-white/30 border-t-white animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Pencil className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Associate to Permanent Modal */}
      {showConvertModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] rounded-[24px] overflow-hidden shadow-2xl bg-white border border-slate-200/80">
            <div className="relative p-6 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-700">
              <div className="absolute top-0 right-0 w-32 h-32 -mt-16 -mr-16 rounded-full bg-white/20 blur-2xl" />
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white">Convert to Permanent Staff</h3>
                  <p className="text-sm text-blue-100/90 mt-1">
                    Complete required fields for {selectedUser.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="p-2 transition rounded-lg text-white/90 hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleConvertToPermanent} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <Input
                label="Employee ID"
                placeholder="EMP-1001"
                value={convertForm.employeeId}
                onChange={(e) => setConvertForm({ ...convertForm, employeeId: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                <select
                  value={convertForm.departmentId}
                  onChange={async (e) => {
                    const deptId = e.target.value;
                    setConvertForm({ ...convertForm, departmentId: deptId, designationId: "" });
                    await loadConvertDesignations(deptId);
                  }}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-slate-900"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Designation</label>
                <select
                  value={convertForm.designationId}
                  onChange={(e) => setConvertForm({ ...convertForm, designationId: e.target.value })}
                  disabled={!convertForm.departmentId || convertLoadingDesignations}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-slate-900 disabled:bg-slate-100"
                  required
                >
                  <option value="">
                    {convertLoadingDesignations
                      ? "Loading designations..."
                      : !convertForm.departmentId
                      ? "Select department first"
                      : "Select Designation"}
                  </option>
                  {convertDesignations.map((desig) => (
                    <option key={desig._id} value={desig._id}>
                      {desig.name} ({desig.level})
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Salary Band"
                placeholder="Band-2"
                value={convertForm.salaryBand}
                onChange={(e) => setConvertForm({ ...convertForm, salaryBand: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Joining Date</label>
                <input
                  type="date"
                  value={convertForm.joiningDate}
                  onChange={(e) => setConvertForm({ ...convertForm, joiningDate: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white text-slate-900"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="flex-1 border rounded-xl border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={convertLoading}
                  className="flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                >
                  {convertLoading ? "Converting..." : "Confirm Conversion"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}