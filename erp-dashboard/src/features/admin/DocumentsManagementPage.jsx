import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import {
  Plus,
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Eye,
  Download,
} from "lucide-react";

export default function DocumentsManagementPage() {
  const [documentTypes, setDocumentTypes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState("all");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewComment, setReviewComment] = useState("");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: "",
    assignedEmployees: [],
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [typesRes, submissionsRes, statsRes, employeesRes] =
          await Promise.all([
            api.get("/documents"),
            api.get("/documents/status/all"),
            api.get("/documents/stats/dashboard"),
            api.get("/admin/users?role=HR"),
          ]);

        setDocumentTypes(typesRes.data?.data || []);
        setSubmissions(submissionsRes.data?.data || []);
        setStats(
          statsRes.data?.data || {
            pending: 0,
            submitted: 0,
            approved: 0,
            rejected: 0,
            overdue: 0,
          }
        );
        const employeesData = employeesRes.data || [];
        console.log("📋 [DEBUG] HR employees data:", employeesData);
        setEmployees(employeesData);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateDocumentType = async () => {
    if (!formData.name || !formData.deadline || selectedEmployees.length === 0) {
      alert("Please fill in all required fields and select at least one employee");
      return;
    }

    try {
      const res = await api.post("/documents", {
        name: formData.name,
        description: formData.description,
        deadline: new Date(formData.deadline),
        assignedEmployees: selectedEmployees,
      });

      setDocumentTypes((prev) => [res.data.data, ...prev]);
      setShowCreateModal(false);
      setFormData({
        name: "",
        description: "",
        deadline: "",
        assignedEmployees: [],
      });
      setSelectedEmployees([]);
      setEmployeeSearchInput("");
      alert("Document type created and assigned to selected employees!");
    } catch (error) {
      console.error("Failed to create document type:", error);
      alert("Failed to create document type");
    }
  };

  const handleAddEmployee = (employeeId) => {
    if (!selectedEmployees.includes(employeeId)) {
      setSelectedEmployees((prev) => [...prev, employeeId]);
      setEmployeeSearchInput("");
      setShowEmployeeDropdown(false);
    }
  };

  const handleRemoveEmployee = (employeeId) => {
    setSelectedEmployees((prev) => prev.filter((id) => id !== employeeId));
  };

  const filteredEmployees = employees.filter(
    (emp) => {
      const notSelected = !selectedEmployees.includes(emp._id);
      const matchesSearch = emp.name.toLowerCase().includes(employeeSearchInput.toLowerCase());
      return notSelected && matchesSearch;
    }
  );

  const handleApprove = async (documentId) => {
    try {
      await api.post(`/documents/${documentId}/approve`, {
        comments: reviewComment,
      });

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === documentId
            ? { ...sub, submissionStatus: "approved" }
            : sub
        )
      );

      setSelectedSubmission(null);
      setReviewComment("");
    } catch (error) {
      console.error("Failed to approve document:", error);
      alert("Failed to approve document");
    }
  };

  const handleReject = async (documentId) => {
    try {
      await api.post(`/documents/${documentId}/reject`, {
        comments: reviewComment,
      });

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === documentId
            ? { ...sub, submissionStatus: "rejected" }
            : sub
        )
      );

      setSelectedSubmission(null);
      setReviewComment("");
    } catch (error) {
      console.error("Failed to reject document:", error);
      alert("Failed to reject document");
    }
  };

  const filteredSubmissions =
    filter === "all"
      ? submissions
      : submissions.filter((sub) => sub.submissionStatus === filter);

  const getStatusIcon = (status, isOverdue) => {
    if (isOverdue) return <AlertCircle className="text-red-500" size={20} />;
    if (status === "submitted")
      return <Clock className="text-yellow-500" size={20} />;
    if (status === "approved")
      return <CheckCircle className="text-green-500" size={20} />;
    if (status === "rejected")
      return <XCircle className="text-red-500" size={20} />;
    return <FileCheck className="text-blue-500" size={20} />;
  };

  const handleViewDocument = (e, submission) => {
    e.stopPropagation();
    setSelectedSubmission(submission);
  };

  const handleDownloadDocument = (e, submission) => {
    e.stopPropagation();
    if (submission.fileUrl) {
      window.open(`http://localhost:5001${submission.fileUrl}`, "_blank");
    } else {
      alert("No file available for download");
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <PageTitle
          title="Document Management"
          subtitle="Manage document submissions, set deadlines, and track employee submissions"
        />
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={18} className="mr-2" />
          New Document Type
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-5">
            <Card className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Pending</p>
              <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Submitted</p>
              <p className="text-3xl font-bold text-yellow-600">
                {stats.submitted}
              </p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Approved</p>
              <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            </Card>

            <Card className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            </Card>

            <Card className="p-4 text-center border-2 border-red-200 dark:border-red-800">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                Overdue
              </p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
            </Card>
          </div>

          <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === "overview"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Submissions
            </button>

            <button
              onClick={() => setActiveTab("types")}
              className={`px-4 py-2 font-semibold transition-colors ${
                activeTab === "types"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Document Types
            </button>
          </div>

          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  All
                </button>

                {["pending", "submitted", "approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilter(status)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      filter === status
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredSubmissions.length === 0 ? (
                  <Card className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No submissions found
                  </Card>
                ) : (
                  filteredSubmissions.map((submission) => {
                    const isOverdue =
                      new Date() > new Date(submission.deadline) &&
                      submission.submissionStatus === "pending";

                    return (
                      <Card
                        key={submission._id}
                        className="p-4 transition-shadow border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center flex-1 min-w-0 gap-4">
                            <div className="flex-shrink-0">
                              {getStatusIcon(
                                submission.submissionStatus,
                                isOverdue
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate text-slate-900 dark:text-white">
                                {submission.employeeId?.name}
                              </p>
                              <p className="text-sm truncate text-slate-600 dark:text-slate-400">
                                {submission.documentTypeId?.name}
                              </p>
                              {submission.fileUrl && (
                                <Badge variant="secondary" className="inline-block mt-1 text-xs">
                                  📎 {submission.fileName} ({(submission.fileSize / 1024).toFixed(0)}KB)
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end flex-shrink-0 gap-2">
                            <Badge
                              variant={
                                isOverdue
                                  ? "error"
                                  : submission.submissionStatus === "approved"
                                  ? "success"
                                  : submission.submissionStatus === "rejected"
                                  ? "error"
                                  : "secondary"
                              }
                            >
                              {isOverdue ? "Overdue" : submission.submissionStatus}
                            </Badge>

                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(submission.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                            </span>

                            <div className="flex gap-1.5 flex-shrink-0 ml-2">
                              <button
                                onClick={(e) => handleViewDocument(e, submission)}
                                className="p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                title="View document"
                              >
                                <Eye size={16} />
                              </button>
                              {submission.fileUrl && (
                                <button
                                  onClick={(e) => handleDownloadDocument(e, submission)}
                                  className="p-2 transition-colors rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                  title="Download document"
                                >
                                  <Download size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === "types" && (
            <div className="space-y-4">
              {documentTypes.map((type) => (
                <Card key={type._id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {type.name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {type.description}
                      </p>

                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <span>
                          Deadline: {new Date(type.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </span>
                        <Badge variant={type.isActive ? "success" : "secondary"}>
                          {type.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {selectedSubmission && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Review Document Submission
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedSubmission(null);
                      setReviewComment("");
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Submission Info */}
                <div className="mb-6 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Employee
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {selectedSubmission.employeeId?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Document
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {selectedSubmission.documentTypeId?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Status
                    </p>
                    <p className="text-slate-900 dark:text-white font-medium">
                      {selectedSubmission.submissionStatus}
                    </p>
                  </div>
                </div>

                {/* Document Preview */}
                {selectedSubmission.fileUrl && (
                  <div className="mb-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      📄 Document File
                    </h3>
                    
                    <div className="mb-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {selectedSubmission.fileName}
                        </p>
                        <p className="text-xs text-slate-500">
                          Size: {(selectedSubmission.fileSize / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => window.open(`http://localhost:5001${selectedSubmission.fileUrl}`, '_blank')}
                      >
                        <Download size={16} className="mr-1" />
                        Download
                      </Button>
                    </div>

                    {/* PDF Preview */}
                    {(selectedSubmission.fileType?.includes('pdf') || selectedSubmission.fileName?.toLowerCase().endsWith('.pdf')) && (
                      <div className="border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600 h-96">
                        <embed 
                          src={`http://localhost:5000${selectedSubmission.fileUrl}#toolbar=0&navpanes=0`} 
                          type="application/pdf"
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    {/* Image Preview */}
                    {selectedSubmission.fileType?.includes('image') && (
                      <div className="border rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-600">
                        <img 
                          src={`http://localhost:5000${selectedSubmission.fileUrl}`}
                          alt="Document"
                          className="w-full h-auto"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Submission Details */}
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Submitted At</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {selectedSubmission.submittedAt 
                          ? new Date(selectedSubmission.submittedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
                          : "Not submitted"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 dark:text-slate-400">Deadline</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {new Date(selectedSubmission.deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Review Comments */}
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Review Comments
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white"
                    rows="3"
                    placeholder="Add review comments or reason for rejection..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedSubmission(null);
                      setReviewComment("");
                    }}
                  >
                    Close
                  </Button>

                  {selectedSubmission.submissionStatus === "submitted" && (
                    <>
                      <Button
                        variant="danger"
                        onClick={() => handleReject(selectedSubmission._id)}
                      >
                        ❌ Reject
                      </Button>
                      <Button
                        variant="success"
                        onClick={() => handleApprove(selectedSubmission._id)}
                      >
                        ✅ Approve
                      </Button>
                    </>
                  )}

                  {selectedSubmission.submissionStatus === "approved" && (
                    <div className="text-emerald-600 font-semibold flex items-center gap-2">
                      <CheckCircle size={20} />
                      Already Approved
                    </div>
                  )}

                  {selectedSubmission.submissionStatus === "rejected" && (
                    <div className="text-red-600 font-semibold flex items-center gap-2">
                      <XCircle size={20} />
                      Already Rejected
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {showCreateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <Card className="max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
                  Create Document Type
                </h2>

                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Document Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="e.g., Bank Details, Passport Copy, etc."
                      className="w-full px-4 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Brief description of the document requirement..."
                      rows="3"
                      className="w-full px-4 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Deadline *
                    </label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) =>
                        setFormData({ ...formData, deadline: e.target.value })
                      }
                      className="w-full px-4 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.deadline && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Days until deadline:{" "}
                        {Math.ceil(
                          (new Date(formData.deadline) - new Date()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Assign to HR Team *
                    </label>

                    <div className="relative mb-3">
                      <input
                        type="text"
                        value={employeeSearchInput}
                        onChange={(e) => setEmployeeSearchInput(e.target.value)}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        onBlur={() => setTimeout(() => setShowEmployeeDropdown(false), 200)}
                        placeholder="Search and select HR members..."
                        className="w-full px-4 py-2 bg-white border rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      {showEmployeeDropdown && filteredEmployees.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 overflow-y-auto bg-white border rounded-lg shadow-lg top-full dark:bg-slate-800 border-slate-300 dark:border-slate-600 max-h-48">
                          {filteredEmployees.slice(0, 5).map((emp) => (
                            <button
                              key={emp._id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleAddEmployee(emp._id);
                              }}
                              className="w-full px-4 py-2 text-left transition-colors border-b hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600 last:border-b-0"
                            >
                              {emp.name} ({emp.email})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg min-h-[80px] max-h-[200px] overflow-y-auto border border-slate-200 dark:border-slate-700">
                      {selectedEmployees.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          No HR members selected
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedEmployees.map((empId) => {
                            const emp = employees.find((e) => e._id === empId);

                            return emp ? (
                              <div
                                key={empId}
                                className="flex items-center justify-between px-3 py-2 bg-blue-100 rounded-md dark:bg-blue-900"
                              >
                                <span className="text-sm text-slate-900 dark:text-white">
                                  {emp.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEmployee(empId)}
                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Selected {selectedEmployees.length} HR member(s). Document 
                      will be assigned to selected HR team only.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({
                        name: "",
                        description: "",
                        deadline: "",
                        assignedEmployees: [],
                      });
                      setSelectedEmployees([]);
                      setEmployeeSearchInput("");
                      setShowEmployeeDropdown(false);
                    }}
                  >
                    Cancel
                  </Button>

                  <Button variant="primary" onClick={handleCreateDocumentType}>
                    <Plus size={16} className="mr-2" />
                    Create Document Type
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}