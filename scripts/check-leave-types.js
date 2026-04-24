import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

import mongoose from "mongoose";

const leaveTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: "" },
  color: { type: String, default: "#3b82f6" },
  icon: { type: String, default: "calendar" },
  maxDaysPerYear: { type: Number, default: 5 },
  requiresApproval: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const LeaveType = mongoose.model("LeaveType", leaveTypeSchema);

try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Connected to MongoDB");

  const count = await LeaveType.countDocuments();
  console.log(`📊 Found ${count} leave types in database`);

  if (count === 0) {
    console.log("🌱 Seeding leave types...");
    
    const types = [
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

    const created = await LeaveType.insertMany(types);
    console.log(`✅ Seeded ${created.length} leave types`);
    created.forEach(t => console.log(`   ✓ ${t.name}`));
  } else {
    const types = await LeaveType.find();
    console.log("📋 Existing leave types:");
    types.forEach(t => console.log(`   ✓ ${t.name} (${t.maxDaysPerYear} days/year)`));
  }

  process.exit(0);
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
