import React, { useEffect, useState, useRef } from "react";
import PageTitle from "../../components/common/PageTitle.jsx";
import Card from "../../components/ui/Card.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import api from "../../lib/api.js";
import { Calendar, FileUp, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [selectedDocument, setSelectedDocument] = useState(null);
  const fileInputRefs = useRef({});

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        const res = await api.get("/documents/my-documents");
        setDocuments(res.data?.data || []);
      } catch (error) {
        console.error("Failed to load documents:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, []);

  const handleFileUpload = async (documentTypeId, file) => {
    if (!file) return;

    try {
      setUploading((prev) => ({ ...prev, [documentTypeId]: true }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentTypeId", documentTypeId);

      const res = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Update local state
      setDocuments((prev) =>
        prev.map((doc) =>
          doc._id === res.data.data._id ? res.data.data : doc
        )
      );

      setSelectedDocument(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload document. Please try again.");
    } finally {
      setUploading((prev) => ({ ...prev, [documentTypeId]: false }));
    }
  };

  const getDaysUntilDeadline = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status, daysUntil, isOverdue) => {
    if (isOverdue) return "error";
    if (status === "approved") return "success";
    if (status === "rejected") return "error";
    if (daysUntil <= 1) return "warning";
    if (daysUntil <= 7) return "info";
    return "secondary";
  };

  const getStatusIcon = (status, isOverdue) => {
    if (isOverdue) return "⚠️";
    if (status === "submitted") return "📤";
    if (status === "approved") return "✅";
    if (status === "rejected") return "❌";
    return "📄";
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageTitle
        title="Document Submissions"
        subtitle="Upload required documents before the deadline. Track submission status and receive reminders."
      />

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Spinner />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-500 dark:text-slate-400">
            No documents assigned at the moment.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => {
            const daysUntil = getDaysUntilDeadline(doc.deadline);
            const isOverdue =
              new Date() > new Date(doc.deadline) &&
              doc.submissionStatus !== "submitted";

            return (
              <Card key={doc._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getStatusIcon(doc.submissionStatus, isOverdue)}
                        </span>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {doc.documentTypeId?.name}
                          </h3>
                          {doc.documentTypeId?.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              {doc.documentTypeId.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        <Badge
                          variant={getStatusColor(
                            doc.submissionStatus,
                            daysUntil,
                            isOverdue
                          )}
                        >
                          {doc.submissionStatus === "pending"
                            ? "Pending Submission"
                            : doc.submissionStatus.charAt(0).toUpperCase() +
                              doc.submissionStatus.slice(1)}
                        </Badge>

                        {isOverdue && (
                          <Badge variant="error" className="flex items-center gap-1">
                            <AlertCircle size={14} /> Overdue
                          </Badge>
                        )}

                        {daysUntil <= 3 && daysUntil > 0 && (
                          <Badge variant="warning">
                            {daysUntil} day{daysUntil !== 1 ? "s" : ""} left
                          </Badge>
                        )}
                      </div>

                      {/* Deadline Info */}
                      <div className="flex items-center gap-4 mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>
                            Deadline:{" "}
                            {new Date(doc.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                          </span>
                        </div>
                      </div>

                      {/* Review Comments */}
                      {doc.reviewComments && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            Review Comment:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                            {doc.reviewComments}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="flex flex-col items-end gap-3">
                      {doc.submissionStatus === "pending" && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={uploading[doc.documentTypeId?._id]}
                            onClick={() => fileInputRefs.current[doc._id]?.click()}
                          >
                            {uploading[doc.documentTypeId?._id] ? (
                              <>
                                <Spinner size="xs" className="mr-2" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <FileUp size={16} className="mr-2" />
                                Upload Document
                              </>
                            )}
                          </Button>
                          <input
                            ref={(el) => {
                              if (el) fileInputRefs.current[doc._id] = el;
                            }}
                            type="file"
                            hidden
                            onChange={(e) => {
                              handleFileUpload(doc.documentTypeId._id, e.target.files?.[0]);
                            }}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                          />
                        </>
                      )}

                      {doc.submissionStatus === "submitted" && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle size={14} /> Submitted
                        </Badge>
                      )}

                      {doc.submissionStatus === "approved" && (
                        <Badge variant="success" className="flex items-center gap-1">
                          <CheckCircle size={14} /> Approved
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
