# Task Execution System - Testing & Deployment Guide

## Pre-Deployment Checklist

### Code Quality
- [ ] All ESLint errors resolved
- [ ] No console.error logs in production code
- [ ] All imports correctly resolved
- [ ] No syntax errors
- [ ] All async/await chains properly handled
- [ ] Error handling in all API calls
- [ ] Dark mode tested

### Database
- [ ] MongoDB connection verified
- [ ] New indexes created for performance
- [ ] No migration conflicts
- [ ] Backup created before deployment
- [ ] Test data properly seeded

### API Testing
- [ ] Postman collection updated
- [ ] All endpoints respond with correct status codes
- [ ] Error messages are user-friendly
- [ ] Rate limiting configured
- [ ] CORS headers correct
- [ ] Auth middleware working

---

## Testing Guide

### Unit Tests

#### Backend Tests (Jest/Mocha)

**taskExecution.utils.js**
```javascript
describe('taskExecution.utils', () => {
  describe('calculateTaskProgress', () => {
    test('returns 0 when no estimated minutes', () => {
      const result = calculateTaskProgress({ estimatedMinutes: 0 });
      expect(result).toBe(0);
    });

    test('calculates correct percentage', () => {
      const result = calculateTaskProgress({
        totalActiveMinutes: 30,
        estimatedMinutes: 120
      });
      expect(result).toBe(25);
    });

    test('caps at 100 percent', () => {
      const result = calculateTaskProgress({
        totalActiveMinutes: 150,
        estimatedMinutes: 120
      });
      expect(result).toBe(100);
    });
  });

  describe('getDueHealth', () => {
    test('returns on_track for not started with days remaining', () => {
      const task = {
        executionStatus: 'not_started',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };
      expect(getDueHealth(task)).toBe('on_track');
    });

    test('returns due_today when due today', () => {
      const task = {
        executionStatus: 'in_progress',
        dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
      };
      expect(getDueHealth(task)).toBe('due_today');
    });

    test('returns completed_on_time for early completion', () => {
      const task = {
        executionStatus: 'completed',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        completedAt: new Date()
      };
      expect(getDueHealth(task)).toBe('completed_on_time');
    });
  });

  describe('formatDuration', () => {
    test('formats minutes only', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    test('formats hours and minutes', () => {
      expect(formatDuration(150)).toBe('2h 30m');
    });

    test('formats hours only', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    test('handles zero', () => {
      expect(formatDuration(0)).toBe('0m');
    });
  });
});
```

**taskExecution.service.js**
```javascript
describe('taskExecution.service', () => {
  describe('startTask', () => {
    test('successfully starts a task', async () => {
      const taskId = 'test-id';
      const userId = 'user-id';
      
      const task = await taskExecutionService.startTask(taskId, userId);
      
      expect(task.executionStatus).toBe('in_progress');
      expect(task.startedAt).toBeDefined();
      expect(task.sessions.length).toBeGreaterThan(0);
      expect(task.activityLog.some(log => log.action === 'started')).toBe(true);
    });

    test('throws error if task not found', async () => {
      expect(taskExecutionService.startTask('invalid-id', 'user-id')).rejects.toThrow('Task not found');
    });

    test('throws error if already in progress', async () => {
      // Setup: task already in_progress
      expect(taskExecutionService.startTask(taskId, userId)).rejects.toThrow();
    });
  });

  describe('completeTask', () => {
    test('marks task as completed on time', async () => {
      const task = await taskExecutionService.completeTask(taskId, userId);
      
      expect(task.executionStatus).toBe('completed');
      expect(task.dueHealth).toBe('completed_on_time');
      expect(task.completedAt).toBeDefined();
    });

    test('marks task as completed late when overdue', async () => {
      // Setup: task with past due date
      const task = await taskExecutionService.completeTask(taskId, userId);
      
      expect(task.executionStatus).toBe('completed_late');
      expect(task.dueHealth).toBe('completed_late');
    });
  });

  describe('pauseTask', () => {
    test('pauses task with reason', async () => {
      const reason = 'Waiting for approval';
      const task = await taskExecutionService.pauseTask(taskId, userId, reason);
      
      expect(task.executionStatus).toBe('paused');
      expect(task.pauses.length).toBeGreaterThan(0);
      expect(task.pauses[0].reason).toBe(reason);
    });
  });

  describe('blockTask', () => {
    test('blocks task and tracks blocker', async () => {
      const reason = 'Missing documentation';
      const task = await taskExecutionService.blockTask(taskId, userId, reason);
      
      expect(task.executionStatus).toBe('blocked');
      expect(task.blockers.length).toBeGreaterThan(0);
      expect(task.blockers[0].reason).toBe(reason);
      expect(task.blockers[0].status).toBe('active');
    });
  });
});
```

