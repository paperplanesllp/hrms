# AI Task Generator Implementation Guide

## Overview

The AI Task Generator system enables intelligent task creation, suggestions, and breakdown. It includes:

1. **Text-to-Tasks**: Parse meeting notes and convert to tasks
2. **Email-to-Tasks**: Extract tasks from email
3. **Smart Suggestions**: Context-aware task recommendations
4. **Deadline Prediction**: AI suggests realistic deadlines
5. **Task Breakdown**: Split complex tasks into subtasks
6. **Subtask Management**: Full CRUD for task decomposition

---

## Architecture

```
Frontend Components        Backend Services            Data Models
├── AITaskGeneratorModal        ├── aiTaskGenerator     ├── Task (enhanced)
├── TaskSuggestionsWidget       ├── emailTaskParser     ├── SubTask
└── SubTaskList                 ├── taskSuggestion      ├── TaskHistory
                                └── (controllers)       └── EmployeeProductivity
```

---

## Backend Services

### 1. aiTaskGenerator.service.js

**Location**: `server/src/modules/tasks/services/aiTaskGenerator.service.js`

**Core Methods**:

```javascript
// Parse text and generate structured tasks
await aiTaskGenerator.generateTasksFromText(text, { departmentUsers, createdBy, departmentId })
// Returns: Array of { title, description, assignedTo, dueDate, priority, isAIGenerated, aiConfidence, aiMetadata }

// Predict likely deadline based on similar tasks
await aiTaskGenerator.predictDeadline(taskTitle, department, assignedTo)
// Returns: { deadline, confidence, reasoning }

// Break down task into subtasks
await aiTaskGenerator.breakdownTaskIntoSubtasks(task, maxSubtasks)
// Returns: Array of subtask objects

// Score suggestion for relevance
await aiTaskGenerator.scoreSuggestion(suggestion, userData)
// Returns: 0-1 confidence score
```

**NLP Patterns**:
- Assignee detection: "John will", "assigned to Ahmed", "task for Sarah"
- Deadline parsing: "by Friday", "tomorrow", "in 3 days", "2024-02-15"
- Priority detection: "urgent", "high", "low", "asap"
- Action items: Sentences starting with verbs

**Example Usage**:

```javascript
const tasks = await aiTaskGenerator.generateTasksFromText(
  `John needs to complete the Q4 report by Friday.
   Sarah should prepare the presentation for Monday.
   Mark will update the database schema - urgent`,
  {
    createdBy: userId,
    departmentId: deptId
  }
);

// Returns 3 structured tasks with:
// - Extracted assignees (John, Sarah, Mark)
// - Detected deadlines (Friday, Monday)
// - Detected priorities (urgent for Mark's task)
// - Confidence scores (0.7-0.85)
```

### 2. emailTaskParser.service.js

**Location**: `server/src/modules/tasks/services/emailTaskParser.service.js`

**Core Methods**:

```javascript
// Validate if email contains actionable tasks
emailTaskParser.isTaskEmail(subject, body)
// Returns: boolean

// Extract complete task from email
emailTaskParser.extractTaskFromEmail({ subject, body, from, attachments, receivedDate })
// Returns: { title, description, priority, tags, dueDate, aiMetadata }

// Parse email subject for task hints
emailTaskParser.parseEmailSubject(subject)
// Returns: { title, priority, tags }

// Parse email body for details
emailTaskParser.parseEmailBody(body)
// Returns: { description, actionItems, deadline }

// Generate subtasks from email action items
emailTaskParser.generateSubtasksFromEmail(emailBody, emailTitle)
// Returns: Array of subtask objects
```

**Supported Email Patterns**:
- Subject tags: `[URGENT]`, `[HIGH]`, `TODO:`, `FIXME:`
- Common signatures auto-removed
- Deadline parsing from body
- Automatic priority detection from urgency keywords

### 3. taskSuggestion.service.js

**Location**: `server/src/modules/tasks/services/taskSuggestion.service.js`

**Suggestion Strategies**:

1. **Recurring Pattern**: Detects tasks user does regularly
2. **Department Common**: Suggests what teammates are doing
3. **Progress-Based**: Follow-up tasks after completion
4. **Overdue Prevention**: Alerts for tasks due soon
5. **Task Continuation**: Related tasks based on category

**Core Methods**:

```javascript
// Generate suggestions for user
await taskSuggestion.generateSuggestions(userId, limit = 5)
// Returns: Array of scored suggestions

// Get suggestions by type
await taskSuggestion.getSuggestionsByType(userId, 'recurring-pattern')
// Returns: Filtered suggestions

// Accept suggestion and convert to task
await taskSuggestion.acceptSuggestion(userId, suggestion, taskDefaults)
// Returns: Task data ready to save
```

---

## API Endpoints

### AI Task Generation

**POST `/tasks/ai/generate-from-text`**
```json
{
  "text": "Meeting notes or text content",
  "departmentId": "dept-123"
}
```
Response: Array of created tasks

**POST `/tasks/ai/generate-from-email`**
```json
{
  "subject": "Email subject",
  "body": "Email body content",
  "from": "sender@company.com",
  "attachments": []
}
```
Response: Created task object

### Suggestions

**GET `/tasks/ai/suggestions?limit=5`**
Response: Array of task suggestions

**GET `/tasks/ai/suggestions/:type`**
Response: Suggestions filtered by type

**POST `/tasks/ai/suggestions/:id/accept`**
```json
{
  "suggestion": "{ ...suggestion object }",
  "assignedTo": "user-id",
  "departmentId": "dept-id",
  "dueDate": "2024-02-15"
}
```
Response: Created task

### Predictions

**POST `/tasks/ai/predict-deadline`**
```json
{
  "title": "Task title",
  "department": "dept-id",
  "assignedTo": "user-id"
}
```
Response: `{ deadline, confidence, reasoning }`

### Subtasks

**POST `/tasks/:id/ai/breakdown`**
```json
{
  "maxSubtasks": 5
}
```
Response: Array of created subtasks

**GET `/tasks/:id/ai/subtasks`**
Response: All subtasks for task

**PATCH `/tasks/:id/ai/subtasks/:subTaskId`**
```json
{
  "title": "New title",
  "progress": 50,
  "assignedTo": "user-id"
}
```

**PATCH `/tasks/:id/ai/subtasks/:subTaskId/complete`**
Response: Updated subtask

**DELETE `/tasks/:id/ai/subtasks/:subTaskId`**
Response: Success message

---

## Frontend Components

### 1. AITaskGeneratorModal

**Location**: `erp-dashboard/src/components/tasks/AITaskGeneratorModal.jsx`

**Features**:
- Textarea for paste meeting notes/emails
- Live preview of extracted tasks
- Shows assignees, deadlines, priorities, AI confidence
- Clickable creation with confirmation

**Usage**:

```jsx
import AITaskGeneratorModal from './tasks/AITaskGeneratorModal';

const [isOpen, setIsOpen] = useState(false);

<AITaskGeneratorModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onTasksGenerated={(tasks) => console.log(tasks)}
  departmentId={user.department}
/>
```

**Props**:
- `isOpen`: boolean
- `onClose`: callback function
- `onTasksGenerated`: callback with created tasks
- `departmentId`: string (optional)

### 2. TaskSuggestionsWidget

**Location**: `erp-dashboard/src/components/tasks/TaskSuggestionsWidget.jsx`

**Features**:
- Dashboard widget showing AI suggestions
- One-click task creation from suggestion
- Auto-reload and refresh
- Color-coded by suggestion type
- Shows confidence/match percentage

**Usage**:

```jsx
import TaskSuggestionsWidget from './tasks/TaskSuggestionsWidget';

<TaskSuggestionsWidget
  onTaskCreated={(task) => {
    // Refresh your task list
  }}
/>
```

**Props**:
- `onTaskCreated`: callback with created task

### 3. SubTaskList

**Location**: `erp-dashboard/src/components/tasks/SubTaskList.jsx`

