import { buildTaskAnalyticsReportData } from './server/src/modules/tasks/taskAnalyticsReport.service.js';
import { generateTaskAnalyticsPdfBuffer } from './server/src/modules/tasks/taskAnalyticsPdf.service.js';

// Mock data for testing
const mockOptions = {
  companyId: '507f1f77bcf86cd799439011', // Mock ObjectId
  generatedBy: { name: 'Test User', email: 'test@example.com' },
  from: '2024-01-01',
  to: '2024-01-31',
  dateRange: 'month',
  theme: 'light'
};

const mockReportData = {
  reportTitle: "Test Task Analytics Report",
  brand: {
    productName: "TheHRSaathi",
    companyName: "Test Company",
    contactEmail: "",
    contactPhone: "",
    address: "",
  },
  period: {
    fromDate: new Date('2024-01-01'),
    toDate: new Date('2024-01-31'),
    label: "Jan 1, 2024 - Jan 31, 2024",
    dateRange: "month"
  },
  generatedAt: new Date(),
  generatedBy: "Test User",
  generatedByEmail: "test@example.com",
  theme: "light",
  maxTasksPerEmployee: 100,
  summary: {
    totalTasks: 10,
    completedTasks: 7,
    pendingTasks: 2,
    overdueTasks: 1,
    workedHours: 50,
    productivity: 75,
    completionRate: 70,
    onTimeCompletionRate: 85,
    totalTaskHours: 35,
    extensionRequestedTasks: 0
  },
  employees: [
    {
      employeeId: 'user1',
      employeeName: 'John Doe',
      department: 'Engineering',
      totalTasks: 5,
      completed: 4,
      pending: 1,
      overdue: 0,
      workedHours: 25,
      productivity: 80
    }
  ],
  employeeDetails: [
    {
      employeeId: 'user1',
      employeeName: 'John Doe',
      department: 'Engineering',
      totalTasks: 5,
      completed: 4,
      pending: 1,
      overdue: 0,
      workedHours: 25,
      productivity: 80,
      tasks: [
        {
          title: 'Implement user authentication',
          description: 'Implement secure user authentication with JWT tokens and password hashing',
          status: 'completed',
          priority: 'HIGH',
          dueDate: '2024-01-15',
          completedAt: '2024-01-14',
          startedAt: '2024-01-10',
          assignedBy: 'Manager',
          assignedTo: 'John Doe',
          estimatedHours: 16,
          workedHours: 14,
          pausedHours: 2,
          holdHours: 0,
          pendingHours: 2,
          isOverdue: false,
          extensionStatus: 'none',
          extensionRequested: false,
          remarks: 'Completed ahead of schedule'
        },
        {
          title: 'Design database schema',
          description: 'Design and implement the database schema for the new application',
          status: 'in-progress',
          priority: 'MEDIUM',
          dueDate: '2024-01-25',
          completedAt: null,
          startedAt: '2024-01-12',
          assignedBy: 'Manager',
          assignedTo: 'John Doe',
          estimatedHours: 12,
          workedHours: 8,
          pausedHours: 1,
          holdHours: 0,
          pendingHours: 4,
          isOverdue: false,
          extensionStatus: 'none',
          extensionRequested: false,
          remarks: 'Working on entity relationships'
        }
      ]
    }
  ],
  departments: [
    {
      department: 'Engineering',
      totalTasks: 5,
      completed: 4,
      pending: 1,
      overdue: 0,
      workedHours: 25,
      productivity: 80
    }
  ],
  riskTasks: [],
  charts: {
    taskCompletion: { completed: 7, inProgress: 2, pending: 1, overdue: 0 },
    total: 10,
    byStatus: {
      completed: 7,
      pending: 1,
      inProgress: 2,
      paused: 0,
      onHold: 0,
      overdue: 0,
      extensionRequested: 0
    }
  },
  insights: [
    'Completion rate is moderate at 70%; focused follow-up can improve throughput.',
    'No overdue tasks were detected for this report period.',
    'John Doe leads productivity at 80% across 5 tasks.'
  ],
  memberInfo: null
};

async function testPdfGeneration() {
  try {
    console.log('🧪 Testing PDF generation with mock data...');

    // Test PDF buffer generation
    const pdfBuffer = await generateTaskAnalyticsPdfBuffer(mockReportData);
    console.log('✅ PDF buffer generated successfully');
    console.log(`📄 PDF size: ${pdfBuffer.length} bytes`);

    // Basic validation
    if (pdfBuffer.length < 1000) {
      throw new Error('PDF buffer seems too small, might be corrupted');
    }

    // Check if it starts with PDF header
    const bufferStart = pdfBuffer.subarray(0, 4).toString();
    if (bufferStart !== '%PDF') {
      throw new Error('Generated buffer does not appear to be a valid PDF');
    }

    console.log('✅ PDF validation passed');
    console.log('🎉 All PDF generation tests passed!');

  } catch (error) {
    console.error('❌ PDF generation test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testPdfGeneration();