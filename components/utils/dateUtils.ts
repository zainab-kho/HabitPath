// @/components/utils/dateUtils.ts

/**
 * Formats a Date object to YYYY-MM-DD string in local timezone
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parses a YYYY-MM-DD string into a Date object in local timezone
 */
export const parseLocalDate = (dateString: string): Date => {
  const parts = dateString.split('-');
  return new Date(
    parseInt(parts[0]),      // year
    parseInt(parts[1]) - 1,  // month (0-indexed)
    parseInt(parts[2])       // day
  );
};

/**
 * Gets today's date in YYYY-MM-DD format
 */
export const getTodayLocal = (): string => formatLocalDate(new Date());

/**
 * Adds N days to today and returns YYYY-MM-DD
 */
export const addDaysLocal = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

/**
 * Adds N days to a specific date string and returns YYYY-MM-DD
 */
export const addDaysToDate = (dateString: string, days: number): string => {
  const d = parseLocalDate(dateString);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

/**
 * Formats a date for display, e.g., "Thu, Jan 14"
 */
export const formatDisplayDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

/**
 * Formats a date string (YYYY-MM-DD) for display
 */
export const formatDisplayDateString = (dateString: string): string =>
  formatDisplayDate(parseLocalDate(dateString));

/**
 * Formats current time, e.g., "3:45 PM"
 */
export const formatDisplayTime = (date: Date = new Date()): string =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Get today weekday name, e.g., "Monday"
 */
export const getTodayWeekday = (): string => {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
};

/**
 * Formats a YYYY-MM-DD date string with optional time for display
 * Returns "Today", "Tomorrow", or full date
 */
export const formatDueDateTimeDisplay = (dateString?: string, timeString?: string): string => {
  if (!dateString) return '';

  const date = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

  let dateStr = '';
  if (dateOnly.getTime() === todayOnly.getTime()) {
    dateStr = 'Today';
  } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    dateStr = 'Tomorrow';
  } else {
    dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  return timeString ? `${dateStr} ${timeString}` : dateStr;
};

/**
 * Formats a Date object for display in forms/modals
 * e.g., "Mon, Jan 14, 2024"
 */
export const formatDateForForm = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Converts a Date object to YYYY-MM-DD for database storage
 */
export const dateToISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Compares two YYYY-MM-DD date strings
 * Returns: -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export const compareDateStrings = (date1: string, date2: string): number => {
  if (date1 < date2) return -1;
  if (date1 > date2) return 1;
  return 0;
};

/**
 * Checks if a date string is before another date string
 */
export const isDateBefore = (date1: string, date2: string): boolean => {
  return date1 < date2;
};

/**
 * Checks if a date string is after another date string
 */
export const isDateAfter = (date1: string, date2: string): boolean => {
  return date1 > date2;
};

/**
 * Checks if a date string is today
 */
export const isToday = (dateString: string): boolean => {
  return dateString === getTodayLocal();
};

/**
 * Checks if a date string is in the past (before today)
 */
export const isPast = (dateString: string): boolean => {
  return dateString < getTodayLocal();
};

/**
 * Checks if a date string is in the future (after today)
 */
export const isFuture = (dateString: string): boolean => {
  return dateString > getTodayLocal();
};

/**
 * Gets the number of days between two date strings
 */
export const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Sorts assignments by due date (oldest first), with no due date at the end
 */
export const sortByDueDate = <T extends { due_date?: string | null }>(
  assignments: T[]
): T[] => {
  return [...assignments].sort((a, b) => {
    // Assignments without due dates go to the end
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    
    // Sort by due date (oldest first)
    return compareDateStrings(a.due_date, b.due_date);
  });
};

/**
 * Sorts assignments by created_at timestamp (newest first for display order)
 * This is used for maintaining the order items were added to day plans
 */
export const sortByCreatedAt = <T extends { created_at?: string | null }>(
  items: T[]
): T[] => {
  return [...items].sort((a, b) => {
    if (!a.created_at && !b.created_at) return 0;
    if (!a.created_at) return 1;
    if (!b.created_at) return -1;
    
    // Sort by created_at (oldest first = order added)
    return a.created_at < b.created_at ? -1 : 1;
  });
};