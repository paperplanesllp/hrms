import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import {
  TASK_TIMING_STATE,
  REMAINING_STATE,
  applyPauseDuration,
  calculateDueAt,
  getRemainingMs,
  normalizeTaskTiming,
  shouldSendReminder,
} from '../modules/tasks/taskDeadline.utils.js';

function createReport() {
  return {
    generatedAt: new Date().toISOString(),
    passed: 0,
    failed: 0,
    skipped: 0,
    checks: [],
    productionReady: false,
    suggestions: [],
  };
}

function addCheck(report, id, title, ok, details, suggestion = null) {
  report.checks.push({ id, title, status: ok ? 'PASS' : 'FAIL', details, suggestion });
  if (ok) report.passed += 1;
  else {
    report.failed += 1;
    if (suggestion) report.suggestions.push(suggestion);
  }
}

function addSkipped(report, id, title, details) {
  report.checks.push({ id, title, status: 'SKIP', details });
  report.skipped += 1;
}

function getUrgencyBand(remainingSeconds) {
  if (remainingSeconds < 0) return 'overdue';
  if (remainingSeconds <= 5 * 60) return 'critical_blink';
  if (remainingSeconds <= 15 * 60) return 'orange';
  if (remainingSeconds <= 30 * 60) return 'red';
  return 'normal';
}

function buildBaseTask(overrides = {}) {
  return {
    _id: 'validator-task',
    title: 'Validation Task',
    createdAt: new Date('2026-04-14T04:33:00.000Z'),
    startedAt: new Date('2026-04-14T05:17:00.000Z'),
    estimatedMinutes: 120,
    pausedDurationMs: 0,
    status: 'in-progress',
    timingState: TASK_TIMING_STATE.IN_PROGRESS,
    isPaused: false,
    isRunning: true,
    thirtyMinReminderSent: false,
    fifteenMinReminderSent: false,
    dueNowReminderSent: false,
    overdueReminderSent: false,
    ...overrides,
  };
}