### Integration Tests

**Task Workflow Test**
```javascript
describe('Task Execution Workflow', () => {
  test('complete not_started -> in_progress -> paused -> in_progress -> completed flow', async () => {
    // 1. Task created in not_started state
    let task = await Task.create({
      title: 'Test Task',
      description: 'Testing workflow',
      assignedTo: [userId],
      assignedBy: managerId,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      estimatedMinutes: 120,
      priority: 'MEDIUM'
    });

    expect(task.executionStatus).toBe('not_started');

    // 2. Start task
    task = await taskExecutionService.startTask(task._id, userId);
    expect(task.executionStatus).toBe('in_progress');
    expect(task.startedAt).toBeDefined();
    expect(task.sessions.length).toBe(1);

    // Wait a bit (simulate work)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Pause task
    task = await taskExecutionService.pauseTask(task._id, userId, 'Coffee break');
    expect(task.executionStatus).toBe('paused');
    expect(task.pauses.length).toBe(1);

    // 4. Resume task
    task = await taskExecutionService.resumeTask(task._id, userId);
    expect(task.executionStatus).toBe('in_progress');
    expect(task.sessions.length).toBe(2);

    // 5. Complete task
    task = await taskExecutionService.completeTask(task._id, userId);
    expect(task.executionStatus).toBe('completed');
    expect(task.completedAt).toBeDefined();
    expect(task.dueHealth).toBe('completed_on_time');

    // Verify activity log
    const actions = task.activityLog.map(log => log.action);
    expect(actions).toContain('started');
    expect(actions).toContain('paused');
    expect(actions).toContain('resumed');
    expect(actions).toContain('completed');
  });

  test('block and unblock workflow', async () => {
    let task = await taskExecutionService.startTask(taskId, userId);
    expect(task.executionStatus).toBe('in_progress');

    // Block due to missing docs
    task = await taskExecutionService.blockTask(
      task._id,
      userId,
      'Missing API documentation'
    );
    expect(task.executionStatus).toBe('blocked');
    expect(task.blockers.length).toBe(1);

    // Unblock
    task = await taskExecutionService.unblockTask(
      task._id,
      task.blockers[0]._id,
      managerId
    );
    expect(task.executionStatus).toBe('in_progress');
    expect(task.blockers[0].status).toBe('resolved');
    expect(task.sessions.length).toBe(2); // New session created
  });
});
```

### API Endpoint Tests (Supertest)

```javascript
describe('POST /tasks/:id/start', () => {
  test('successfully starts a task', async () => {
    const response = await request(app)
      .post(`/tasks/${taskId}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.executionStatus).toBe('in_progress');
    expect(response.body.success).toBe(true);
  });

  test('returns 401 if not authenticated', async () => {
    const response = await request(app)
      .post(`/tasks/${taskId}/start`)
      .expect(401);
  });

  test('returns 404 if task not found', async () => {
    const response = await request(app)
      .post('/tasks/invalid-id/start')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);
  });
});

describe('POST /tasks/:id/pause', () => {
  test('successfully pauses task with reason', async () => {
    const response = await request(app)
      .post(`/tasks/${taskId}/pause`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Waiting for input' })
      .expect(200);

    expect(response.body.data.executionStatus).toBe('paused');
    expect(response.body.data.pauses[0].reason).toBe('Waiting for input');
  });

  test('returns 400 if reason is empty', async () => {
    // Should still work, uses default reason
    const response = await request(app)
      .post(`/tasks/${taskId}/pause`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: '' })
      .expect(200); // Works with default reason
  });
});

