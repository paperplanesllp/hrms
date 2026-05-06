import mongoose from "mongoose";
import dotenv from "dotenv";

import { User } from "../src/modules/users/User.model.js";
import { Department } from "../src/modules/department/Department.model.js";
import { Designation } from "../src/modules/department/Designation.model.js";
import { Event } from "../src/modules/calendar/Event.model.js"; // ⭐ ADD THIS (fix path if needed)

dotenv.config();

const companyIdArg = process.argv[2];

if (!companyIdArg) {
  console.error("Usage: node scripts/migrate-company-id.js <companyId>");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set in server/.env");
  process.exit(1);
}

// ✅ Always convert to ObjectId (important)
const companyId = new mongoose.Types.ObjectId(companyIdArg);

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ DB Connected");

  // USERS
  const userResult = await User.updateMany(
    {
      $or: [{ companyId: { $exists: false } }, { companyId: null }],
      role: { $ne: "SUPERADMIN" },
    },
    { $set: { companyId } }
  );

  // DEPARTMENTS
  const deptResult = await Department.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId } }
  );

  // DESIGNATIONS
  const desigResult = await Designation.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId } }
  );

  // ⭐ EVENTS (NEW)
  const eventResult = await Event.updateMany(
    { $or: [{ companyId: { $exists: false } }, { companyId: null }] },
    { $set: { companyId } }
  );

  console.log("Users updated:", userResult.modifiedCount);
  console.log("Departments updated:", deptResult.modifiedCount);
  console.log("Designations updated:", desigResult.modifiedCount);
  console.log("Events updated:", eventResult.modifiedCount); // ⭐ NEW

  await mongoose.disconnect();
  console.log("✅ Migration completed");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});