**Features**:
- Display all subtasks for a task
- Check/uncheck completion
- Edit subtask titles
- Delete subtasks
- Progress bar showing completion %
- AI-generated badge with confidence

**Usage**:

```jsx
import SubTaskList from './tasks/SubTaskList';

<SubTaskList
  taskId={taskId}
  onSubtasksLoaded={(subtasks) => {
    // Handle loaded subtasks
  }}
/>
```

**Props**:
- `taskId`: string (task ID)
- `onSubtasksLoaded`: callback with loaded subtasks

---

## Integration Steps

### 1. Add Components to TaskDetailsModal

```jsx
// In TaskDetailsModal.jsx
import AITaskGeneratorModal from './AITaskGeneratorModal';
import SubTaskList from './SubTaskList';

// Add button to open AI generator
<Button onClick={() => setAIGeneratorOpen(true)}>
  <SparklesIcon /> Generate Subtasks
</Button>

// Show subtasks
<SubTaskList taskId={task._id} />
```

### 2. Add Widget to Dashboard

```jsx
// In TaskDashboard.jsx
import TaskSuggestionsWidget from './TaskSuggestionsWidget';

<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  {/* other components */}
  <div className="lg:col-span-1">
    <TaskSuggestionsWidget onTaskCreated={handleTaskCreated} />
  </div>
</div>
```

### 3. Add Generator Button to Main Menu

```jsx
// In TaskManagementPage or similar
<Button onClick={() => setAIGeneratorOpen(true)}>
  <SparklesIcon /> AI Task Generator
</Button>

<AITaskGeneratorModal
  isOpen={showAIGenerator}
  onClose={() => setAIGeneratorOpen(false)}
  onTasksGenerated={handleTasksGenerated}
  departmentId={user.department}
/>
```

---

## Database Models

### SubTask Model

```javascript
{
  _id: ObjectId,
  taskId: ObjectId (ref: Task),         // Parent task
  title: String,                         // Subtask title
  description: String,                   // Optional details
  status: 'pending'|'in-progress'|'completed'|'on-hold',
  progress: Number (0-100),              // Completion percentage
  completedAt: Date,                     // When completed
  assignedTo: ObjectId (ref: User),      // Assigned employee
  estimatedHours: Number,                // Time estimate
  actualHours: Number,                   // Time spent
  order: Number,                         // Display order
  isAIGenerated: Boolean,                // AI-created flag
  aiConfidence: Number (0-1),            // AI confidence
  dependsOnSubTaskId: ObjectId (ref: SubTask),  // Dependency
  createdAt: Date,
  updatedAt: Date
}
```

### Enhanced Task Model

New fields for AI features:
```javascript
{
  hasSubtasks: Boolean,                  // Has breakdown
  subtaskCount: Number,                  // Number of subtasks
  isAIGenerated: Boolean,                // AI-created task
  aiConfidence: Number (0-1),            // AI confidence
  aiMetadata: {
    sourceType: 'text-parsing'|'email'|'suggestion',
    detectedAssignee: String,            // Extracted assignee name
    deadlinePrediction: String,          // Deadline reasoning
    confidenceFactors: {
      hasAssignee: Boolean,
      hasDeadline: Boolean,
      priorityDetected: Boolean
    }
  }
}
```

---

## Configuration

### Environment Variables

Add to `.env`:

```
# AI Task Generation
AI_GENERATION_ENABLED=true
MAX_SUBTASKS_PER_BREAKDOWN=10
TASK_SUGGESTION_LIMIT=5
DEADLINE_PREDICTION_HISTORY_DAYS=90
```

### Frontend Config

In `erp-dashboard/src/lib/config.js`:

```javascript
export const AI_CONFIG = {
  ENABLE_AI_FEATURES: true,
  SUGGESTION_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_TEXT_LENGTH: 10000,
  MAX_EMAIL_SIZE: 5000
};
```

---

## Security Considerations

