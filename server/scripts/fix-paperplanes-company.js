import mongoose from "mongoose";
import dotenv from "dotenv";

import { Company } from "../src/modules/companies/Company.model.js";
import { User } from "../src/modules/users/User.model.js";

dotenv.config();

const PAPERPLANES_DOMAIN = "paperplanesco.com";

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected");

  const company = await Company.findOne({
    name: { $regex: "paperplanes", $options: "i" },
  });

  if (!company) {
    console.error("No Company found with name matching Paperplanes");
    process.exitCode = 1;
    return;
  }

  if (!company.domain) {
    company.domain = PAPERPLANES_DOMAIN;
    await company.save();
    console.log("Set Paperplanes domain:", PAPERPLANES_DOMAIN);
  } else {
    console.log("Paperplanes domain already set:", company.domain);
  }

  const result = await User.updateMany(
    {
      role: "HR",
      email: { $regex: `@${PAPERPLANES_DOMAIN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      $or: [{ companyId: null }, { companyId: { $exists: false } }],
    },
    { $set: { companyId: company._id } }
  );

  console.log("Paperplanes HR users updated:", result.modifiedCount);
  await mongoose.disconnect();
  console.log("Migration completed");
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
