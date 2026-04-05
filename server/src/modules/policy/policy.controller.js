import { asyncHandler } from "../../utils/asyncHandler.js";
import { createPolicy, getPolicy, updatePolicy, markPolicyViewed, getCompanyPolicy, updateCompanyPolicy } from "./policy.service.js";
import { createBulkNotifications } from "../notifications/notification.service.js";
import { User } from "../users/User.model.js";

export const getPrivacyPolicy = asyncHandler(async (req, res) => {
  const policy = await getPolicy();
  res.json(policy);
});

export const updatePrivacyPolicy = asyncHandler(async (req, res) => {
  // Convert string boolean from FormData to actual boolean
  if (req.body.sendNotification) {
    req.body.sendNotification = req.body.sendNotification === 'true';
  }

  const data = {
    title: req.body.title,
    content: req.body.content,
    attachments: []
  };

  // Handle file uploads
  if (req.files && req.files.length > 0) {
    data.attachments = req.files.map(file => ({
      filename: file.originalname,
      url: `/uploads/policy/${file.filename}`
    }));
  }

  const policy = await updatePolicy(req.user.id, data);
  
  // Create notifications for all users
  const users = await User.find({}).select('_id');
  const userIds = users.map(user => user._id);
  
  await createBulkNotifications({
    userIds,
    type: "policy",
    title: "Policy Update: " + policy.title,
    message: "Please review the updated privacy policy",
    targetUrl: "/privacy-policy",
    policyId: policy._id,
    isPolicyUpdate: true
  });
  
  res.json({ policy, updated: true });
});

export const markViewed = asyncHandler(async (req, res) => {
  const policy = await markPolicyViewed(req.user.id);
  res.json({ ok: true, policy });
});

// Company Policy endpoints
export const getCompanyPolicyHandler = asyncHandler(async (req, res) => {
  const policy = await getCompanyPolicy();
  res.json(policy);
});

export const updateCompanyPolicyHandler = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  
  const policy = await updateCompanyPolicy(req.user.id, { title, content });
  
  res.json(policy);
});

// Policy update notification endpoint
export const sendPolicyUpdateNotification = asyncHandler(async (req, res) => {
  const { message, isPolicyUpdate } = req.body;
  
  // Get all users
  const users = await User.find({}).select('_id');
  const userIds = users.map(user => user._id);
  
  await createBulkNotifications({
    userIds,
    type: "policy",
    title: "Policy Update",
    message: message || "Company policies have been updated. Please review the changes.",
    targetUrl: "/policy",
    isPolicyUpdate: isPolicyUpdate || true
  });
  
  res.json({ success: true, message: "Notifications sent to all users" });
});