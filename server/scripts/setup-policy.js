import mongoose from "mongoose";
import dotenv from "dotenv";
import Policy from "../src/modules/policy/Policy.model.js";
import { User } from "../src/modules/users/User.model.js";

dotenv.config();

async function setupPolicy() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Get first HR user (or create a default admin user ID)
    let admin = await User.findOne({ role: "HR" });
    
    if (!admin) {
      admin = await User.findOne({ role: "ADMIN" });
    }

    if (!admin) {
      console.error("❌ No HR or ADMIN user found in database");
      process.exit(1);
    }

    // Create or update the privacy policy
    const policyData = {
      title: "HR Policy Handbook - Paperplanes LLP 2026",
      content: "<h1>HR Policy Handbook</h1><p>See attached document for complete policy details.</p>",
      type: "privacy",
      createdBy: admin._id,
      updatedBy: admin._id,
      version: 1,
      attachments: [
        {
          filename: "HR Policy Handbook Paperplanes LLP_2026 (3).pdf",
          url: "/uploads/policy/HR Policy Handbook Paperplanes LLP_2026 (3).pdf",
          uploadedAt: new Date()
        }
      ]
    };

    // Try to update existing policy, or create new one
    const existingPolicy = await Policy.findOne({ type: "privacy" });
    
    if (existingPolicy) {
      Object.assign(existingPolicy, policyData);
      await existingPolicy.save();
      console.log("✅ Privacy policy updated successfully");
    } else {
      const newPolicy = new Policy(policyData);
      await newPolicy.save();
      console.log("✅ Privacy policy created successfully");
    }

    console.log("📄 Policy Details:");
    console.log(`  Title: ${policyData.title}`);
    console.log(`  Attachment: ${policyData.attachments[0].filename}`);
    console.log(`  URL: ${policyData.attachments[0].url}`);

    await mongoose.disconnect();
    console.log("✅ Done! You can now view the policy at /privacy-policy");
  } catch (error) {
    console.error("❌ Error setting up policy:", error);
    process.exit(1);
  }
}

setupPolicy();
