import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../server/.env");
console.log("Loading .env from:", envPath);
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error("Error loading .env:", result.error);
}
console.log("Loaded env vars:", Object.keys(result.parsed || {}).length);

import { connectDB } from "../server/src/config/db.js";
import { LeaveType } from "../server/src/modules/leaveType/LeaveType.model.js";

await connectDB();

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

try {
  const existingCount = await LeaveType.countDocuments();
  
  if (existingCount > 0) {
    console.log("✅ Leave types already exist in database");
    console.log(`📊 Found ${existingCount} leave types`);
    process.exit(0);
  }

  const created = await LeaveType.insertMany(defaultLeaveTypes);
  console.log(`✅ Successfully seeded ${created.length} leave types`);
  console.log("📋 Leave types:");
  created.forEach(lt => console.log(`   - ${lt.name} (${lt.maxDaysPerYear} days/year)`));
  
  process.exit(0);
} catch (error) {
  console.error("❌ Error seeding leave types:", error.message);
  process.exit(1);
}
