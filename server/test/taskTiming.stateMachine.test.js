import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TASK_TIMING_STATE,
  REMAINING_STATE,
  applyPauseDuration,
  calculateDueAt,
  getRemainingMs,
  getRemainingState,
  normalizeTaskTiming,
  shouldSendReminder,
} from '../src/modules/tasks/taskDeadline.utils.js';

function makeTask(overrides = {}) {
  return {
    createdAt: new Date('2026-04-14T04:00:00.000Z'),
    startedAt: null,
    estimatedMinutes: 120,
    pausedDurationMs: 0,
    pausedDurationMinutes: 0,
    status: 'pending',
    timingState: TASK_TIMING_STATE.NOT_STARTED,
    isPaused: false,
    isRunning: false,
    thirtyMinReminderSent: false,
    fifteenMinReminderSent: false,
    dueNowReminderSent: false,
    overdueReminderSent: false,
    ...overrides,
  };
}

test('start task sets startedAt, dueAt, in_progress', () => {
  const startedAt = new Date('2026-04-14T10:00:00.000Z');
  const task = makeTask({ startedAt, status: 'in-progress', timingState: TASK_TIMING_STATE.IN_PROGRESS, isRunning: true });

  const dueAt = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);
  assert.ok(dueAt);
  assert.equal(dueAt.getTime(), startedAt.getTime() + 120 * 60 * 1000);
  assert.equal(task.timingState, TASK_TIMING_STATE.IN_PROGRESS);
});

test('pause and resume increase pausedDurationMs and extend dueAt', () => {
  const startedAt = new Date('2026-04-14T10:00:00.000Z');
  const task = makeTask({ startedAt, status: 'in-progress', timingState: TASK_TIMING_STATE.IN_PROGRESS, isRunning: true });

  const dueBefore = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);
  const pauseStart = new Date('2026-04-14T10:20:00.000Z');
  const resumeTime = new Date('2026-04-14T10:30:00.000Z');

  const applied = applyPauseDuration(task, pauseStart, resumeTime);
  task.isPaused = false;
  task.status = 'in-progress';
  task.timingState = TASK_TIMING_STATE.IN_PROGRESS;

  const dueAfter = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);

  assert.equal(applied, 10 * 60 * 1000);
  assert.equal(task.pausedDurationMs, 10 * 60 * 1000);
  assert.equal(dueAfter.getTime() - dueBefore.getTime(), 10 * 60 * 1000);
});

test('overdue transition happens only after dueAt', () => {
  const task = makeTask({
    startedAt: new Date('2026-04-14T10:00:00.000Z'),
    estimatedMinutes: 10,
    status: 'in-progress',
    timingState: TASK_TIMING_STATE.IN_PROGRESS,
  });

  const before = normalizeTaskTiming(task, new Date('2026-04-14T10:09:59.000Z'));
  const after = normalizeTaskTiming(task, new Date('2026-04-14T10:10:01.000Z'));

  assert.equal(before.isOverdue, false);
  assert.equal(after.isOverdue, true);
});

test('completed task remains completed state and does not show active countdown state', () => {
  const task = makeTask({
    startedAt: new Date('2026-04-14T10:00:00.000Z'),
    status: 'completed',
    timingState: TASK_TIMING_STATE.COMPLETED,
  });

  const normalized = normalizeTaskTiming(task, new Date('2026-04-14T11:00:00.000Z'));
  assert.equal(normalized.remainingState, REMAINING_STATE.COMPLETED);
  assert.equal(normalized.remainingLabel, 'Completed');
});

test('reminders are idempotent across repeated runs', () => {
  const task = makeTask({
    startedAt: new Date('2026-04-14T10:00:00.000Z'),
    estimatedMinutes: 60,
    status: 'in-progress',
    timingState: TASK_TIMING_STATE.IN_PROGRESS,
  });

  const at30 = new Date('2026-04-14T10:30:00.000Z');
  assert.equal(shouldSendReminder(task, '30m', at30), true);
  task.thirtyMinReminderSent = true;
  assert.equal(shouldSendReminder(task, '30m', at30), false);

  const at15 = new Date('2026-04-14T10:45:00.000Z');
  assert.equal(shouldSendReminder(task, '15m', at15), true);
  task.fifteenMinReminderSent = true;
  assert.equal(shouldSendReminder(task, '15m', at15), false);

  const dueNow = new Date('2026-04-14T11:00:00.000Z');
  assert.equal(shouldSendReminder(task, 'due-now', dueNow), true);
  task.dueNowReminderSent = true;
  assert.equal(shouldSendReminder(task, 'due-now', dueNow), false);

  const overdue = new Date('2026-04-14T11:01:00.000Z');
  assert.equal(shouldSendReminder(task, 'overdue', overdue), true);
  task.overdueReminderSent = true;
  assert.equal(shouldSendReminder(task, 'overdue', overdue), false);
});

test('edge cases: missing estimate, never started, invalid negative values, multiple pauses', () => {
  const neverStarted = makeTask({ startedAt: null, estimatedMinutes: 0 });
  assert.equal(getRemainingState(neverStarted), REMAINING_STATE.NOT_STARTED);

  const noEstimate = makeTask({ startedAt: new Date('2026-04-14T10:00:00.000Z'), estimatedMinutes: 0 });
  assert.equal(getRemainingState(noEstimate), REMAINING_STATE.NO_ESTIMATE);

  const invalid = makeTask({ startedAt: new Date('2026-04-14T10:00:00.000Z'), estimatedMinutes: -30, pausedDurationMs: -5000 });
  assert.equal(getRemainingState(invalid), REMAINING_STATE.NO_ESTIMATE);

  const multiPause = makeTask({ startedAt: new Date('2026-04-14T10:00:00.000Z'), estimatedMinutes: 120, status: 'in-progress' });
  applyPauseDuration(multiPause, new Date('2026-04-14T10:10:00.000Z'), new Date('2026-04-14T10:20:00.000Z'));
  applyPauseDuration(multiPause, new Date('2026-04-14T10:40:00.000Z'), new Date('2026-04-14T10:50:00.000Z'));
  assert.equal(multiPause.pausedDurationMs, 20 * 60 * 1000);

  const remainingMs = getRemainingMs(multiPause, new Date('2026-04-14T11:00:00.000Z'));
  assert.ok(remainingMs > 0);
});

test('startedAt after createdAt remains valid and not overdue early', () => {
  const task = makeTask({
    createdAt: new Date('2026-04-14T09:00:00.000Z'),
    startedAt: new Date('2026-04-14T10:47:00.000Z'),
    estimatedMinutes: 120,
    status: 'in-progress',
  });

  const dueAt = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);
  assert.equal(dueAt.toISOString(), new Date('2026-04-14T12:47:00.000Z').toISOString());

  const normalized = normalizeTaskTiming(task, new Date('2026-04-14T11:30:00.000Z'));
  assert.equal(normalized.isOverdue, false);
  assert.equal(normalized.remainingState === REMAINING_STATE.IN_PROGRESS || normalized.remainingState === REMAINING_STATE.DUE_SOON, true);
});
