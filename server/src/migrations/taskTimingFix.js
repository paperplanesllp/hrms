import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Task } from '../modules/tasks/Task.model.js';
import { normalizeTaskTiming, syncTaskTimingFields } from '../modules/tasks/taskDeadline.utils.js';

async function runMigration() {
  const summary = {
    totalScanned: 0,
    totalUpdated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    await connectDB();

    const cursor = Task.find({ isDeleted: false }).cursor();
    for await (const task of cursor) {
      summary.totalScanned += 1;

      try {
        const before = {
          timingState: task.timingState,
          pausedDurationMs: task.pausedDurationMs,
          dueAt: task.dueAt,
          startedAt: task.startedAt,
          thirtyMinReminderSent: task.thirtyMinReminderSent,
          fifteenMinReminderSent: task.fifteenMinReminderSent,
          dueNowReminderSent: task.dueNowReminderSent,
          overdueReminderSent: task.overdueReminderSent,
        };

        syncTaskTimingFields(task, new Date());
        const normalized = normalizeTaskTiming(task, new Date());

        task.thirtyMinReminderSent = Boolean(task.thirtyMinReminderSent);
        task.fifteenMinReminderSent = Boolean(task.fifteenMinReminderSent);
        task.dueNowReminderSent = Boolean(task.dueNowReminderSent);
        task.overdueReminderSent = Boolean(task.overdueReminderSent);

        const changed =
          String(before.timingState || '') !== String(task.timingState || '') ||
          Number(before.pausedDurationMs || 0) !== Number(task.pausedDurationMs || 0) ||
          String(before.dueAt || '') !== String(task.dueAt || '') ||
          String(before.startedAt || '') !== String(task.startedAt || '') ||
          before.thirtyMinReminderSent !== task.thirtyMinReminderSent ||
          before.fifteenMinReminderSent !== task.fifteenMinReminderSent ||
          before.dueNowReminderSent !== task.dueNowReminderSent ||
          before.overdueReminderSent !== task.overdueReminderSent;

        if (!changed) {
          summary.skipped += 1;
          continue;
        }

        await task.save();
        summary.totalUpdated += 1;
        console.log('[taskTimingFix] updated', {
          taskId: task._id.toString(),
          state: normalized.normalizedTimingState,
          label: normalized.remainingLabel,
        });
      } catch (error) {
        summary.failed += 1;
        console.error('[taskTimingFix] failed', { taskId: task._id?.toString?.(), message: error.message });
      }
    }

    console.log('[taskTimingFix] summary', summary);
  } finally {
    await mongoose.connection.close();
  }
}

runMigration().catch((error) => {
  console.error('[taskTimingFix] migration error', error);
  process.exit(1);
});
