# Daily Task Reminder System - Testing Checklist

## Pre-Testing Setup

- [ ] Clone latest code from repository
- [ ] Install dependencies: `npm install`
- [ ] Start backend server: `npm start`
- [ ] Verify server running on expected port
- [ ] Check console for: `✅ Daily task reminders initialized`
- [ ] Have a valid authentication token (preferably HR/Admin)

## Unit Tests

### 1. Service Method Tests: `sendDailyIncompleteTasksReminder()`

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| No incomplete tasks exist | Returns `{ remindersCount: 0 }` | ⬜ |
| Users with incomplete tasks | Returns array of reminder objects | ⬜ |
| Overdue task categorization | Classifies tasks past due date correctly | ⬜ |
| Due today classification | Classifies tasks due within current day | ⬜ |
| Urgent task identification | Identifies URGENT priority tasks | ⬜ |
| Deleted user exclusion | Skips users with `isDeleted: true` | ⬜ |
| Deleted task exclusion | Skips tasks with `isDeleted: true` | ⬜ |
| Completed task exclusion | Skips completed/rejected/cancelled tasks | ⬜ |

### 2. Reminder Module Tests: `task.reminder.js`

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Module imports without errors | Module loads successfully | ⬜ |
| Cron expression valid | Cron job initializes | ⬜ |
| Task summary creation | Creates readable summary text | ⬜ |
| Manual trigger works | Returns success response | ⬜ |
| Stop/restart functionality | Can stop and restart job | ⬜ |
| Status reporting | Accurately reports job status | ⬜ |

## Integration Tests

### 3. API Endpoint Tests

