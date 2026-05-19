import { DocumentType } from "./DocumentType.model.js";
import { EmployeeDocument } from "./EmployeeDocument.model.js";
import { User } from "../users/User.model.js";
import Notification from "../notifications/Notification.model.js";
import mongoose from "mongoose";

// ==================== DOCUMENT TYPE OPERATIONS ====================

function requireCompanyContext(companyId) {
  if (!companyId) {
    throw new Error("Company context is required");
  }
}

export const createDocumentType = async (data, userId, companyId) => {
  requireCompanyContext(companyId);
  const documentType = new DocumentType({
    ...data,
    companyId,
    createdBy: userId
  });
  return await documentType.save();
};

export const getDocumentTypes = async (filters = {}, companyId) => {
  requireCompanyContext(companyId);
  const query = { isActive: true, companyId };
  if (filters.searchTerm) {
    query.name = { $regex: filters.searchTerm, $options: "i" };
  }
  return await DocumentType.find(query)
    .populate("createdBy", "name email")
    .populate("departmentIds", "name")
    .sort({ createdAt: -1 });
};

export const getDocumentTypeById = async (id, companyId) => {
  requireCompanyContext(companyId);
  return await DocumentType.findOne({ _id: id, companyId })
    .populate("createdBy", "name email")
    .populate("departmentIds", "name");
};

export const updateDocumentType = async (id, data, companyId) => {
  requireCompanyContext(companyId);
  return await DocumentType.findOneAndUpdate({ _id: id, companyId }, data, { returnDocument: "after" })
    .populate("createdBy", "name email")
    .populate("departmentIds", "name");
};

export const deleteDocumentType = async (id, companyId) => {
  requireCompanyContext(companyId);
  return await DocumentType.findOneAndUpdate({ _id: id, companyId }, { isActive: false }, { returnDocument: "after" });
};

// ==================== EMPLOYEE DOCUMENT OPERATIONS ====================

export const createEmployeeDocumentsForType = async (documentTypeId, assignedEmployees = null, companyId) => {
  requireCompanyContext(companyId);
  const documentType = await DocumentType.findOne({ _id: documentTypeId, companyId });
  if (!documentType) throw new Error("Document type not found");

  let employees = [];

  // If specific employees are provided, use them; otherwise use applicableTo rules
  if (assignedEmployees && assignedEmployees.length > 0) {
    employees = await User.find({ _id: { $in: assignedEmployees }, companyId, accountLocked: false });
  } else if (documentType.applicableTo === "all") {
    employees = await User.find({ role: "USER", companyId, accountLocked: false });
  } else if (documentType.applicableTo === "specific_departments") {
    employees = await User.find({
      companyId,
      departmentId: { $in: documentType.departmentIds },
      accountLocked: false
    });
  } else if (documentType.applicableTo === "specific_roles") {
    employees = await User.find({
      companyId,
      role: { $in: documentType.roles },
      accountLocked: false
    });
  }

  const employeeDocuments = [];
  for (const employee of employees) {
    const existingDoc = await EmployeeDocument.findOne({
      employeeId: employee._id,
      documentTypeId
    });

    if (!existingDoc) {
      const doc = new EmployeeDocument({
        employeeId: employee._id,
        companyId,
        documentTypeId,
        deadline: documentType.deadline,
        daysUntilDeadline: calculateDaysUntilDeadline(documentType.deadline)
      });
      await doc.save();
      employeeDocuments.push(doc);
    }
  }

  return employeeDocuments;
};

export const getEmployeeDocuments = async (employeeId, companyId) => {
  requireCompanyContext(companyId);
  const documents = await EmployeeDocument.find({ employeeId, companyId })
    .populate("documentTypeId", "name description")
    .sort({ deadline: 1 });

  // Calculate days until deadline for each document
  return documents.map(doc => ({
    ...doc.toObject(),
    daysUntilDeadline: calculateDaysUntilDeadline(doc.deadline),
    isOverdue: new Date() > new Date(doc.deadline) && doc.submissionStatus !== "submitted"
  }));
};

export const getPendingDocumentsForEmployee = async (employeeId, companyId) => {
  requireCompanyContext(companyId);
  return await EmployeeDocument.find({
    employeeId,
    companyId,
    submissionStatus: "pending"
  })
    .populate("documentTypeId", "name description")
    .sort({ deadline: 1 });
};

export const uploadDocument = async (employeeId, documentTypeId, fileData, companyId) => {
  requireCompanyContext(companyId);
  const document = await EmployeeDocument.findOne({
    employeeId,
    companyId,
    documentTypeId
  });

  if (!document) {
    throw new Error("Document record not found");
  }

  document.fileName = fileData.fileName;
  document.fileUrl = fileData.fileUrl;
  document.fileSize = fileData.fileSize;
  document.fileType = fileData.fileType;
  document.submissionStatus = "submitted";
  document.submittedAt = new Date();

  return await document.save();
};

