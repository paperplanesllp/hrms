import mongoose from "mongoose";
import dotenv from "dotenv";

import { Task } from "../src/modules/tasks/Task.model.js";
import { User } from "../src/modules/users/User.model.js";

dotenv.config();

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set in server/.env");
  process.exit(1);
}

async function resolveTaskCompanyId(task) {
  if (task.assignedBy) {
    const assignedBy = await User.findById(task.assignedBy).select("companyId").lean();
    if (assignedBy?.companyId) return assignedBy.companyId;
  }

  const firstAssignee = Array.isArray(task.assignedTo) ? task.assignedTo[0] : null;
  if (firstAssignee) {
    const assignee = await User.findById(firstAssignee).select("companyId").lean();
    if (assignee?.companyId) return assignee.companyId;
  }

  return null;
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("DB connected");

  const cursor = Task.find({
    $or: [{ companyId: { $exists: false } }, { companyId: null }],
  })
    .select("_id assignedBy assignedTo")
    .cursor();

  let updatedCount = 0;
  let skippedCount = 0;
  const skippedTaskIds = [];

  for await (const task of cursor) {
    const companyId = await resolveTaskCompanyId(task);

    if (!companyId) {
      skippedCount += 1;
      skippedTaskIds.push(task._id.toString());
      continue;
    }

    await Task.updateOne(
      {
        _id: task._id,
        $or: [{ companyId: { $exists: false } }, { companyId: null }],
      },
      { $set: { companyId } }
    );
    updatedCount += 1;
  }

  console.log("Task companyId backfill completed");
  console.log("Updated count:", updatedCount);
  console.log("Skipped count:", skippedCount);
  console.log("Skipped task ids:", skippedTaskIds.length ? skippedTaskIds.join(", ") : "none");

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Task companyId backfill failed:", error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
