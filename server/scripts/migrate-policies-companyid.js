import mongoose from "mongoose";
import dotenv from "dotenv";
import { Policies } from "../src/modules/policies/Policies.model.js";
import { User } from "../src/modules/users/User.model.js";
import { Company } from "../src/modules/companies/Company.model.js";

dotenv.config();

async function migratePolicies() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find policies without companyId
    const policiesWithoutCompany = await Policies.find({ companyId: { $exists: false } });
    console.log(`Found ${policiesWithoutCompany.length} policies without companyId`);

    if (policiesWithoutCompany.length === 0) {
      console.log("✅ All policies already have companyId");
      await mongoose.connection.close();
      return;
    }

    // Get the first company (assuming single company for now)
    const firstCompany = await Company.findOne();
    if (!firstCompany) {
      console.error("❌ No companies found in database");
      await mongoose.connection.close();
      return;
    }

    console.log(`Setting all policies to company: ${firstCompany.name} (${firstCompany._id})`);

    // Update all policies without companyId
    const result = await Policies.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: firstCompany._id } }
    );

    console.log(`✅ Updated ${result.modifiedCount} policies with companyId`);

    await mongoose.connection.close();
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
}

migratePolicies();
