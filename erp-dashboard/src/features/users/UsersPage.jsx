import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import GoogleMapSelector from "../../components/ui/GoogleMapSelector.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import { 
  Users, 
  Shield, 
  UserCheck, 
  Briefcase, 
  Search, 
  Plus, 
  Eye,
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState(""); 
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

  const openProfileModal = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const loadCompanyLocation = async () => {
    try {
      const res = await api.get("/admin/company-location");
      setCompanyLocation({
        latitude: res.data.latitude || 0,
        longitude: res.data.longitude || 0
      });
    } catch (err) {
      console.error("Error loading company location:", err);
      setCompanyLocation({ latitude: 0, longitude: 0 });
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
      const res = await api.get("/users");
      setItems(res.data || []);
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

  // Filter logic
  const filteredItems = items.filter((user) => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
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
        {currentUser?.role === ROLES.ADMIN && (
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
                        <Badge className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-[#E6F4EA] border-[#137333] text-[#137333]">
                          Active
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => openProfileModal(user)}
                          className="bg-[#4A7FA7] hover:bg-[#3a5f87] text-white border-0 shadow-sm"
                        >
                          View Profile
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selectedUser.name}</h2>
                    <p className="text-blue-100 text-sm mt-1">{selectedUser.role}</p>
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
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</p>
                    <Badge className="inline-block px-3 py-1 rounded-full text-xs font-semibold border mt-1 bg-emerald-50 border-emerald-300 text-emerald-700">
                      Active
                    </Badge>
                  </div>
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
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm font-medium text-green-700">Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-white border-t border-slate-200">
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
    </div>
  );
}