export const getDocumentSubmissionStatus = async (filters = {}, companyId) => {
  requireCompanyContext(companyId);
  const query = { companyId };

  if (filters.documentTypeId) {
    query.documentTypeId = filters.documentTypeId;
  }

  if (filters.submissionStatus) {
    query.submissionStatus = filters.submissionStatus;
  }

  if (filters.employeeId) {
    query.employeeId = filters.employeeId;
  }

  const documents = await EmployeeDocument.find(query)
    .populate("employeeId", "name email employeeId")
    .populate("documentTypeId", "name deadline")
    .populate("reviewedBy", "name email");

  return documents.map(doc => ({
    ...doc.toObject(),
    daysUntilDeadline: calculateDaysUntilDeadline(doc.deadline),
    isOverdue: new Date() > new Date(doc.deadline) && doc.submissionStatus !== "submitted"
  }));
};

export const approveDocument = async (documentId, reviewedBy, comments = "", companyId) => {
  requireCompanyContext(companyId);
  return await EmployeeDocument.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      submissionStatus: "approved",
      reviewedBy,
      reviewComments: comments,
      reviewedAt: new Date()
    },
    { returnDocument: "after" }
  );
};

export const rejectDocument = async (documentId, reviewedBy, comments = "", companyId) => {
  requireCompanyContext(companyId);
  return await EmployeeDocument.findOneAndUpdate(
    { _id: documentId, companyId },
    {
      submissionStatus: "rejected",
      reviewedBy,
      reviewComments: comments,
      reviewedAt: new Date()
    },
    { returnDocument: "after" }
  );
};

// ==================== NOTIFICATION FUNCTIONS ====================

export const sendDocumentDeadlineReminders = async () => {
  try {
    const now = new Date();
    
    // Get all pending documents
    const pendingDocuments = await EmployeeDocument.find({
      submissionStatus: "pending",
      deadline: { $gt: now }
    })
      .populate("employeeId", "name email")
      .populate("documentTypeId", "name");

    for (const doc of pendingDocuments) {
      const daysUntil = calculateDaysUntilDeadline(doc.deadline);
      
      // Send reminders at 7, 3, 1,and 0 days before deadline
      if ([7, 3, 1, 0].includes(daysUntil)) {
        const notification = new Notification({
          userId: doc.employeeId._id,
          type: "reminder",
          title: `📄 Document Submission Reminder`,
          message: `Please submit "${doc.documentTypeId.name}" by ${formatDate(doc.deadline)}. ${daysUntil === 0 ? "Deadline is TODAY!" : `${daysUntil} days remaining.`}`,
          targetUrl: "/documents"
        });

        await notification.save();
        
        // Update reminder tracking
        doc.reminderSentCount += 1;
        doc.lastReminderSentAt = new Date();
        await doc.save();

        console.log(`📬 Reminder sent to ${doc.employeeId.name} for ${doc.documentTypeId.name}`);
      }
    }

    return { success: true, message: "Reminders sent successfully" };
  } catch (error) {
    console.error("Error sending document deadline reminders:", error);
    throw error;
  }
};

export const markOverdueDocuments = async () => {
  try {
    const now = new Date();
    const overdueCount = await EmployeeDocument.updateMany(
      {
        submissionStatus: "pending",
        deadline: { $lt: now },
        isOverdue: false
      },
      {
        isOverdue: true
      }
    );

    console.log(`⚠️  Marked ${overdueCount.modifiedCount} documents as overdue`);
    return overdueCount;
  } catch (error) {
    console.error("Error marking overdue documents:", error);
    throw error;
  }
};

// ==================== UTILITY FUNCTIONS ====================

const calculateDaysUntilDeadline = (deadline) => {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

// Get dashboard statistics
export const getDocumentDashboardStats = async (companyId) => {
  requireCompanyContext(companyId);
  const stats = await EmployeeDocument.aggregate([
    { $match: { companyId: typeof companyId === "string" ? new mongoose.Types.ObjectId(companyId) : companyId } },
    {
      $group: {
        _id: "$submissionStatus",
        count: { $sum: 1 }
      }
    }
  ]);

  const overdue = await EmployeeDocument.countDocuments({
    companyId,
    isOverdue: true,
    submissionStatus: "pending"
  });

  return {
    pending: stats.find(s => s._id === "pending")?.count || 0,
    submitted: stats.find(s => s._id === "submitted")?.count || 0,
    approved: stats.find(s => s._id === "approved")?.count || 0,
    rejected: stats.find(s => s._id === "rejected")?.count || 0,
    overdue
  };
};