1. **Authorization**: Only task creators/assignees can view subtasks
2. **Input Validation**: All text input validated and sanitized
3. **Rate Limiting**: Limit AI generation requests (5 per minute)
4. **Audit Trail**: All AI-generated tasks recorded with source
5. **Data Privacy**: Email content not stored, only metadata

---

## Usage Examples

### Example 1: Meeting Notes to Tasks

Input text:
```
Project Kickoff Meeting:
- John will prepare project charter by next Monday
- Sarah needs to create technical design doc (urgent)
- Mark should set up CI/CD pipeline - due Friday
- All: Review requirements document by end of week
```

Generated tasks:
1. "Prepare project charter" → John, due Monday, medium priority
2. "Create technical design doc" → Sarah, due tomorrow, high priority
3. "Set up CI/CD pipeline" → Mark, due Friday, medium priority
4. "Review requirements document" → (unassigned), due Friday, medium priority

### Example 2: Email Integration

Email received:
```
Subject: [URGENT] Client report needed
From: boss@company.com
Body: The client is requesting the Q4 report by EOD today.
      Please review the numbers and send back ASAP.
```

Generated task:
```
{
  title: "[URGENT] Client report needed",
  priority: "high",
  dueDate: 2024-02-15 (EOD today),
  description: "The client is requesting the Q4 report by EOD today...",
  source: "email",
  fromEmail: "boss@company.com"
}
```

### Example 3: Smart Suggestions

For a user who typically completes reports:
- **Recurring Pattern**: "Weekly status report" (user does this every Sunday)
- **Department Common**: "Prepare budget forecast" (3 team members did this)
- **Progress-Based**: "Send report to stakeholders" (follow-up to completed task)
- **Overdue Prevention**: "Review: Database migration" (due in 1 day)

### Example 4: Task Breakdown

Input task:
```
"Build authentication system for mobile app"
```

AI generates subtasks:
1. Design auth flow and security requirements
2. Implement login/signup API endpoints
3. Create frontend auth screens
4. Add password reset functionality
5. Write unit tests for auth

---

## Testing Checklist

- [ ] Generate tasks from sample meeting notes
- [ ] Verify deadlines correctly parsed
- [ ] Test assignee extraction from various formats
- [ ] Generate tasks from email with attachments
- [ ] Verify suggestions appear on dashboard
- [ ] Accept suggestion and verify task creation
- [ ] Create subtasks from complex task
- [ ] Edit/complete/delete subtasks
- [ ] Verify audit trail records AI-generated tasks
- [ ] Test with special characters and long text
- [ ] Verify error handling for invalid input

---

## Troubleshooting

**Q: No tasks generated**
A: Check that text contains action items (verbs) and has proper structure

**Q: Deadline not detected**
A: Verify deadline format matches patterns (e.g., "Friday", "by 2/15", "in 3 days")

**Q: Assignee not found**
A: Confirm user exists in system with exact name/email

**Q: Suggestions empty**
A: User may not have enough history; wait for more completed tasks

**Q: API returning 400**
A: Validate request body has required fields (review controller error message)

---

## Performance Optimization

- Suggestions cached for 5 minutes per user
- Text parsing runs in under 100ms
- Database queries indexed by taskId and userId
- Subtask operations batch-update when possible
- Frontend pagination for large subtask lists (50+ items)

---

## Future Enhancements

1. **Integration with Calendar**: Auto-populate due dates from outlook/google
2. **Voice Input**: Transcribe voice notes to tasks
3. **Smart Reassignment**: Auto-suggest workload balancing
4. **Task Templates**: Learn from user patterns
5. **NLP Enhancement**: Use GPT/Claude for complex parsing
6. **Email Webhook**: Real-time processing of incoming emails
7. **Slack Integration**: Create tasks from Slack messages
8. **Duplicate Detection**: Warn about similar existing tasks

---

## Support & Documentation

- **Backend Logic**: See inline comments in service files
- **Component Usage**: Check JSDoc comments in React components
- **API Contract**: Review tasks.routes.enhanced.js for endpoints
- **Data Flow**: Check aiMetadata field for AI processing details
