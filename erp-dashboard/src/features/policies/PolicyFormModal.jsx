import React, { useState, useEffect } from "react";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import api from "../../lib/api.js";
import { toast } from "../../store/toastStore.js";
import { X, Save, Upload, FileText, Trash2 } from "lucide-react";

export default function PolicyFormModal({ mode, policy, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    category: "Other",
    pdfFile: null
  });
  const [pdfFileName, setPdfFileName] = useState("");

  useEffect(() => {
    if (mode === "edit" && policy) {
      setForm({
        title: policy.title || "",
        description: policy.description || "",
        content: policy.content || "",
        category: policy.category || "Other",
        pdfFile: null
      });
      setPdfFileName(policy.pdfFileName || "");
    }
  }, [mode, policy]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        message: "Please upload a PDF file only",
        type: "error"
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        message: "PDF file must be less than 10MB",
        type: "error"
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      pdfFile: file
    }));
    setPdfFileName(file.name);
  };

  const handleRemovePdf = () => {
    setForm((prev) => ({
      ...prev,
      pdfFile: null
    }));
    setPdfFileName("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: "Validation Error",
        message: "Title is required",
        type: "error"
      });
      return;
    }

    if (!form.description.trim()) {
      toast({
        title: "Validation Error",
        message: "Description is required",
        type: "error"
      });
      return;
    }

    setLoading(true);
    try {
      let response;

      // Create FormData to handle both text and file data
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("content", form.content.trim());
      formData.append("category", form.category);
      
      // Append PDF file if present
      if (form.pdfFile) {
        formData.append("pdf", form.pdfFile);
      }

      if (mode === "create") {
        response = await api.post("/policies", formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      } else {
        response = await api.put(`/policies/${policy._id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
      }

      onSuccess(response.data.policy, mode);
    } catch (err) {
      console.error("Error saving policy:", err);
      toast({
        title: "Failed to save policy",
        message: err?.response?.data?.message || "An error occurred",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">
            {mode === "create" ? "Create New Policy" : "Edit Policy"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Policy Title *
            </label>
            <Input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              placeholder="e.g., Work From Home Policy"
              className="w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleInputChange}
              placeholder="Brief description of the policy"
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Full Content
            </label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleInputChange}
              placeholder="Detailed policy content..."
              rows="6"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="HR">HR</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
              <option value="Security">Security</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* PDF Upload */}
          <div className="p-4 border-2 border-dashed border-emerald-300 rounded-lg bg-emerald-50">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              Attach PDF File (Optional)
            </label>
            
            {pdfFileName ? (
              <div className="p-3 bg-white border border-emerald-200 rounded-lg flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pdfFileName}</p>
                    <p className="text-xs text-gray-500">
                      {form.pdfFile ? `${(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB` : "Current"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePdf}
                  className="p-1 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                  title="Remove PDF"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : null}

            <div className="relative">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-emerald-300 rounded-lg bg-white hover:bg-emerald-50 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-600">
                  {pdfFileName ? "Choose a different file" : "Click to upload or drag PDF here"}
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              PDF only, max 10MB
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Policy"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
