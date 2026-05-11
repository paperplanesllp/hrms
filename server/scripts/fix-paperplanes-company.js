import mongoose from "mongoose";
import dotenv from "dotenv";

import { Company } from "../src/modules/companies/Company.model.js";
import { User } from "../src/modules/users/User.model.js";
import { ROLES } from "../src/middleware/roles.js";

dotenv.config();

const PAPERPLANES_NAME = "Paperplanes";
const PAPERPLANES_DOMAIN = "paperplanesco.com";
const PAPERPLANES_CONTACT_EMAIL = "stephen@paperplanesco.com";

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in server/.env");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected");

  const company = await Company.findOneAndUpdate(
    {
      $or: [
        { domain: PAPERPLANES_DOMAIN },
        { name: { $regex: escapeRegex(PAPERPLANES_NAME), $options: "i" } },
        { contactEmail: PAPERPLANES_CONTACT_EMAIL },
      ],
    },
    {
      $set: {
        name: PAPERPLANES_NAME,
        domain: PAPERPLANES_DOMAIN,
        contactEmail: PAPERPLANES_CONTACT_EMAIL,
        isActive: true,
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  console.log("Ensured Paperplanes company:", String(company._id));

  const result = await User.updateMany(
    {
      email: { $regex: `@${escapeRegex(PAPERPLANES_DOMAIN)}$`, $options: "i" },
      role: { $in: [ROLES.ADMIN, ROLES.HR, ROLES.USER] },
    },
    { $set: { companyId: company._id } }
  );

  console.log("Paperplanes users matched:", result.matchedCount);
  console.log("Paperplanes users updated:", result.modifiedCount);
  await mongoose.disconnect();
  console.log("Migration completed");
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  await mongoose.disconnect().catch(() => null);
  process.exit(1);
});
