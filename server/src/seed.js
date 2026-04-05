import { connectDB } from "./config/db.js";
import { User } from "./modules/users/User.model.js";
import { seedLeaveTypes } from "./modules/leaveType/leaveType.seed.js";
import bcrypt from "bcryptjs";
import { ROLES } from "./middleware/roles.js";
import dotenv from "dotenv";

dotenv.config();

await connectDB();

async function upsertUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const exists = await User.findOne({ email });

  if (exists) {
    exists.name = name;
    exists.role = role;
    exists.passwordHash = passwordHash;
    await exists.save();
    console.log("Updated:", email);
    return;
  }

  await User.create({ name, email, role, passwordHash });
  console.log("Created:", email);
}

// Parse seed users from environment variable
const seedUsersEnv = process.env.SEED_USERS;
if (!seedUsersEnv) {
  console.error("❌ SEED_USERS environment variable not set in .env");
  process.exit(1);
}

// Parse format: email|password|name|role,email|password|name|role
const seedUsers = seedUsersEnv.split(",").map(user => {
  const [email, password, name, role] = user.split("|");
  return { email, password, name, role };
});

// Create all seed users
for (const user of seedUsers) {
  await upsertUser({
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role
  });
}

// Seed leave types
await seedLeaveTypes();

console.log("✅ Seed complete");
process.exit(0);