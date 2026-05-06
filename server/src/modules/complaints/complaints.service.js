import { Complaint } from "./Complaint.model.js";
import { User } from "../users/User.model.js";
import { calculateDeadline, isDeadlineExpired, getDeadlineStatus } from "../../utils/workingDays.js";
import { ApiError } from "../../utils/apiError.js";
import { StatusCodes } from "http-status-codes";

export async function createComplaint(userId, data, companyId = null) {
  if (!userId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User ID is required");
  }

  const deadlineDate = calculateDeadline(new Date());

  const complaint = await Complaint.create({
    companyId: companyId || null,
    userId,
    subject: data.subject,
    message: data.message,
    category: data.category || "Others",
    priority: data.priority || "Medium",
    deadlineDate,
    isDeadlinePassed: false
  });

  return await Complaint.findById(complaint._id).populate({
    path: "userId",
    select: "name email"
  });
}

async function getCompanyUserIds(companyId) {
  if (!companyId) return [];
  const users = await User.find({ companyId }).select("_id").lean();
  return users.map((user) => user._id);
}

async function buildCompanyScope(companyId) {
  if (!companyId) return {};

  const companyUserIds = await getCompanyUserIds(companyId);

  return {
    $or: [
      { companyId },
      ...(companyUserIds.length
        ? [
            { companyId: { $exists: false }, userId: { $in: companyUserIds } },
            { companyId: null, userId: { $in: companyUserIds } }
          ]
        : [])
    ]
  };
}

export async function getAllComplaints(filters = {}, companyId = null) {
  const query = {};

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;

  const companyScope = await buildCompanyScope(companyId);

  const complaints = await Complaint.find({ ...query, ...companyScope })
    .populate({ path: "userId", select: "name email role companyId" })
    .populate({ path: "repliedBy", select: "name email" })
    .sort({ createdAt: -1 });

  return complaints.map(complaint => ({
    ...complaint.toObject(),
    deadlineStatus: complaint.deadlineDate ? getDeadlineStatus(complaint.deadlineDate) : "Unknown"
  }));
}

export async function getUserComplaints(userId) {
  const complaints = await Complaint.find({ userId })
    .populate({ path: "userId", select: "name email phone role companyId" })
    .populate({ path: "repliedBy", select: "name email" })
    .sort({ createdAt: -1 });

  return complaints.map(complaint => ({
    ...complaint.toObject(),
    deadlineStatus: complaint.deadlineDate ? getDeadlineStatus(complaint.deadlineDate) : "Unknown"
  }));
}

export async function getComplaintById(complaintId) {
  const complaint = await Complaint.findById(complaintId)
    .populate({ path: "userId", select: "name email phone role companyId" })
    .populate({ path: "repliedBy", select: "name email" });

  if (!complaint) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }

  return {
    ...complaint.toObject(),
    deadlineStatus: complaint.deadlineDate ? getDeadlineStatus(complaint.deadlineDate) : "Unknown"
  };
}

export async function replyComplaint(complaintId, adminId, replyData) {
  const complaint = await Complaint.findById(complaintId);

  if (!complaint) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }

  complaint.replyMessage = replyData.replyMessage;
  complaint.repliedBy = adminId;
  complaint.repliedAt = new Date();
  complaint.status = replyData.status || "RESOLVED";
  
  // Safe check in case deadlineDate is missing from legacy data
  if (complaint.deadlineDate) {
    const isOnTime = !isDeadlineExpired(complaint.deadlineDate);
    complaint.isDeadlinePassed = !isOnTime;
  }

  await complaint.save();

  return await Complaint.findById(complaint._id).populate([
    { path: "userId", select: "name email" },
    { path: "repliedBy", select: "name email" }
  ]);
}

export async function updateComplaintStatus(complaintId, newStatus) {
  const complaint = await Complaint.findByIdAndUpdate(
    complaintId,
    { $set: { status: newStatus } },
    { returnDocument: "after" }
  );

  if (!complaint) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }

  return await Complaint.findById(complaint._id).populate([
    { path: "userId", select: "name email" },
    { path: "repliedBy", select: "name email" }
  ]);
}

export async function submitSatisfaction(complaintId, userId, data) {
  const complaint = await Complaint.findById(complaintId);

  if (!complaint) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Complaint not found");
  }

  if (complaint.userId.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not authorized to rate this complaint");
  }

  if (complaint.status !== "RESOLVED" && complaint.status !== "CLOSED") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Can only rate resolved or closed complaints");
  }

  complaint.satisfactionRating = data.satisfactionRating;
  complaint.satisfactionComment = data.satisfactionComment || "";

  await complaint.save();
  return complaint;
}

export async function getComplaintsStats(companyId = null) {
  const companyScope = await buildCompanyScope(companyId);
  const [total, open, resolved, overDeadline] = await Promise.all([
    Complaint.countDocuments({ ...companyScope }),
    Complaint.countDocuments({ ...companyScope, status: "OPEN" }),
    Complaint.countDocuments({ ...companyScope, status: "RESOLVED" }),
    Complaint.countDocuments({ ...companyScope, isDeadlinePassed: true, status: { $ne: "CLOSED" } })
  ]);

  return {
    total,
    open,
    resolved,
    overDeadline,
    resolutionRate: total ? Math.round((resolved / total) * 100) : 0
  };
}

export async function searchComplaints(searchTerm, filters = {}, companyId = null) {
  const query = {
    $or: [
      { subject: { $regex: searchTerm, $options: "i" } },
      { message: { $regex: searchTerm, $options: "i" } }
    ]
  };

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;

  const companyScope = await buildCompanyScope(companyId);

  return await Complaint.find({ ...query, ...companyScope })
    .populate({ path: "userId", select: "name email companyId" })
    .populate({ path: "repliedBy", select: "name email" })
    .sort({ createdAt: -1 });
}