#### Endpoint: `GET /api/tasks/my/summary/incomplete`
- [ ] Returns `200` when user logged in
- [ ] Returns `401` when not authenticated
- [ ] Response includes `taskCounts` object
- [ ] Response includes `tasks` object with categories
- [ ] Counts match actual incomplete tasks
- [ ] Only returns tasks assigned to current user
- [ ] Excludes completed tasks
- [ ] Excludes deleted tasks
- [ ] Correctly identifies overdue (past due date)
- [ ] Correctly identifies due today (today's date)
- [ ] Correctly identifies urgent (URGENT priority)

#### Endpoint: `POST /api/tasks/reminders/trigger`
- [ ] Returns `403` without HR/Admin role
- [ ] Returns `200` with valid HR token
- [ ] Response includes `remindersCount`
- [ ] Response includes `notificationsSent`
- [ ] Creates notifications in database
- [ ] Sends to users with incomplete tasks only
- [ ] Skips users with no incomplete tasks
- [ ] Handles errors gracefully

#### Endpoint: `GET /api/tasks/reminders/status`
- [ ] Returns `403` without HR/Admin role
- [ ] Returns `200` with valid HR token
- [ ] Response includes `isRunning: true`
- [ ] Response includes correct schedule info
- [ ] Indicates next execution time

### 4. Database Integration Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Notifications created on trigger | Notification records exist | ⬜ |
| Notification type is 'TASK_REMINDER' | Type field correct | ⬜ |
| User ID stored correctly | User reference correct | ⬜ |
| Task counts in notification data | Data structure correct | ⬜ |
| Task IDs included in data | All task IDs present | ⬜ |
| Timestamp stored | Created timestamp accurate | ⬜ |

## Functional Tests

### 5. Task Categorization Tests

Create test tasks and verify categorization:

#### Test Setup
```
Task 1: Due 2024-12-15 (Past) - Status: pending → OVERDUE
Task 2: Due TODAY @ 2024-12-20 - Status: pending → DUE TODAY
Task 3: Priority: URGENT - Status: pending → URGENT
Task 4: Due tomorrow - Status: pending → FUTURE (not in reminder)
Task 5: Due yesterday - Status: completed → EXCLUDED (completed)
```

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Overdue tasks identified | Task 1 in overdue list | ⬜ |
| Due today identified | Task 2 in due today list | ⬜ |
| Urgent tasks identified | Task 3 in urgent list | ⬜ |
| Future tasks excluded | Task 4 NOT in lists | ⬜ |
| Completed tasks excluded | Task 5 NOT in any list | ⬜ |
| Task count accurate | Total = 3 (not 5) | ⬜ |

### 6. Multi-User Scenario Tests

Create multiple users with different task scenarios:

| User | Scenario | Expected Reminder |
|------|----------|-------------------|
| User A | 3 overdue | "🚨 3 overdue tasks" |
| User B | 2 urgent + 1 due today | "📅 1 due today\n⚡ 2 urgent" |
| User C | No tasks | No reminder sent |
| User D | All completed | No reminder sent |
| User E | Only future tasks | No reminder sent |

**Verification**:
- [ ] Each user receives only own tasks
- [ ] Message text accurate 
- [ ] No duplicates sent
- [ ] Users unaware of other users' tasks

### 7. Notification Delivery Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Notification appears in app | User sees in notification center | ⬜ |
| Notification has correct title | Title = 'Daily Task Reminder' | ⬜ |
| Notification has message summary | Shows task counts | ⬜ |
| Notification links to tasks | Can click to view tasks | ⬜ |
| Notification persists | Visible after page reload | ⬜ |
| Notification can be dismissed | User can close/delete | ⬜ |

## Cron Job Tests

### 8. Schedule Execution Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Runs at 9 AM IST on Monday | Reminders sent at 9 AM | ⬜ |
| Runs at 9 AM IST on Friday | Reminders sent at 9 AM | ⬜ |
| Does NOT run on Saturday | No reminders sent | ⬜ |
| Does NOT run on Sunday | No reminders sent | ⬜ |
| Runs all 5 weekdays | Consistent execution | ⬜ |
| Skips bank holidays (if applicable) | Check scheduling rules | ⬜ |

### 9. Timezone Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Correct timezone applied | Executes at 9 AM IST | ⬜ |
| Not affected by DST | Consistent time | ⬜ |
| Server timezone change handled | Adjusts correctly | ⬜ |

## Error Handling Tests

### 10. Error Scenarios

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Database connection fails | Graceful error logged | ⬜ |
| Query timeout | Handled without crash | ⬜ |
| Notification creation fails | Continues to next user | ⬜ |
| User deleted during execution | Skipped, no error | ⬜ |
| Task deleted during execution | Handled gracefully | ⬜ |
| Invalid authorization token | Returns 401 | ⬜ |
| Expired token | Returns 401 | ⬜ |
| Missing required header | Returns 400 | ⬜ |

## Performance Tests

### 11. Load Testing

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| 100 users | All reminders sent < 5 sec | ⬜ |
| 1000 users | Completes in reasonable time | ⬜ |
| 10,000 tasks | No timeout errors | ⬜ |
| Memory usage | Stable, no leaks | ⬜ |
| CPU usage | Acceptable load | ⬜ |
| Database queries optimized | No N+1 queries | ⬜ |

## Browser/Frontend Tests

### 12. UI/UX Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Sidebar shows notification count | Accurate number | ⬜ |
| Notification dropdown shows reminder | Appears in list | ⬜ |
| Click reminder opens task dashboard | Navigation works | ⬜ |
| Summary component loads | No JavaScript errors | ⬜ |
| Mobile responsive | Works on mobile | ⬜ |
| Notification bell icon animates | Visual feedback good | ⬜ |

## Security Tests

### 13. Authorization Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Regular user can't trigger manually | 403 response | ⬜ |
| Regular user can't see status | 403 response | ⬜ |
| Regular user CAN see own summary | 200 response | ⬜ |
| HR/Admin can trigger manually | 200 response | ⬜ |
| HR/Admin can see status | 200 response | ⬜ |
| No cross-user task access | Users only see own tasks | ⬜ |

### 14. Data Privacy Tests

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| User IDs not exposed | Only to authorized users | ⬜ |
| Task details not leaked | Only to assigned users | ⬜ |
| Email addresses protected | Not shown in API | ⬜ |
| Deleted users excluded | Not accessible | ⬜ |
| Deleted tasks excluded | Not shown | ⬜ |

## Regression Tests

### 15. Existing Functionality

| Test Case | Expected Result | Status |
|-----------|-----------------|--------|
| Task creation still works | No impact | ⬜ |
| Task updates still work | No impact | ⬜ |
| Task completion still works | No impact | ⬜ |
| Other notifications not affected | Still working | ⬜ |
| Dashboard metrics accurate | No change | ⬜ |
| API response times unchanged | No degradation | ⬜ |

## Documentation Tests

### 16. Documentation Quality

- [ ] README has quick start section
- [ ] API documentation complete
- [ ] Error codes documented
- [ ] Configuration options documented
- [ ] Examples provided
- [ ] Troubleshooting guide included
- [ ] Timezone customization documented

## Production Readiness Checklist

### Server Setup
- [ ] Clone/build on production
- [ ] Verify dependencies installed
- [ ] Database indexes created
- [ ] Environment variables set
- [ ] Timezone configured correctly
- [ ] Backup system in place

### Monitoring
- [ ] Logs monitored
- [ ] Error tracking enabled
- [ ] Performance metrics collected
- [ ] Database queries monitored
- [ ] Uptime tracking enabled

### Testing Results
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All functional tests passing
- [ ] No performance issues
- [ ] No security vulnerabilities
- [ ] No data privacy issues

### Deployment
- [ ] Code reviewed
- [ ] Tests passing in CI/CD
- [ ] Deployed to staging
- [ ] Final user acceptance test
- [ ] Ready for production deployment

## Test Execution Log

| Test Suite | StartTime | EndTime | Status | Notes |
|-----------|-----------|---------|--------|--------|
| Unit Tests | __ : __ | __ : __ | ⬜ | |
| Integration | __ : __ | __ : __ | ⬜ | |
| Functional | __ : __ | __ : __ | ⬜ | |
| Performance | __ : __ | __ : __ | ⬜ | |
| Security | __ : __ | __ : __ | ⬜ | |
| Regression | __ : __ | __ : __ | ⬜ | |

## Known Issues & Workarounds

Current Issues:
- None identified yet

Workarounds:
- None required

## Sign-Off

- [ ] QA Lead Review: _____________ Date: _____
- [ ] Dev Lead Review: _____________ Date: _____
- [ ] Product Owner: _____________ Date: _____

---

**Test Document Version**: 1.0  
**Last Updated**: 2024-12-20  
**Next Review**: 2024-12-27
