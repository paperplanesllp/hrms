/**
 * Working Days Calculation Utility
 * Calculates 7 working days (Mon-Fri) from a given date
 * Excludes weekends (Sat & Sun)
 */

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

/**
 * Check if a day is a working day based on configuration
 * @param {number} dayOfWeek - 0-6 where 0=Sunday, 6=Saturday
 * @param {array} workingDays - Array of working day numbers [0-6]
 * @returns {boolean} - true if the day is a working day
 */
function isWorkingDay(dayOfWeek, workingDays = DEFAULT_WORKING_DAYS) {
  return workingDays.includes(dayOfWeek);
}

export function calculateDeadline(startDate = new Date(), workingDays = DEFAULT_WORKING_DAYS) {
  let deadline = new Date(startDate);
  let workingDaysAdded = 0;

  while (workingDaysAdded < 7) {
    deadline.setDate(deadline.getDate() + 1);
    const dayOfWeek = deadline.getDay();
    
    // Check against provided working days configuration
    if (isWorkingDay(dayOfWeek, workingDays)) {
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
 * @param {array} workingDays - Array of working day numbers [0-6]
 * @returns {number} - Number of working days remaining (0 if expired)
 */
export function getRemainingWorkingDays(deadlineDate, workingDays = DEFAULT_WORKING_DAYS) {
  if (new Date() >= deadlineDate) {
    return 0;
  }

  let current = new Date();
  let workingDaysCount = 0;

  while (current < deadlineDate) {
    current.setDate(current.getDate() + 1);
    const dayOfWeek = current.getDay();
    
    if (isWorkingDay(dayOfWeek, workingDays)) {
      workingDaysCount++;
    }
  }

  return workingDaysCount;
}

/**
 * Format deadline status
 * @param {Date} deadlineDate - The deadline date
 * @param {Date} currentDate - Current date (defaults to now)
 * @param {array} workingDays - Array of working day numbers [0-6]
 * @returns {object} - { status: string, daysRemaining: number, isExpired: boolean }
 */
export function getDeadlineStatus(deadlineDate, currentDate = new Date(), workingDays = DEFAULT_WORKING_DAYS) {
  const daysRemaining = getRemainingWorkingDays(deadlineDate, workingDays);
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

/**
 * Check if a specific date is a working day
 * @param {Date} date - The date to check
 * @param {array} workingDays - Array of working day numbers [0-6]
 * @returns {boolean} - true if the date is a working day
 */
export function isDateAWorkingDay(date, workingDays = DEFAULT_WORKING_DAYS) {
  const dayOfWeek = new Date(date).getDay();
  return isWorkingDay(dayOfWeek, workingDays);
}
