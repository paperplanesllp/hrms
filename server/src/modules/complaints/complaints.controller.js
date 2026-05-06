import { asyncHandler } from "../../utils/asyncHandler.js";
import * as complaintService from "./complaints.service.js";
import {
  createComplaintSchema,
  replyComplaintSchema,
  updateComplaintStatusSchema,
  updateSatisfactionSchema
} from "./complaints.schemas.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { sendComplaintReceivedEmail, sendAdminReplyEmail } from "../../utils/emailService.js";

export const createComplaint = asyncHandler(async (req, res) => {
  try {
    const data = createComplaintSchema.parse(req.body);
    const userId = req.user._id || req.user.id;
    const complaint = await complaintService.createComplaint(userId, data, req.user.companyId || null);
    
    // Send confirmation email asynchronously (non-blocking)
    // Extract user email from populated userId
    const userEmail = complaint.userId?.email;
    const userName = complaint.userId?.name;
    
    if (userEmail && userName) {
      sendComplaintReceivedEmail(userEmail, userName, complaint.subject)
        .then(success => {
          if (success) {
            console.log(`📧 Complaint confirmation email sent to ${userEmail}`);
          }
        })
        .catch(err => {
          console.error("[EMAIL_ERROR] Async complaint confirmation email failed:", err.message);
        });
    }
    
    res.status(StatusCodes.CREATED).json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(StatusCodes.BAD_REQUEST, `Validation error: ${messages}`);
    }
    throw error;
  }
});

export const getMyComplaints = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const complaints = await complaintService.getUserComplaints(userId);
  res.json(complaints);
});

export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintById(req.params.id);
  res.json({ complaint });
});

export const replyToComplaint = asyncHandler(async (req, res) => {
  try {
    const data = replyComplaintSchema.parse(req.body);
    const adminId = req.user._id || req.user.id;
    
    const complaint = await complaintService.replyComplaint(
      req.params.id,
      adminId,
      data
    );
    
    // Send reply notification email asynchronously (non-blocking)
    // Extract user and admin info from populated fields
    const userEmail = complaint.userId?.email;
    const userName = complaint.userId?.name;
    const adminName = complaint.repliedBy?.name || "Admin";
    const originalSubject = complaint.subject;
    const replyMessage = complaint.replyMessage;
    
    if (userEmail && userName && replyMessage) {
      sendAdminReplyEmail(userEmail, userName, originalSubject, replyMessage, adminName)
        .then(success => {
          if (success) {
            console.log(`📧 Admin reply email sent to ${userEmail}`);
          }
        })
        .catch(err => {
          console.error("[EMAIL_ERROR] Async admin reply email failed:", err.message);
        });
    }
    
    res.json({
      complaint,
      message: "Reply sent successfully. 7 working days deadline tracked."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(StatusCodes.BAD_REQUEST, `Validation error: ${messages}`);
    }
    throw error;
  }
});

export const updateStatus = asyncHandler(async (req, res) => {
  try {
    const data = updateComplaintStatusSchema.parse(req.body);
    const complaint = await complaintService.updateComplaintStatus(
      req.params.id,
      data.status
    );
    res.json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(StatusCodes.BAD_REQUEST, `Validation error: ${messages}`);
    }
    throw error;
  }
});

export const submitSatisfaction = asyncHandler(async (req, res) => {
  try {
    const data = updateSatisfactionSchema.parse(req.body);
    const userId = req.user._id || req.user.id;
    const complaint = await complaintService.submitSatisfaction(
      req.params.id,
      userId,
      data
    );
    res.json({
      complaint,
      message: "Thank you for your feedback!"
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new ApiError(StatusCodes.BAD_REQUEST, `Validation error: ${messages}`);
    }
    throw error;
  }
});

export const getAllComplaints = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    priority: req.query.priority,
    category: req.query.category
  };

  Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

  const complaints = await complaintService.getAllComplaints(filters, req.user.companyId || null);
  res.json(complaints);
});

export const getComplaintsStats = asyncHandler(async (req, res) => {
  const stats = await complaintService.getComplaintsStats(req.user.companyId || null);
  res.json(stats);
});

export const searchComplaints = asyncHandler(async (req, res) => {
  const { q, status, priority } = req.query;

  if (!q) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Search term is required");
  }

  const complaints = await complaintService.searchComplaints(q, {
    status,
    priority
  }, req.user.companyId || null);

  res.json(complaints);
});