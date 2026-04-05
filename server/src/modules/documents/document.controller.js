import {
  createDocumentType,
  getDocumentTypes,
  getDocumentTypeById,
  updateDocumentType,
  deleteDocumentType,
  createEmployeeDocumentsForType,
  getEmployeeDocuments,
  getPendingDocumentsForEmployee,
  uploadDocument,
  getDocumentSubmissionStatus,
  approveDocument,
  rejectDocument,
  getDocumentDashboardStats
} from "./document.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// HR: Create a new document type with deadline
export const createDocType = asyncHandler(async (req, res) => {
  const { name, description, applicableTo, departmentIds, roles, deadline, isRecurring, recurringFrequency, assignedEmployees } = req.body;
  
  if (!name || !deadline) {
    return res.status(400).json({ error: "Name and deadline are required" });
  }

  const documentType = await createDocumentType(
    {
      name,
      description,
      applicableTo,
      departmentIds,
      roles,
      deadline: new Date(deadline),
      isRecurring,
      recurringFrequency
    },
    req.user.id
  );

  // Create employee documents - use specific employees if provided, otherwise use applicableTo rules
  await createEmployeeDocumentsForType(documentType._id, assignedEmployees);

  res.status(201).json({
    success: true,
    message: "Document type created and assigned to employees",
    data: documentType
  });
});

// HR: Get all document types
export const getDocTypes = asyncHandler(async (req, res) => {
  const documentTypes = await getDocumentTypes(req.query);
  res.json({
    success: true,
    data: documentTypes
  });
});

// HR: Get document type by ID
export const getDocTypeById = asyncHandler(async (req, res) => {
  const documentType = await getDocumentTypeById(req.params.id);
  if (!documentType) {
    return res.status(404).json({ error: "Document type not found" });
  }
  res.json({
    success: true,
    data: documentType
  });
});

// HR: Update document type
export const updateDocType = asyncHandler(async (req, res) => {
  const documentType = await updateDocumentType(req.params.id, req.body);
  res.json({
    success: true,
    message: "Document type updated successfully",
    data: documentType
  });
});

// HR: Delete document type
export const deleteDocType = asyncHandler(async (req, res) => {
  await deleteDocumentType(req.params.id);
  res.json({
    success: true,
    message: "Document type deleted successfully"
  });
});

// Employee: Get their pending documents
export const getMyDocuments = asyncHandler(async (req, res) => {
  const documents = await getEmployeeDocuments(req.user.id);
  res.json({
    success: true,
    data: documents
  });
});

// Employee: Get pending documents for dashboard
export const getMyPendingDocuments = asyncHandler(async (req, res) => {
  const documents = await getPendingDocumentsForEmployee(req.user.id);
  res.json({
    success: true,
    data: documents
  });
});

// Employee: Upload a document
export const uploadEmployeeDocument = asyncHandler(async (req, res) => {
  console.log("📦 [UPLOAD] Request received");
  console.log("📦 [UPLOAD] File:", req.file);
  console.log("📦 [UPLOAD] Body:", req.body);

  if (!req.file) {
    console.error("❌ [UPLOAD] No file uploaded");
    return res.status(400).json({ error: "No file uploaded" });
  }

  const { documentTypeId } = req.body;

  console.log("📦 [UPLOAD] File details - name:", req.file.originalname, "size:", req.file.size, "mime:", req.file.mimetype);

  // Assuming you have a storage solution (S3, local, etc)
  // For now, we'll store the file info
  const fileData = {
    fileName: req.file.originalname,
    fileUrl: `/uploads/documents/${req.file.filename}`, // Adjust based on your storage
    fileSize: req.file.size,
    fileType: req.file.mimetype
  };

  console.log("📦 [UPLOAD] FileData prepared:", fileData);

  const document = await uploadDocument(req.user.id, documentTypeId, fileData);

  console.log("✅ [UPLOAD] Document saved to DB:", {
    _id: document._id,
    fileName: document.fileName,
    fileUrl: document.fileUrl,
    fileSize: document.fileSize,
    submissionStatus: document.submissionStatus,
    submittedAt: document.submittedAt
  });

  res.status(201).json({
    success: true,
    message: "Document uploaded successfully",
    data: document
  });
});

// HR: Get document submission status with filters
export const getSubmissionStatus = asyncHandler(async (req, res) => {
  console.log("📋 [GET SUBMISSIONS] Request received");
  
  const documents = await getDocumentSubmissionStatus(req.query);
  const stats = await getDocumentDashboardStats();

  console.log("📋 [GET SUBMISSIONS] Total submissions returned:", documents.length);
  if (documents.length > 0) {
    console.log("📋 [GET SUBMISSIONS] First submission sample:", {
      _id: documents[0]._id,
      employeeName: documents[0].employeeId?.name,
      documentName: documents[0].documentTypeId?.name,
      fileUrl: documents[0].fileUrl,
      fileName: documents[0].fileName,
      fileSize: documents[0].fileSize,
      submittedAt: documents[0].submittedAt,
      submissionStatus: documents[0].submissionStatus
    });
  }

  res.json({
    success: true,
    data: documents,
    stats
  });
});

// HR: Approve a document
export const approveDocumentSubmission = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const { documentId } = req.params;

  const document = await approveDocument(documentId, req.user.id, comments);

  res.json({
    success: true,
    message: "Document approved successfully",
    data: document
  });
});

// HR: Reject a document
export const rejectDocumentSubmission = asyncHandler(async (req, res) => {
  const { comments } = req.body;
  const { documentId } = req.params;

  const document = await rejectDocument(documentId, req.user.id, comments);

  res.json({
    success: true,
    message: "Document rejected successfully",
    data: document
  });
});

// HR: Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDocumentDashboardStats();
  res.json({
    success: true,
    data: stats
  });
});