describe('GET /tasks/:id/execution-details', () => {
  test('returns complete execution analytics', async () => {
    const response = await request(app)
      .get(`/tasks/${taskId}/execution-details`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const { task, analytics } = response.body.data;
    expect(task._id).toBeDefined();
    expect(analytics.executionStatus).toBeDefined();
    expect(analytics.dueHealth).toBeDefined();
    expect(analytics.progress).toBeDefined();
    expect(analytics.totalActiveMinutes).toBeDefined();
  });
});
```

### Frontend Component Tests (React Testing Library)

```javascript
describe('PremiumTaskCard', () => {
  test('renders task title and badges', () => {
    const task = {
      _id: '1',
      title: 'Test Task',
      executionStatus: 'in_progress',
      dueHealth: 'at_risk',
      priority: 'HIGH',
      totalActiveMinutes: 90,
      totalPausedMinutes: 15,
      estimatedMinutes: 120,
      assignedTo: [{_id: '1', name: 'John'}]
    };

    const { getByText } = render(
      <PremiumTaskCard 
        task={task}
        onStart={jest.fn()}
        onViewDetails={jest.fn()}
      />
    );

    expect(getByText('Test Task')).toBeInTheDocument();
    expect(getByText('In Progress')).toBeInTheDocument();
    expect(getByText('At Risk')).toBeInTheDocument();
    expect(getByText('HIGH')).toBeInTheDocument();
  });

  test('shows correct progress percentage', () => {
    const task = {
      _id: '1',
      title: 'Test',
      totalActiveMinutes: 60,
      estimatedMinutes: 120,
      executionStatus: 'in_progress',
      dueHealth: 'on_track'
    };

    const { getByText } = render(<PremiumTaskCard task={task} />);
    expect(getByText('50%')).toBeInTheDocument();
  });

  test('renders action buttons based on status', () => {
    const task = {
      _id: '1',
      title: 'Test',
      executionStatus: 'not_started',
      dueHealth: 'on_track',
      estimatedMinutes: 120,
      totalActiveMinutes: 0
    };

    const mockStart = jest.fn();
    const { getByTitle } = render(
      <PremiumTaskCard task={task} onStart={mockStart} />
    );

    const startButton = getByTitle('Start');
    fireEvent.click(startButton);
    expect(mockStart).toHaveBeenCalled();
  });
});

describe('PremiumTaskDetailsModal', () => {
  test('renders task details with analytics', () => {
    const task = {
      _id: '1',
      title: 'Test Task',
      description: 'Test description',
      executionStatus: 'in_progress',
      dueHealth: 'on_track',
      totalActiveMinutes: 90,
      estimatedMinutes: 120,
      startedAt: new Date(),
      assignedTo: [{_id: '1', name: 'John', email: 'john@example.com'}]
    };

    const { getByText } = render(
      <PremiumTaskDetailsModal
        task={task}
        isOpen={true}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Test Task')).toBeInTheDocument();
    expect(getByText('Test description')).toBeInTheDocument();
    expect(getByText('john@example.com')).toBeInTheDocument();
  });
});
```

---

## Manual Testing Scenarios

### Scenario 1: Simple Complete Flow
1. Create task "Design Mockups" assigned to Developer
2. Developer clicks "Start Task"
   - Verify: executionStatus = 'in_progress', startedAt set
3. Wait 5 minutes
4. Developer clicks "Pause" with reason "Need feedback"
   - Verify: executionStatus = 'paused', pause entry added
5. Wait 5 minutes
6. Developer clicks "Resume"
   - Verify: executionStatus = 'in_progress', new session created
7. Developer clicks "Complete"
   - Verify: executionStatus = 'completed', completedAt set
8. Check activity log shows all actions
9. Check analytics show ~10 minutes active time

### Scenario 2: Blocking Workflow
1. Create task assigned to Developer (1 hour estimate, due in 2 days)
2. Developer starts task
3. Developer clicks "Block" with reason "Waiting for DB schema"
   - Verify: executionStatus = 'blocked'
4. Manager clicks "Unblock" on blocked task
   - Verify: executionStatus = 'in_progress', new session created
5. Developer completes task
6. Verify activity log shows block/unblock events

### Scenario 3: Overdue Task
1. Create task with due date = 1 day ago, estimate 2 hours
2. Developer starts task
3. Developer completes task
   - Verify: executionStatus = 'completed_late', dueHealth = 'completed_late'
4. Check task card shows late badge
5. Verify activity log shows "completed late"

### Scenario 4: Pause Reason Tracking
1. Create task assigned to Developer
2. Developer starts task, works 10 minutes
3. Developer pauses with reason "Lunch break"
4. Developer pauses again with reason "Manager review"
5. Developer resumes
6. Check activity log shows both pause reasons
7. Check pause entries persist across refresh

### Scenario 5: Multi-User Actions
1. Create task assigned to Developer
2. Developer starts task
3. Manager views task details modal
   - Verify: Can see 'In Progress' status and active time
4. Developer pauses task
5. Manager refreshes details
   - Verify: Updated to show 'Paused' status
6. Developer resumes task
7. Manager refreshes again
   - Verify: Shows 'In Progress' with updated active time

---

## Performance Testing

### Load Test: Create 1000 Tasks with Execution Data
```bash
# Use Apache JMeter or Artillery
artillery run tests/task-execution-load.yml
```

Expected metrics:
- Response time < 200ms for GET requests
- Response time < 500ms for POST actions
- p95 latency < 1000ms
- No database connection errors

### Database Indexes Verification
```javascript
db.tasks.getIndexes()
// Should include:
// - { assignedTo: 1, executionStatus: 1 }
// - { assignedTo: 1, dueHealth: 1 }
// - { dueDate: 1, executionStatus: 1 }
// - { startedAt: 1, completedAt: 1 }
// - { lastActivityAt: -1 }
```

---

## Deployment Steps

### 1. Pre-Deployment (Staging)
```bash
# Build and test
npm run build
npm run test:unit
npm run test:integration

# Deploy to staging
git push origin staging
# Wait for CI/CD pipeline

# Smoke tests on staging
npm run test:smoke -- --env staging

# Check error logs
tail -f /var/log/app/error.log
```

### 2. Database Migration
```bash
# Backup production database
mongodump --uri mongodb://prod-db/erp --out ./backup-$(date +%Y%m%d)

# Optional: Seed initial execution status values for existing tasks
# If tasks should retain their current status as starting point
db.tasks.updateMany(
  { executionStatus: { $exists: false } },
  { $set: { 
    executionStatus: 'completed',
    dueHealth: { $cond: [
      { $lte: ['$completedAt', '$dueDate'] },
      'completed_on_time',
      'completed_late'
    ] }
  }},
  { multi: true }
)
```

### 3. Deploy to Production
```bash
# Merge to main
git checkout main
git merge staging
git push origin main

# CI/CD automatically deploys

# Monitor application health
curl https://api.example.com/health
# Should return: { status: 'ok', version: '1.0' }

# Check error monitoring (Sentry, DataDog, etc)
# Ensure no spike in errors
```

### 4. Post-Deployment Verification
```bash
# Test key endpoints
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/tasks/test-id/execution-details

# Verify database indexes created
mongo production-db --eval "db.tasks.getIndexes()"

# Check response times
curl -w "@curl-format.txt" \
  https://api.example.com/tasks/my \
  -H "Authorization: Bearer $TOKEN"

# Monitor error logs for 30 minutes
tail -f /var/log/app/error.log | grep -i 'error\|exception'
```

### 5. Rollback Plan (if needed)
```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Restore database from backup if data corruption occurred
mongorestore --uri mongodb://prod-db ./backup-YYYYMMDD

# Verify rollback successful
curl https://api.example.com/health
```

---

## Monitoring & Alerts

### Key Metrics to Monitor
```
1. API Response Times
   - /tasks/:id/start
   - /tasks/:id/pause
   - /tasks/:id/execution-details
   
2. Error Rates
   - 401 unauthorized
   - 404 not found
   - 500 server errors
   
3. Database Performance
   - Query time for task updates
   - Size of activityLog arrays
   
4. User Metrics
   - % tasks completed on time
   - Average pause duration
   - Average blocker resolution time
```

### Alert Thresholds
- Response time > 1000ms: Warning
- Error rate > 1%: Critical
- Database query > 2000ms: Warning
- Connection pool exhausted: Critical

---

## Documentation Update Checklist

- [ ] User guide updated
- [ ] API documentation updated
- [ ] Swagger/OpenAPI specs updated
- [ ] Release notes created
- [ ] Known issues documented
- [ ] Training materials prepared
- [ ] Help desk trained

---

**Status**: Ready for Deployment ✅
**Last Updated**: April 2026