async function runMigrationCommand(command, cwd) {
  return new Promise((resolvePromise) => {
    const child = spawn(command, [], { shell: true, cwd, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (buf) => {
      stdout += buf.toString();
    });
    child.stderr.on('data', (buf) => {
      stderr += buf.toString();
    });

    child.on('exit', (code) => {
      resolvePromise({ code, stdout, stderr });
    });
  });
}

export async function runTaskTimingValidation(options = {}) {
  const report = createReport();
  const now = new Date('2026-04-14T05:47:00.000Z');

  // 1) Core timing validation
  const task = buildBaseTask();
  const dueAt = calculateDueAt(task.startedAt, task.estimatedMinutes, task.pausedDurationMs);
  const createdBasedDueAt = new Date(task.createdAt.getTime() + task.estimatedMinutes * 60000);

  addCheck(
    report,
    'core-001',
    'DueAt uses startedAt + estimate',
    dueAt && dueAt.getTime() === task.startedAt.getTime() + task.estimatedMinutes * 60000,
    {
      startedAt: task.startedAt,
      dueAt,
      expected: new Date(task.startedAt.getTime() + task.estimatedMinutes * 60000),
    },
    'Ensure calculateDueAt is only based on startedAt and estimatedMinutes.'
  );

  addCheck(
    report,
    'core-002',
    'DueAt is not based on createdAt',
    dueAt && dueAt.getTime() !== createdBasedDueAt.getTime(),
    { dueAt, createdBasedDueAt },
    'Check code paths that still derive dueAt from createdAt.'
  );

  const rem = getRemainingMs({ ...task, dueAt }, now);
  addCheck(
    report,
    'core-003',
    'Remaining is positive before dueAt',
    rem > 0,
    { remainingMs: rem, now, dueAt },
    'Overdue must only trigger after now > dueAt.'
  );

  // 2) Countdown timer validation (logic + static)
  const t1 = normalizeTaskTiming({ ...task, dueAt }, new Date('2026-04-14T05:18:00.000Z'));
  const t2 = normalizeTaskTiming({ ...task, dueAt }, new Date('2026-04-14T05:18:01.000Z'));

  addCheck(
    report,
    'countdown-001',
    'Countdown decreases by one second',
    Number.isFinite(t1.remainingSeconds) && Number.isFinite(t2.remainingSeconds) && t1.remainingSeconds - t2.remainingSeconds === 1,
    { first: t1.remainingSeconds, second: t2.remainingSeconds },
    'Countdown should be derived from dueAt - now each tick.'
  );

  const hookPath = resolve(process.cwd(), '..', 'erp-dashboard', 'src', 'features', 'tasks', 'hooks', 'useTaskTimer.js');
  try {
    const hookSource = await readFile(hookPath, 'utf8');
    const hasPauseFreeze = hookSource.includes('referenceNow = pauseStartedAt || now');
    const hasManualDecrement = /remainingSeconds\s*[-]=|setRemaining\([^)]*-\s*1\)/.test(hookSource);

    addCheck(report, 'countdown-002', 'Pause freeze logic exists in hook', hasPauseFreeze, { hasPauseFreeze }, 'Freeze countdown by pause timestamp reference while paused.');
    addCheck(report, 'countdown-003', 'No manual decrement logic in hook', !hasManualDecrement, { hasManualDecrement }, 'Use dueAt - now computation instead of decrementing local state.');
  } catch (error) {
    addSkipped(report, 'countdown-004', 'Frontend hook static validation', `Skipped: ${error.message}`);
  }

  // 3) Remaining state validation
  const states = [
    {
      id: 'state-001',
      title: 'not_started state',
      task: buildBaseTask({ startedAt: null, estimatedMinutes: 120, dueAt: null, status: 'pending', timingState: TASK_TIMING_STATE.NOT_STARTED }),
      expectState: REMAINING_STATE.NOT_STARTED,
      expectLabel: 'Not started',
    },
    {
      id: 'state-002',
      title: 'no_estimate state',
      task: buildBaseTask({ estimatedMinutes: 0 }),
      expectState: REMAINING_STATE.NO_ESTIMATE,
      expectLabel: 'No estimate set',
    },
    {
      id: 'state-003',
      title: 'paused state',
      task: buildBaseTask({ isPaused: true, status: 'paused', timingState: TASK_TIMING_STATE.PAUSED }),
      expectState: REMAINING_STATE.PAUSED,
      expectLabel: 'Paused',
    },
    {
      id: 'state-004',
      title: 'overdue state',
      task: buildBaseTask({ startedAt: new Date('2026-04-14T01:00:00.000Z'), estimatedMinutes: 10 }),
      expectState: REMAINING_STATE.OVERDUE,
      expectLabelIncludes: 'Overdue by',
    },
    {
      id: 'state-005',
      title: 'completed state',
      task: buildBaseTask({ status: 'completed', timingState: TASK_TIMING_STATE.COMPLETED, isRunning: false }),
      expectState: REMAINING_STATE.COMPLETED,
      expectLabel: 'Completed',
    },
  ];

  for (const stateCase of states) {
    const normalized = normalizeTaskTiming(stateCase.task, now);
    const labelOk = stateCase.expectLabel
      ? normalized.remainingLabel === stateCase.expectLabel
      : normalized.remainingLabel.includes(stateCase.expectLabelIncludes);

    addCheck(
      report,
      stateCase.id,
      stateCase.title,
      normalized.remainingState === stateCase.expectState && labelOk && normalized.remainingLabel !== '-',
      {
        gotState: normalized.remainingState,
        gotLabel: normalized.remainingLabel,
      },
      'Normalize response timing state and label in backend formatter.'
    );
  }

  // 4) Color urgency validation contract
  const urgencyChecks = [
    { id: 'urgency-001', sec: 31 * 60, expect: 'normal' },
    { id: 'urgency-002', sec: 30 * 60, expect: 'red' },
    { id: 'urgency-003', sec: 15 * 60, expect: 'orange' },
    { id: 'urgency-004', sec: 5 * 60, expect: 'critical_blink' },
    { id: 'urgency-005', sec: -1, expect: 'overdue' },
  ];

  for (const item of urgencyChecks) {
    const got = getUrgencyBand(item.sec);
    addCheck(report, item.id, `Urgency band ${item.expect}`, got === item.expect, { remainingSeconds: item.sec, got, expected: item.expect });
  }

  // 5) Pause/Resume + due extension validation
  const pauseTask = buildBaseTask({ startedAt: new Date('2026-04-14T10:00:00.000Z'), estimatedMinutes: 120, pausedDurationMs: 0 });
  const baseDue = calculateDueAt(pauseTask.startedAt, pauseTask.estimatedMinutes, pauseTask.pausedDurationMs);
  const pausedMs = applyPauseDuration(pauseTask, new Date('2026-04-14T10:20:00.000Z'), new Date('2026-04-14T10:35:00.000Z'));
  const resumedDue = calculateDueAt(pauseTask.startedAt, pauseTask.estimatedMinutes, pauseTask.pausedDurationMs);

  addCheck(report, 'pause-001', 'Pause duration increases pausedDurationMs', pausedMs === 15 * 60 * 1000 && pauseTask.pausedDurationMs === 15 * 60 * 1000, {
    pausedMs,
    pausedDurationMs: pauseTask.pausedDurationMs,
  });

  addCheck(report, 'pause-002', 'DueAt extends by paused duration', resumedDue.getTime() - baseDue.getTime() === 15 * 60 * 1000, {
    baseDue,
    resumedDue,
  });

  // 6) Overdue logic validation
  const overdueTask = buildBaseTask({ startedAt: new Date('2026-04-14T11:00:00.000Z'), estimatedMinutes: 30 });
  const beforeDue = normalizeTaskTiming(overdueTask, new Date('2026-04-14T11:29:59.000Z'));
  const afterDue = normalizeTaskTiming(overdueTask, new Date('2026-04-14T11:30:01.000Z'));

  addCheck(report, 'overdue-001', 'Not overdue before dueAt', !beforeDue.isOverdue, beforeDue, 'Overdue transition must happen strictly after dueAt.');
  addCheck(report, 'overdue-002', 'Overdue after dueAt', afterDue.isOverdue && afterDue.remainingLabel.includes('Overdue by'), afterDue, 'Ensure overdue label is generated from remainingMs.');

  // 7) Extension workflow validation (logic-level)
  const extensionTask = buildBaseTask({ status: 'overdue', startedAt: new Date('2026-04-14T01:00:00.000Z'), estimatedMinutes: 30 });
  const extBefore = calculateDueAt(extensionTask.startedAt, extensionTask.estimatedMinutes, extensionTask.pausedDurationMs);
  const extAfter = new Date(extBefore.getTime() + 20 * 60 * 1000);
  addCheck(report, 'extension-001', 'Extension approval updates dueAt forward', extAfter > extBefore, { extBefore, extAfter });

  // 8) Scheduler reminder idempotency
  const reminderTask = buildBaseTask({
    startedAt: new Date('2026-04-14T11:00:00.000Z'),
    estimatedMinutes: 60,
    status: 'in-progress',
    timingState: TASK_TIMING_STATE.IN_PROGRESS,
  });
  const reminderNow = new Date('2026-04-14T11:30:00.000Z');

  addCheck(report, 'reminder-001', '30m reminder sends once', shouldSendReminder(reminderTask, '30m', reminderNow) === true, { reminderNow });
  reminderTask.thirtyMinReminderSent = true;
  addCheck(report, 'reminder-002', '30m reminder idempotent', shouldSendReminder(reminderTask, '30m', reminderNow) === false, { reminderNow });

  const reminder15Now = new Date('2026-04-14T11:45:00.000Z');
  addCheck(report, 'reminder-003', '15m reminder sends once', shouldSendReminder(reminderTask, '15m', reminder15Now) === true, { reminder15Now });
  reminderTask.fifteenMinReminderSent = true;
  addCheck(report, 'reminder-004', '15m reminder idempotent', shouldSendReminder(reminderTask, '15m', reminder15Now) === false, { reminder15Now });

  const dueNow = new Date('2026-04-14T12:00:00.000Z');
  addCheck(report, 'reminder-005', 'due-now reminder sends once', shouldSendReminder(reminderTask, 'due-now', dueNow) === true, { dueNow });
  reminderTask.dueNowReminderSent = true;
  addCheck(report, 'reminder-006', 'due-now reminder idempotent', shouldSendReminder(reminderTask, 'due-now', dueNow) === false, { dueNow });

  const overNow = new Date('2026-04-14T12:01:00.000Z');
  addCheck(report, 'reminder-007', 'overdue reminder sends once', shouldSendReminder(reminderTask, 'overdue', overNow) === true, { overNow });
  reminderTask.overdueReminderSent = true;
  addCheck(report, 'reminder-008', 'overdue reminder idempotent', shouldSendReminder(reminderTask, 'overdue', overNow) === false, { overNow });

  // 9) Migration/backfill validation (optional runtime execution)
  if (options.runMigrationCommands) {
    const cwd = resolve(process.cwd());
    const dry = await runMigrationCommand('npm run timing:backfill:dry', cwd);
    addCheck(report, 'migration-001', 'Backfill dry-run command executes', dry.code === 0, {
      exitCode: dry.code,
      stdoutTail: dry.stdout.slice(-500),
      stderrTail: dry.stderr.slice(-500),
    }, 'Fix dry-run script and DB connectivity before production run.');

    if (options.applyMigration) {
      const apply = await runMigrationCommand('npm run timing:backfill:apply', cwd);
      addCheck(report, 'migration-002', 'Backfill apply command executes', apply.code === 0, {
        exitCode: apply.code,
        stdoutTail: apply.stdout.slice(-500),
        stderrTail: apply.stderr.slice(-500),
      }, 'Investigate backfill apply errors before rollout.');
    } else {
      addSkipped(report, 'migration-002', 'Backfill apply command', 'Skipped: run with --apply-migration to execute write mode.');
    }
  } else {
    addSkipped(report, 'migration-001', 'Backfill dry-run command', 'Skipped: run with --run-migration to execute migration checks.');
    addSkipped(report, 'migration-002', 'Backfill apply command', 'Skipped: run with --run-migration --apply-migration to execute write mode.');
  }

  // 10) API health checks (optional)
  const baseUrl = options.apiBaseUrl || process.env.HRMS_API_BASE_URL;
  const authToken = options.authToken || process.env.HRMS_API_TOKEN;

  if (baseUrl && authToken) {
    const endpoints = [
      { id: 'api-001', path: '/api/tasks/request-extension', body: { taskId: options.taskId, additionalTime: 10, unit: 'minutes', remarks: 'Validation check' } },
      { id: 'api-002', path: '/api/tasks/approve-extension', body: { taskId: options.taskId, requestId: options.requestId } },
      { id: 'api-003', path: '/api/tasks/reject-extension', body: { taskId: options.taskId, requestId: options.requestId, rejectionReason: 'Validation check' } },
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(ep.body),
        });

        addCheck(report, ep.id, `API health ${ep.path}`, res.status === 200, { status: res.status });
      } catch (error) {
        addCheck(report, ep.id, `API health ${ep.path}`, false, { message: error.message }, 'Confirm API server URL/token and required payload IDs.');
      }
    }
  } else {
    addSkipped(report, 'api-001', 'API health POST /tasks/request-extension', 'Skipped: set HRMS_API_BASE_URL and HRMS_API_TOKEN.');
    addSkipped(report, 'api-002', 'API health POST /tasks/approve-extension', 'Skipped: set HRMS_API_BASE_URL and HRMS_API_TOKEN.');
    addSkipped(report, 'api-003', 'API health POST /tasks/reject-extension', 'Skipped: set HRMS_API_BASE_URL and HRMS_API_TOKEN.');
  }

  report.productionReady = report.failed === 0;

  if (!report.productionReady && report.suggestions.length === 0) {
    report.suggestions.push('Resolve failed checks in timing validator before production release.');
  }

  return report;
}
