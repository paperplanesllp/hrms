/**
 * Sample Activity Log Seed Data
 * For testing and demo purposes
 * Can be used with MongoDB seed scripts or manually added to database
 */

export const ACTIVITY_LOG_SEED_DATA = [
  // LOGIN/LOGOUT Activities
  {
    actorId: "objectIdPlaceholder1",
    actorName: "John Doe",
    actorRole: "HR",
    targetUserId: null,
    targetUserName: null,
    actionType: "LOGIN",
    module: "AUTH",
    description: "HR John Doe logged in",
    metadata: { email: "john@company.com", userAgent: "Mozilla/5.0..." },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    actorId: "objectIdPlaceholder2",
    actorName: "Jane Smith",
    actorRole: "ADMIN",
    targetUserId: null,
    targetUserName: null,
    actionType: "LOGIN",
    module: "AUTH",
    description: "ADMIN Jane Smith logged in",
    metadata: { email: "jane@company.com" },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    actorId: "objectIdPlaceholder3",
    actorName: "Employee One",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "LOGOUT",
    module: "AUTH",
    description: "User Employee One logged out",
    metadata: { email: "employee1@company.com" },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
  },

  // PROFILE UPDATE Activities
  {
    actorId: "objectIdPlaceholder3",
    actorName: "Employee One",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "PROFILE_UPDATE",
    module: "PROFILE",
    description:
      "User Employee One updated personal profile (phone, emergencyContact, dateOfBirth)",
    metadata: {
      updatedFields: ["phone", "emergencyContact", "dateOfBirth"],
      changes: {
        phone: "+1-555-0123",
        emergencyContact: "John Doe",
        dateOfBirth: "1990-05-15",
      },
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },

  {
    actorId: "objectIdPlaceholder4",
    actorName: "Employee Two",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "PROFILE_UPDATE",
    module: "PROFILE",
    description: "User Employee Two updated personal profile (profileImageUrl)",
    metadata: {
      updatedFields: ["profileImageUrl"],
      changes: {
        profileImageUrl: "/uploads/profile-images/emp2_avatar.jpg",
      },
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },

  // LEAVE Activities
  {
    actorId: "objectIdPlaceholder5",
    actorName: "Employee Three",
    actorRole: "USER",
    targetUserId: "objectIdPlaceholder5",
    targetUserName: "Employee Three",
    actionType: "LEAVE_REQUEST",
    module: "LEAVE",
    description: "User Employee Three requested leave for 2024-03-20 to 2024-03-22",
    metadata: {
      leaveType: "Annual Leave",
      startDate: "2024-03-20",
      endDate: "2024-03-22",
      days: 3,
      reason: "Personal vacation",
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
  },

  {
    actorId: "objectIdPlaceholder1",
    actorName: "John Doe",
    actorRole: "HR",
    targetUserId: "objectIdPlaceholder5",
    targetUserName: "Employee Three",
    actionType: "LEAVE_APPROVAL",
    module: "LEAVE",
    description: "HR John Doe approved leave request for Employee Three",
    metadata: {
      leaveId: "leave_123",
      leaveType: "Annual Leave",
      startDate: "2024-03-20",
      endDate: "2024-03-22",
      approvalReason: "Approved - Within quota",
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
  },

  {
    actorId: "objectIdPlaceholder1",
    actorName: "John Doe",
    actorRole: "HR",
    targetUserId: "objectIdPlaceholder6",
    targetUserName: "Employee Four",
    actionType: "LEAVE_REJECTION",
    module: "LEAVE",
    description: "HR John Doe rejected leave request for Employee Four",
    metadata: {
      leaveId: "leave_124",
      leaveType: "Casual Leave",
      startDate: "2024-03-15",
      endDate: "2024-03-15",
      rejectionReason: "Insufficient notice period",
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
  },

  // ATTENDANCE Activities
  {
    actorId: "objectIdPlaceholder3",
    actorName: "Employee One",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "ATTENDANCE_CHECKIN",
    module: "ATTENDANCE",
    description: "User Employee One checked in at 09:00 AM",
    metadata: {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 15,
      locationName: "New York Office",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },

  {
    actorId: "objectIdPlaceholder4",
    actorName: "Employee Two",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "ATTENDANCE_CHECKOUT",
    module: "ATTENDANCE",
    description: "User Employee Two checked out at 05:30 PM",
    metadata: {
      latitude: 40.7128,
      longitude: -74.006,
      accuracy: 18,
      locationName: "New York Office",
      workDuration: "8 hours 30 minutes",
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
  },

  // DOCUMENT Activities
  {
    actorId: "objectIdPlaceholder3",
    actorName: "Employee One",
    actorRole: "USER",
    targetUserId: null,
    targetUserName: null,
    actionType: "DOCUMENT_UPLOAD",
    module: "DOCUMENT",
    description: "User Employee One uploaded document: Certificate.pdf",
    metadata: {
      documentType: "Certification",
      filename: "Certificate.pdf",
      fileSize: "2.5 MB",
      uploadedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },

  // EMPLOYEE Management Activities
  {
    actorId: "objectIdPlaceholder1",
    actorName: "John Doe",
    actorRole: "HR",
    targetUserId: "objectIdPlaceholder7",
    targetUserName: "New Employee",
    actionType: "EMPLOYEE_CREATE",
    module: "EMPLOYEE",
    description: "HR John Doe created new employee account: New Employee",
    metadata: {
      email: "newemployee@company.com",
      designation: "Software Engineer",
      department: "IT",
      employeeId: "EMP-2024-001",
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  },

  {
    actorId: "objectIdPlaceholder1",
    actorName: "John Doe",
    actorRole: "HR",
    targetUserId: "objectIdPlaceholder3",
    targetUserName: "Employee One",
    actionType: "EMPLOYEE_UPDATE",
    module: "EMPLOYEE",
    description: "HR John Doe updated employee details: Employee One",
    metadata: {
      updatedFields: ["designation", "department"],
      changes: {
        oldDesignation: "Junior Developer",
        newDesignation: "Senior Developer",
        oldDepartment: "IT",
        newDepartment: "IT",
      },
    },
    visibility: "PUBLIC",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
  },

  // ADMIN Activities
  {
    actorId: "objectIdPlaceholder2",
    actorName: "Jane Smith",
    actorRole: "ADMIN",
    targetUserId: null,
    targetUserName: null,
    actionType: "ADMIN_ACTION",
    module: "ADMIN",
    description: "ADMIN Jane Smith updated system configuration: Security Policy",
    metadata: {
      configKey: "security.passwordPolicy",
      oldValue: { minLength: 8, requireSpecialChar: false },
      newValue: { minLength: 12, requireSpecialChar: true },
    },
    visibility: "ADMIN_ONLY",
    createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000), // 18 hours ago
  },

  {
    actorId: "objectIdPlaceholder2",
    actorName: "Jane Smith",
    actorRole: "ADMIN",
    targetUserId: "objectIdPlaceholder1",
    targetUserName: "John Doe",
    actionType: "ADMIN_ACTION",
    module: "ADMIN",
    description: "ADMIN Jane Smith reviewed HR activity: John Doe's actions",
    metadata: {
      auditReason: "Routine compliance review",
      actionsReviewed: 15,
      period: "Last 30 days",
    },
    visibility: "ADMIN_ONLY",
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000), // 36 hours ago
  },
];

/**
 * Example API Response Format for HR Timeline
 */
export const EXAMPLE_HR_TIMELINE_RESPONSE = {
  data: [
    {
      _id: "607f1f77bcf86cd799439011",
      actorId: {
        _id: "607f1f77bcf86cd799439010",
        name: "John Doe",
        email: "john@company.com",
        role: "HR",
        profileImageUrl: "/uploads/profile-images/john.jpg",
      },
      actorName: "John Doe",
      actorRole: "HR",
      targetUserId: {
        _id: "607f1f77bcf86cd799439012",
        name: "Employee One",
        email: "emp1@company.com",
        role: "USER",
        profileImageUrl: "/uploads/profile-images/emp1.jpg",
      },
      targetUserName: "Employee One",
      actionType: "LEAVE_APPROVAL",
      module: "LEAVE",
      description: "HR John Doe approved leave request for Employee One",
      metadata: {
        leaveId: "leave_123",
        leaveType: "Annual Leave",
        startDate: "2024-03-20",
        endDate: "2024-03-22",
        approvalReason: "Approved - Within quota",
      },
      visibility: "PUBLIC",
      createdAt: "2024-03-14T10:30:00Z",
      updatedAt: "2024-03-14T10:30:00Z",
    },
    {
      _id: "607f1f77bcf86cd799439013",
      actorId: {
        _id: "607f1f77bcf86cd799439012",
        name: "Employee One",
        email: "emp1@company.com",
        role: "USER",
        profileImageUrl: "/uploads/profile-images/emp1.jpg",
      },
      actorName: "Employee One",
      actorRole: "USER",
      targetUserId: null,
      targetUserName: null,
      actionType: "PROFILE_UPDATE",
      module: "PROFILE",
      description:
        "User Employee One updated personal profile (phone, emergencyContact)",
      metadata: {
        updatedFields: ["phone", "emergencyContact"],
        changes: {
          phone: "+1-555-0123",
          emergencyContact: "Jane Doe",
        },
      },
      visibility: "PUBLIC",
      createdAt: "2024-03-14T09:15:00Z",
      updatedAt: "2024-03-14T09:15:00Z",
    },
  ],
  total: 45,
  limit: 50,
  skip: 0,
  pages: 1,
  message: "HR timeline retrieved successfully",
};

/**
 * Example API Response Format for Admin Timeline
 */
export const EXAMPLE_ADMIN_TIMELINE_RESPONSE = {
  data: [
    {
      _id: "607f1f77bcf86cd799439014",
      actorId: {
        _id: "607f1f77bcf86cd799439010",
        name: "John Doe",
        email: "john@company.com",
        role: "HR",
        profileImageUrl: "/uploads/profile-images/john.jpg",
      },
      actorName: "John Doe",
      actorRole: "HR",
      targetUserId: null,
      targetUserName: null,
      actionType: "LOGIN",
      module: "AUTH",
      description: "HR John Doe logged in",
      metadata: {
        email: "john@company.com",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      },
      visibility: "PUBLIC",
      createdAt: "2024-03-14T08:00:00Z",
      updatedAt: "2024-03-14T08:00:00Z",
    },
    {
      _id: "607f1f77bcf86cd799439015",
      actorId: {
        _id: "607f1f77bcf86cd799439010",
        name: "John Doe",
        email: "john@company.com",
        role: "HR",
        profileImageUrl: "/uploads/profile-images/john.jpg",
      },
      actorName: "John Doe",
      actorRole: "HR",
      targetUserId: "607f1f77bcf86cd799439012",
      targetUserName: "Employee One",
      actionType: "EMPLOYEE_UPDATE",
      module: "EMPLOYEE",
      description: "HR John Doe updated employee details: Employee One",
      metadata: {
        updatedFields: ["designation"],
        changes: {
          oldDesignation: "Junior Developer",
          newDesignation: "Senior Developer",
        },
      },
      visibility: "PUBLIC",
      createdAt: "2024-03-14T10:00:00Z",
      updatedAt: "2024-03-14T10:00:00Z",
    },
  ],
  total: 32,
  limit: 50,
  skip: 0,
  pages: 1,
  message: "Admin timeline retrieved successfully",
};

/**
 * Helper function to convert seed data to MongoDB format
 * This would typically be used in a seed script
 */
export async function seedActivityLogs(ActivityLogModel) {
  try {
    // Clear existing logs (optional)
    // await ActivityLogModel.deleteMany({});

    // Insert seed data
    const inserted = await ActivityLogModel.insertMany(ACTIVITY_LOG_SEED_DATA);
    console.log(`✅ Successfully seeded ${inserted.length} activity logs`);
    return inserted;
  } catch (error) {
    console.error("❌ Error seeding activity logs:", error);
    throw error;
  }
}
