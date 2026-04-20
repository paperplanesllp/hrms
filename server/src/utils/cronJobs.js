import cron from "node-cron";
import { createReminderNotifications } from "../modules/notifications/notification.service.js";
import { autoDeleteOldPayrolls } from "../modules/payroll/payroll.service.js";
import { autoMarkAbsentees, getAttendanceSummaryForToday } from "../modules/attendance/attendance.service.js";
import { sendDocumentDeadlineReminders, markOverdueDocuments } from "../modules/documents/document.service.js";
import { initializeTaskScheduler } from "../services/taskScheduler.service.js";
import { initializeTaskReminders } from "../modules/tasks/task.reminder.js";

export const startCronJobs = () => {
  // Clock-in reminder: Monday-Friday at 9:30 AM
  cron.schedule('30 9 * * 1-5', async () => {
    try {
      console.log('Sending clock-in reminders...');
      await createReminderNotifications(
        "reminder",
        "⏰ Clock-In Reminder",
        "Good Morning! It's 9:30 AM. Please remember to clock in for your shift.",
        "/attendance"
      );
      console.log('Clock-in reminders sent successfully');
    } catch (error) {
      console.error('Failed to send clock-in reminders:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });

  // Clock-out reminder: Monday-Friday at 6:30 PM
  cron.schedule('30 18 * * 1-5', async () => {
    try {
      console.log('Sending clock-out reminders...');
      await createReminderNotifications(
        "reminder",
        "🏠 Clock-Out Reminder",
        "Workday Complete! It's 6:30 PM. Don't forget to clock out before you leave.",
        "/attendance"
      );
      console.log('Clock-out reminders sent successfully');
    } catch (error) {
      console.error('Failed to send clock-out reminders:', error);
    }
  }, {
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });

  // ============================================
  // AUTO-MARK ATTENDANCE (ABSENT/SHORT HOURS/HALF DAY)
  // ============================================
  // Runs Monday-Friday at 7:00 PM (19:00)
  // This marks any staff who didn't check in as ABSENT
  cron.schedule('0 19 * * 1-5', async () => {
    try {
      console.log('\n🔄 [AUTO-ATTENDANCE] Starting auto-mark absent job...');
      const result = await autoMarkAbsentees();
      
      // Get summary after marking
      const summary = await getAttendanceSummaryForToday();
      
      console.log('\n📋 [AUTO-ATTENDANCE] Daily Summary:');
      console.log(`   Total Staff: ${summary.totalStaff}`);
      console.log(`   ✅ Present: ${summary.present}`);
      console.log(`   ◐ Half Day: ${summary.halfDay}`);
      console.log(`   ❌ Absent: ${summary.absent}`);
      console.log(`   ⚠️  Short Hours: ${summary.shortHours}`);
      console.log(`   ❓ Not Marked Yet: ${summary.notMarked}\n`);
    } catch (error) {
      console.error('[AUTO-ATTENDANCE] Failed to auto-mark absent:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Auto-delete old payrolls: Daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('Running payroll auto-cleanup...');
      await autoDeleteOldPayrolls();
    } catch (error) {
      console.error('Failed to auto-delete payrolls:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // ============================================
  // DOCUMENT DEADLINE REMINDERS & OVERDUE TRACKING
  // ============================================
  // Runs DAILY at 10:00 AM to send document deadline reminders
  cron.schedule('0 10 * * *', async () => {
    try {
      console.log('\n📄 [DOCUMENTS] Starting document deadline reminder job...');
      const result = await sendDocumentDeadlineReminders();
      console.log('📬 Document deadline reminders sent:', result.message);
    } catch (error) {
      console.error('[DOCUMENTS] Failed to send document reminders:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Mark overdue documents: Runs DAILY at 12:01 AM (just after midnight)
  cron.schedule('1 0 * * *', async () => {
    try {
      console.log('\n⚠️  [DOCUMENTS] Marking overdue documents...');
      const result = await markOverdueDocuments();
      console.log('✅ Overdue documents marked');
    } catch (error) {
      console.error('[DOCUMENTS] Failed to mark overdue documents:', error);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // ============================================
  // TASK REMINDERS & OVERDUE TRACKING
  // ============================================
  // Initialize task scheduler for due reminders and overdue notifications
  try {
    console.log('\n🎯 [TASKS] Initializing task reminder scheduler...');
    initializeTaskScheduler();
    console.log('✅ Task scheduler initialized - checking every minute for due reminders and overdue tasks');
  } catch (error) {
    console.error('[TASKS] Failed to initialize task scheduler:', error);
  }

  // Initialize daily incomplete task reminders (9:00 AM on weekdays)
  try {
    console.log('\n📬 [DAILY_REMINDERS] Initializing daily task reminders...');
    initializeTaskReminders();
    console.log('✅ Daily task reminders initialized - will run at 9:00 AM on weekdays');
  } catch (error) {
    console.error('[DAILY_REMINDERS] Failed to initialize daily task reminders:', error);
  }

  console.log('Cron jobs started successfully');
};