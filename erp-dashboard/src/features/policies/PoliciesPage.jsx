import React, { useEffect, useState } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { useAuthStore } from "../../store/authStore.js";
import { ROLES } from "../../app/constants.js";
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  FileText,
  Download,
  X
} from "lucide-react";
import PolicyFormModal from "./PolicyFormModal.jsx";

const categoryColors = {
  HR: "bg-blue-50 border-blue-200 text-blue-700",
  Finance: "bg-green-50 border-green-200 text-green-700",
  Operations: "bg-purple-50 border-purple-200 text-purple-700",
  Security: "bg-red-50 border-red-200 text-red-700",
  Other: "bg-gray-50 border-gray-200 text-gray-700"
};

export default function PoliciesPage() {
  const user = useAuthStore((s) => s.user);
  const isHROrAdmin = user?.role === ROLES.HR || user?.role === ROLES.ADMIN;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [formMode, setFormMode] = useState("create"); // "create" or "edit"
  const [deleting, setDeleting] = useState(null);
  const [category, setCategory] = useState("");

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (category) params.category = category;

      const res = await api.get("/policies", { params });
      setPolicies(res.data || []);
    } catch (err) {
      console.error("Error loading policies:", err);
      const errorMsg = err?.response?.data?.message || "Failed to load policies";
      setError(errorMsg);
      toast({
        title: "Failed to load policies",
        message: errorMsg,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, [category]);

  const handleCreateNew = () => {
    setFormMode("create");
    setSelectedPolicy(null);
    setShowForm(true);
  };

  const handleEdit = (policy) => {
    setFormMode("edit");
    setSelectedPolicy(policy);
    setShowForm(true);
  };

  const handleViewDetails = (policy) => {
    setSelectedPolicy(policy);
    setShowDetail(true);
  };

  const handleDownloadPdf = (pdfUrl, fileName) => {
    if (!pdfUrl) {
      toast({
        title: "No PDF available",
        message: "This policy doesn't have a PDF attached",
        type: "error"
      });
      return;
    }

    try {
      // Use fetch to download the file with proper headers
      fetch(pdfUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create blob URL
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName || "policy.pdf";
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "Success",
            message: "PDF downloaded successfully",
            type: "success"
          });
        })
        .catch(err => {
          console.error("PDF download error:", err);
          toast({
            title: "Download failed",
            message: "Failed to download PDF. Please try again.",
            type: "error"
          });
        });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Download failed",
        message: "Failed to download PDF",
        type: "error"
      });
    }
  };

  const handleDelete = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this policy?")) {
      return;
    }

    setDeleting(policyId);
    try {
      await api.delete(`/policies/${policyId}`);
      setPolicies(policies.filter((p) => p._id !== policyId));
      toast({
        title: "Success",
        message: "Policy deleted successfully",
        type: "success"
      });
    } catch (err) {
      console.error("Error deleting policy:", err);
      toast({
        title: "Failed to delete policy",
        message: err?.response?.data?.message || "An error occurred",
        type: "error"
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedPolicy(null);
  };

  const handleFormSuccess = (newPolicy, mode) => {
    if (mode === "create") {
      setPolicies([newPolicy, ...policies]);
      toast({
        title: "Success",
        message: "Policy created successfully",
        type: "success"
      });
    } else {
      setPolicies(policies.map((p) => (p._id === newPolicy._id ? newPolicy : p)));
      toast({
        title: "Success",
        message: "Policy updated successfully",
        type: "success"
      });
    }
    handleFormClose();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageTitle
        title="Company Policies"
        subtitle="View and manage company policies and procedures"
        actions={
          isHROrAdmin && (
            <Button
              onClick={handleCreateNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Policy
            </Button>
          )
        }
      />

      {/* Filters */}
      {isHROrAdmin && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Categories</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="Security">Security</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      ) : error ? (
        <Card className="p-16 text-center bg-white shadow-lg rounded-xl">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <p className="text-lg text-gray-600 mb-4">{error}</p>
          <Button onClick={loadPolicies} className="bg-slate-600 hover:bg-slate-700">
            Retry
          </Button>
        </Card>
      ) : policies.length === 0 ? (
        <Card className="p-16 text-center bg-gradient-to-br from-gray-50 to-gray-100 shadow-lg rounded-xl">
          <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Policies Yet</h3>
          <p className="text-gray-600 mb-6">
            {isHROrAdmin
              ? "Start by creating your first policy for the company."
              : "No policies have been published yet. Check back soon!"}
          </p>
          {isHROrAdmin && (
            <Button
              onClick={handleCreateNew}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Policy
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {policies.map((policy) => (
            <Card
              key={policy._id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
            >
              {/* Header with Category Badge */}
              <div
                className={`p-4 border-b ${categoryColors[policy.category] || categoryColors.Other}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[policy.category] || categoryColors.Other}`}
                  >
                    {policy.category}
                  </div>
                  {isHROrAdmin && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(policy)}
                        className="p-1.5 rounded-lg bg-white hover:bg-blue-100 text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(policy._id)}
                        disabled={deleting === policy._id}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-100 text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                  {policy.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {policy.description}
                </p>

                {/* Metadata */}
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    <span>Created by {policy.createdBy?.name || "Unknown"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(policy.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* View More Link */}
              <div className="p-4 bg-gray-50 border-t flex gap-2">
                <button
                  onClick={() => handleViewDetails(policy)}
                  className="flex-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2 group transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  View Details →
                </button>
                {policy.pdfUrl && (
                  <button
                    onClick={() => handleDownloadPdf(policy.pdfUrl, policy.pdfFileName)}
                    className="flex items-center gap-1 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Policy Form Modal */}
      {showForm && (
        <PolicyFormModal
          mode={formMode}
          policy={selectedPolicy}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Policy Details Modal */}
      {showDetail && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedPolicy.title}
              </h2>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Category & Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold border ${categoryColors[selectedPolicy.category] || categoryColors.Other}`}
                >
                  {selectedPolicy.category}
                </div>
                <div className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 border border-green-300 text-green-700">
                  Active
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Description
                </h3>
                <p className="text-base text-gray-700">
                  {selectedPolicy.description}
                </p>
              </div>

              {/* Content */}
              {selectedPolicy.content && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Full Content
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedPolicy.content}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Created By
                  </p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedPolicy.createdBy?.name || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Created Date
                  </p>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(selectedPolicy.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </p>
                </div>
              </div>

              {/* PDF Section */}
              {selectedPolicy.pdfUrl && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">
                          {selectedPolicy.pdfFileName || "Policy Document"}
                        </p>
                        <p className="text-xs text-gray-600">PDF Attachment</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadPdf(selectedPolicy.pdfUrl, selectedPolicy.pdfFileName)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 flex gap-3 p-6 bg-gray-50 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 px-6 py-2 font-semibold transition-all duration-200 border rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
              >
                Close
              </button>
              {isHROrAdmin && (
                <button
                  onClick={() => {
                    setShowDetail(false);
                    handleEdit(selectedPolicy);
                  }}
                  className="flex-1 px-6 py-2 font-semibold transition-all duration-200 border rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
                >
                  Edit Policy
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
