/**
 * Emergency admin password reset script.
 * Run: node scripts/reset-admin-password.js
 * from the server/ directory.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const ADMIN_EMAIL    = process.env.RESET_EMAIL    || "admin@gmail.com";
const NEW_PASSWORD   = process.env.RESET_PASSWORD || "Admin@123456";

const userSchema = new mongoose.Schema({
  email:             { type: String, lowercase: true },
  passwordHash:      { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  accountLocked:     { type: Boolean, default: false },
  lockUntil:         { type: Date },
}, { strict: false });

const User = mongoose.model("User", userSchema);

async function resetPassword() {
  console.log("Connecting to MongoDB…");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected.");

  const user = await User.findOne({ email: ADMIN_EMAIL });
  if (!user) {
    console.error(`❌  No user found with email: ${ADMIN_EMAIL}`);
    console.log("Available emails:");
    const all = await User.find({}).select("email role");
    all.forEach(u => console.log(`  ${u.email}  (${u.role || "?"})`));
    process.exit(1);
  }

  const hash = await bcrypt.hash(NEW_PASSWORD, 10);
  user.passwordHash        = hash;
  user.failedLoginAttempts = 0;
  user.accountLocked       = false;
  user.lockUntil           = undefined;
  await user.save();

  console.log(`✅  Password reset for ${ADMIN_EMAIL}`);
  console.log(`    New password: ${NEW_PASSWORD}`);
  console.log("    Change it after logging in!");
  process.exit(0);
}

resetPassword().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
