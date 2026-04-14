import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Task } from '../modules/tasks/Task.model.js';
import {
  TASK_TIMING_STATE,
  applyPauseDuration,
  calculateDueAt,
  normalizeTaskTiming,
  resolveTaskTimingState,
  syncTaskTimingFields,
} from '../modules/tasks/taskDeadline.utils.js';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 0;

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function ensureReminderFlags(task) {
  task.thirtyMinReminderSent = Boolean(task.thirtyMinReminderSent);
  task.fifteenMinReminderSent = Boolean(task.fifteenMinReminderSent);
  task.dueNowReminderSent = Boolean(task.dueNowReminderSent);
  task.overdueReminderSent = Boolean(task.overdueReminderSent);
}

function computePausedDurationFromEntries(task) {
  let pausedMs = 0;
  const entries = Array.isArray(task.pauseEntries) ? task.pauseEntries : [];

  for (const entry of entries) {
    const pausedAt = safeDate(entry?.pausedAt);
    if (!pausedAt) continue;

    const resumedAt = safeDate(entry?.resumedAt);
    if (resumedAt) {
      pausedMs += Math.max(0, resumedAt.getTime() - pausedAt.getTime());
      continue;
    }

    if (task.isPaused) {
      pausedMs += applyPauseDuration({ pausedDurationMs: 0, pausedDurationMinutes: 0, totalPausedTimeInSeconds: 0 }, pausedAt, new Date());
    }
  }

  return pausedMs;
}

function backfillTask(task) {
  let changed = false;

  const original = {
    timingState: task.timingState,
    pausedDurationMs: task.pausedDurationMs,
    startedAt: task.startedAt,
    dueAt: task.dueAt,
    thirtyMinReminderSent: task.thirtyMinReminderSent,
    fifteenMinReminderSent: task.fifteenMinReminderSent,
    dueNowReminderSent: task.dueNowReminderSent,
    overdueReminderSent: task.overdueReminderSent,
  };

  ensureReminderFlags(task);

  if (!task.startedAt) {
    const inferredStart = safeDate(task.currentSessionStartTime) || null;
    if (inferredStart) {
      task.startedAt = inferredStart;
      changed = true;
    }
  }

  if (!Number.isFinite(Number(task.pausedDurationMs)) || Number(task.pausedDurationMs) < 0) {
    const fromSeconds = Math.max(0, Number(task.totalPausedTimeInSeconds) || 0) * 1000;
    const fromEntries = computePausedDurationFromEntries(task);
    task.pausedDurationMs = Math.max(fromSeconds, fromEntries, 0);
    changed = true;
  }

  if (!task.pauseEntries || task.pauseEntries.length === 0) {
    if (!Number.isFinite(Number(task.pausedDurationMs))) {
      task.pausedDurationMs = 0;
      changed = true;
    }
  }

  if (task.startedAt && Number(task.estimatedMinutes) > 0 && !task.dueAt) {
    const computedDueAt = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);
    if (computedDueAt) {
      task.dueAt = computedDueAt;
      if (!task.dueDate) task.dueDate = computedDueAt;
      changed = true;
    }
  }

  syncTaskTimingFields(task, new Date());

  if (!task.startedAt) {
    task.timingState = TASK_TIMING_STATE.NOT_STARTED;
  }

  if (task.isPaused || task.status === 'paused' || task.status === 'on-hold') {
    task.timingState = TASK_TIMING_STATE.PAUSED;
  }

  if (task.status === 'completed') {
    task.timingState = TASK_TIMING_STATE.COMPLETED;
  }

  if (!task.timingState) {
    task.timingState = resolveTaskTimingState(task, new Date());
  }

  if (
    original.timingState !== task.timingState ||
    Number(original.pausedDurationMs || 0) !== Number(task.pausedDurationMs || 0) ||
    String(original.startedAt || '') !== String(task.startedAt || '') ||
    String(original.dueAt || '') !== String(task.dueAt || '') ||
    original.thirtyMinReminderSent !== task.thirtyMinReminderSent ||
    original.fifteenMinReminderSent !== task.fifteenMinReminderSent ||
    original.dueNowReminderSent !== task.dueNowReminderSent ||
    original.overdueReminderSent !== task.overdueReminderSent
  ) {
    changed = true;
  }

  const normalized = normalizeTaskTiming(task);
  return { changed, normalized };
}

async function run() {
  const summary = {
    totalScanned: 0,
    totalUpdated: 0,
    skipped: 0,
    failed: 0,
    failures: [],
  };

  try {
    await connectDB();

    const query = Task.find({ isDeleted: false }).sort({ createdAt: 1 });
    if (limit > 0) query.limit(limit);

    const cursor = query.cursor();

    for await (const task of cursor) {
      summary.totalScanned += 1;

      try {
        const { changed, normalized } = backfillTask(task);

        if (!changed) {
          summary.skipped += 1;
          continue;
        }

        if (isDryRun) {
          summary.totalUpdated += 1;
          console.log('[DryRun] would-update', {
            taskId: task._id.toString(),
            normalizedTimingState: normalized.normalizedTimingState,
            remainingState: normalized.remainingState,
          });
          continue;
        }

        await task.save();
        summary.totalUpdated += 1;
        console.log('[Backfill] updated', {
          taskId: task._id.toString(),
          timingState: task.timingState,
          pausedDurationMs: task.pausedDurationMs,
        });
      } catch (error) {
        summary.failed += 1;
        summary.failures.push({ taskId: task._id?.toString?.() || null, message: error.message });
      }
    }

    console.log('[BackfillSummary]', {
      mode: isDryRun ? 'dry-run' : 'apply',
      totalScanned: summary.totalScanned,
      totalUpdated: summary.totalUpdated,
      skipped: summary.skipped,
      failed: summary.failed,
    });

    if (summary.failures.length > 0) {
      console.log('[BackfillFailures]', summary.failures.slice(0, 20));
    }
  } finally {
    await mongoose.connection.close();
  }
}

run().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
