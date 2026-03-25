import { LeaveType } from "./LeaveType.model.js";

export async function seedLeaveTypes() {
  try {
    const existingCount = await LeaveType.countDocuments();
    
    if (existingCount > 0) {
      console.log("✅ Leave types already seeded");
      return;
    }

    const defaultLeaveTypes = [
      {
        name: "Sick Leave",
        description: "For medical purposes or when employee is unwell",
        color: "#ef4444",
        icon: "heart",
        maxDaysPerYear: 10,
        requiresApproval: true,
        isActive: true
      },
      {
        name: "Vacation",
        description: "Annual vacation or planned leave",
        color: "#3b82f6",
        icon: "palm-tree",
        maxDaysPerYear: 20,
        requiresApproval: true,
        isActive: true
      },
      {
        name: "Personal",
        description: "Personal reasons or casual leave",
        color: "#8b5cf6",
        icon: "calendar",
        maxDaysPerYear: 5,
        requiresApproval: true,
        isActive: true
      },
      {
        name: "Emergency",
        description: "For immediate family emergencies",
        color: "#f97316",
        icon: "alert-circle",
        maxDaysPerYear: 3,
        requiresApproval: true,
        isActive: true
      },
      {
        name: "Maternity",
        description: "Maternity leave for female employees",
        color: "#ec4899",
        icon: "user",
        maxDaysPerYear: 90,
        requiresApproval: true,
        isActive: true
      },
      {
        name: "Bereavement",
        description: "Leave due to death of a family member",
        color: "#64748b",
        icon: "flower-2",
        maxDaysPerYear: 5,
        requiresApproval: true,
        isActive: true
      }
    ];

    const created = await LeaveType.insertMany(defaultLeaveTypes);
    console.log(`✅ Seeded ${created.length} leave types`);
  } catch (error) {
    console.error("❌ Error seeding leave types:", error.message);
  }
}
