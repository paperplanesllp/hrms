import Policy from "./Policy.model.js";

export const createPolicy = async (userId, data) => {
  const policy = new Policy({
    ...data,
    createdBy: userId,
    version: 1
  });
  return await policy.save();
};

export const getPolicy = async () => {
  return await Policy.findOne({ type: 'privacy' })
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .sort({ updatedAt: -1 });
};

export const updatePolicy = async (userId, data) => {
  const existingPolicy = await Policy.findOne({ type: 'privacy' });
  
  if (existingPolicy) {
    existingPolicy.content = data.content;
    existingPolicy.title = data.title || existingPolicy.title;
    existingPolicy.updatedBy = userId;
    existingPolicy.version += 1;
    existingPolicy.viewedBy = []; // Reset viewed list on update
    
    if (data.attachments) {
      existingPolicy.attachments = data.attachments;
    }
    
    return await existingPolicy.save();
  } else {
    return await createPolicy(userId, { ...data, type: 'privacy' });
  }
};

export const markPolicyViewed = async (userId) => {
  const policy = await Policy.findOne({ type: 'privacy' });
  if (policy && !policy.viewedBy.includes(userId)) {
    policy.viewedBy.push(userId);
    await policy.save();
  }
  return policy;
};

// Company Policy functions
export const getCompanyPolicy = async (companyId) => {
  if (!companyId) return null;
  return await Policy.findOne({ type: 'company', companyId })
    .populate("createdBy", "name")
    .populate("updatedBy", "name")
    .sort({ updatedAt: -1 });
};

export const updateCompanyPolicy = async (userId, data, companyId) => {
  if (!companyId) throw new Error('Company ID is required');
  
  const existingPolicy = await Policy.findOne({ type: 'company', companyId });
  
  if (existingPolicy) {
    existingPolicy.content = data.content;
    existingPolicy.title = data.title || existingPolicy.title;
    existingPolicy.updatedBy = userId;
    existingPolicy.version += 1;
    existingPolicy.updatedAt = new Date();
    
    return await existingPolicy.save();
  } else {
    return await createPolicy(userId, { 
      ...data, 
      type: 'company',
      companyId,
      version: 1
    });
  }
};