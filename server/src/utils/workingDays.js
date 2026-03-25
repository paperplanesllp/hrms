/**
 * Working Days Calculation Utility
 * Calculates 7 working days (Mon-Fri) from a given date
 * Excludes weekends (Sat & Sun)
 */

export function calculateDeadline(startDate = new Date()) {
  let deadline = new Date(startDate);
  let workingDaysAdded = 0;

  while (workingDaysAdded < 7) {
    deadline.setDate(deadline.getDate() + 1);
    const dayOfWeek = deadline.getDay();
    
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDaysAdded++;
    }
  }

  return deadline;
}

/**
 * Check if deadline has passed
 * @param {Date} deadlineDate - The deadline date
 * @returns {boolean} - true if deadline has passed
 */
export function isDeadlineExpired(deadlineDate) {
  return new Date() > deadlineDate;
}

/**
 * Get remaining working days
 * @param {Date} deadlineDate - The deadline date
 * @returns {number} - Number of working days remaining (0 if expired)
 */
export function getRemainingWorkingDays(deadlineDate) {
  if (new Date() >= deadlineDate) {
    return 0;
  }

  let current = new Date();
  let workingDays = 0;

  while (current < deadlineDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }

  return workingDays;
}

/**
 * Format deadline status
 * @param {Date} deadlineDate - The deadline date
 * @param {Date} currentDate - Current date (defaults to now)
 * @returns {object} - { status: string, daysRemaining: number, isExpired: boolean }
 */
export function getDeadlineStatus(deadlineDate, currentDate = new Date()) {
  const daysRemaining = getRemainingWorkingDays(deadlineDate);
  const isExpired = isDeadlineExpired(deadlineDate);

  let status = "On Track";
  if (isExpired) {
    status = "OVERDUE";
  } else if (daysRemaining <= 1) {
    status = "Urgent";
  } else if (daysRemaining <= 3) {
    status = "Due Soon";
  }

  return {
    status,
    daysRemaining,
    isExpired,
    deadline: deadlineDate.toISOString().split("T")[0]
  };
}
