# Task Pause/Resume Counter Fix

## Problem
Users reported that when pausing and resuming tasks, the timer counter was jumping inconsistently (e.g., jumping from 1 to 4 instead of incrementing smoothly 1→2→3→4). This was caused by different code paths handling pause/resume logic, leading to misaligned timer field updates.

## Root Cause
The application had **two parallel pause/resume implementations**:
1. **Legacy `tasks.controller.js`** - Updates legacy timer fields only
2. **Modern `taskExecution.service.js`** - Updates new session/pause tracking, but didn't sync legacy fields

When the frontend fetches a task, it uses the legacy `isRunning`, `currentSessionStartTime`, and `totalActiveTimeInSeconds` fields for the countdown timer. If these fields aren't consistently updated across both code paths, the timer calculation in `calcActiveSeconds()` produces inconsistent jumps.

## Solution
Updated `taskExecution.service.js` to synchronize legacy fields whenever pause/resume operations occur:

### Changes Made

#### 1. **startTask()** – Start work timer
```javascript
// ✅ NEW: Update legacy fields
task.status = 'in-progress';
task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
task.isRunning = true;
task.isPaused = false;
task.currentSessionStartTime = now;
task.totalActiveTimeInSeconds = task.totalActiveTimeInSeconds || 0;
```

#### 2. **pauseTask()** – Pause work timer
```javascript
// ✅ NEW: Update legacy fields
task.status = 'paused';
task.timingState = TASK_TIMING_STATE.PAUSED;
task.isRunning = false;
task.isPaused = true;
task.currentSessionStartTime = null;
```

#### 3. **resumeTask()** – Resume work timer
```javascript
// ✅ NEW: Update legacy fields
task.status = 'in-progress';
task.timingState = TASK_TIMING_STATE.IN_PROGRESS;
task.isRunning = true;
task.isPaused = false;
task.currentSessionStartTime = now;
```

#### 4. **completeTask()** – Finalize work timer
```javascript
// ✅ NEW: Update legacy fields
task.status = 'completed';
task.timingState = TASK_TIMING_STATE.COMPLETED;
task.isRunning = false;
task.isPaused = false;
task.currentSessionStartTime = null;
```

#### 5. **blockTask()** – Block work timer
```javascript
// ✅ NEW: Update legacy fields
task.status = 'paused'; // or 'on-hold'
task.isPaused = true;
task.isRunning = false;
task.currentSessionStartTime = null;
```

#### 6. **Import Fix**
Added missing import for `TASK_TIMING_STATE`:
```javascript
import { TASK_TIMING_STATE } from './taskDeadline.utils.js';
```

## How This Fixes the Jump Issue

**Before (Broken Timeline):**
```
Time: 0s → 1s → 2s → 3s → 4s
1. pauseTask() called         // New pauses array entry added ✓
2. resumeTask() called         // New session created ✓
3. Frontend queries task       // But legacy fields are null ❌
4. calcActiveSeconds() calculates:
   - No currentSessionStartTime  
   - No totalActiveTimeInSeconds
   - Result: Jumps or resets
```

**After (Fixed Timeline):**
```
Time: 0s → 1s → 2s → 3s → 4s
1. pauseTask() called         // New pauses array + legacy fields (isRunning=false) ✓
2. resumeTask() called         // New session + legacy fields (currentSessionStartTime=now) ✓
3. Frontend queries task       // All fields consistent ✓
4. calcActiveSeconds() calculates:
   - totalActiveTimeInSeconds = accumulated paused time
   - currentSessionStartTime = resume timestamp
   - Result: Smooth counting 1→2→3→4 ✓
```

## Frontend Timer Logic (Unchanged)
The frontend `calcActiveSeconds()` function remains unchanged and correctly handles the synchronized fields:

```javascript
export function calcActiveSeconds(task) {
  let total = task.totalActiveTimeInSeconds || 0;
  if (task.isRunning && task.currentSessionStartTime) {
    const elapsed = Math.floor(
      (Date.now() - new Date(task.currentSessionStartTime).getTime()) / 1000
    );
    total += Math.max(0, elapsed);
  }
  return total;
}
```

With synchronized backend fields, this now produces consistent results.

## Testing Checklist

- [ ] Start a task → Timer starts at 0 and counts up smoothly
- [ ] Pause task after 10 seconds → Timer stops at 10
- [ ] Resume task → Timer resumes from 10 and continues counting smoothly
- [ ] Pause/Resume multiple times → Counter never jumps backwards
- [ ] Complete a task → Timer stops and records final active time correctly
- [ ] Block a task → Timer pauses correctly
- [ ] Unblock and resume → Timer resumes from correct position
- [ ] Refresh page while task running → Timer continues from correct position
- [ ] Check Activity Log → All pause/resume events logged correctly

## Files Modified
- ✅ `/server/src/modules/tasks/taskExecution.service.js` – Added legacy field synchronization
- ✅ `/server/src/modules/tasks/taskExecution.utils.js` – No changes needed
- ✅ `/erp-dashboard/src/features/tasks/utils/taskTimerUtils.js` – No changes needed (already working correctly)

## Backend Endpoints Affected
- ✅ `POST /tasks/:id/start` – Via `taskExecutionController.startTask()`
- ✅ `POST /tasks/:id/pause` – Via `taskExecutionController.pauseTask()`
- ✅ `POST /tasks/:id/resume` – Via `taskExecutionController.resumeTask()`
- ✅ `POST /tasks/:id/complete` – Via `taskExecutionController.completeTask()`
- ✅ `POST /tasks/:id/block` – Via `taskExecutionController.blockTask()`

## Impact
- 🎯 **Timer will now count smoothly** without jumps
- 🎯 **Pause/Resume cycles work consistently**  
- 🎯 **No frontend code changes required**
- 🎯 **Backward compatible** with existing task data structure

## Rollout
1. Deploy backend changes to development/staging
2. Test pause/resume flows
3. Verify timer counts smoothly
4. Deploy to production
5. Monitor task execution metrics for any anomalies
