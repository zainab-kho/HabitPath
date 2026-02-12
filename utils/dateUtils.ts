// @/utils/dateUtils.ts
/**
 * Centralized Date Utilities
 * All date-related functions for the habit tracking system
 */

/**
 * Returns "Today", "Tomorrow", or formatted date
 * Respects habit reset time
 */
// export const getHabitDateLabel = (
//   date: Date,
//   resetHour: 
// )

/**
 * Get the habit date string respecting custom reset time
 * If current time is before reset time, counts as previous day
 * 
 * @param date - The date to convert
 * @param resetHour - Hour when the day resets (0-23)
 * @param resetMinute - Minute when the day resets (0-59)
 * @returns Date string in YYYY-MM-DD format
 */
export const getHabitDate = (
  date: Date | null,
  resetHour: number = 4,
  resetMinute: number = 0
): string => {
  if (!date) {
    date = new Date();
  }

  const d = new Date(date);
  const currentHour = d.getHours();
  const currentMinute = d.getMinutes();

  if (currentHour < resetHour || (currentHour === resetHour && currentMinute < resetMinute)) {
    d.setDate(d.getDate() - 1);
  }

  // use local timezone instead of UTC
  return formatLocalDate(d);
};

/**
 * Get the current habit day as a Date object
 * Respects the custom reset time
 * 
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns The current habit day as a Date
 */
export const getCurrentHabitDay = (resetHour = 4, resetMinute = 0): Date => {
  const now = new Date();

  const beforeReset =
    now.getHours() < resetHour ||
    (now.getHours() === resetHour && now.getMinutes() < resetMinute);

  const day = new Date(now);
  if (beforeReset) day.setDate(day.getDate() - 1);

  // normalize to start of day so it's stable
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
};

/**
 * Format date for display in header
 * Example: "Mon, Jan 29"
 * 
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDateHeader = (date: Date | null): string => {
  if (!date) return 'Loading...';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Check if two dates represent the same habit day
 * Respects reset time
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns true if same habit day
 */
export const isSameHabitDay = (
  date1: Date | null,
  date2: Date | null,
  resetHour: number = 4,
  resetMinute: number = 0
): boolean => {
  if (!date1 || !date2) return false;

  const habitDate1 = getHabitDate(date1, resetHour, resetMinute);
  const habitDate2 = getHabitDate(date2, resetHour, resetMinute);

  return habitDate1 === habitDate2;
};

/**
 * Check if viewing date is today (respecting reset time)
 * 
 * @param date - Date to check
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns true if viewing today
 */
export const isToday = (
  date: Date | null,
  resetHour: number = 4,
  resetMinute: number = 0
): boolean => {
  return isSameHabitDay(date, new Date(), resetHour, resetMinute);
};

/**
 * Checks if a date string is in the past (before today)
 */
export const isPast = (dateString: string): boolean => {
  return dateString < getTodayLocal();
};

/**
 * Navigate to next/previous date
 * 
 * @param currentDate - Current viewing date
 * @param direction - 'prev' or 'next'
 * @returns New date
 */
export const navigateDate = (
  currentDate: Date,
  direction: 'prev' | 'next'
): Date => {
  const newDate = new Date(currentDate);
  newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
  return newDate;
};

/**
 * Get day of week index (0 = Sunday, 6 = Saturday)
 * Respects habit reset time
 * 
 * @param date - Date to check
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns Day of week index
 */
export const getHabitDayOfWeek = (
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): number => {
  // Get the habit date string, then parse it back to get the correct day
  const habitDateStr = getHabitDate(date, resetHour, resetMinute);
  const habitDate = new Date(habitDateStr + 'T12:00:00'); // Use noon to avoid timezone issues
  return habitDate.getDay();
};

/**
 * Format date range for display
 * Example: "Jan 25 - Jan 31"
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range
 */
export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const start = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${start} - ${end}`;
};

/**
 * Get start of day (at reset time)
 * 
 * @param date - The date
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns Date at reset time
 */
export const getStartOfHabitDay = (
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): Date => {
  const start = new Date(date);
  start.setHours(resetHour, resetMinute, 0, 0);
  return start;
};

/**
 * Calculate days between two dates
 * 
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((date2.getTime() - date1.getTime()) / oneDay);
};

/**
 * Check if date is in the past (before today)
 * Respects reset time
 * 
 * @param date - Date to check
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns true if date is in the past
 */
export const isPastDate = (
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): boolean => {
  const habitDate = getHabitDate(date, resetHour, resetMinute);
  const todayHabitDate = getHabitDate(new Date(), resetHour, resetMinute);
  return habitDate < todayHabitDate;
};

/**
 * Check if date is in the future (after today)
 * Respects reset time
 * 
 * @param date - Date to check
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns true if date is in the future
 */
export const isFutureDate = (
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): boolean => {
  const habitDate = getHabitDate(date, resetHour, resetMinute);
  const todayHabitDate = getHabitDate(new Date(), resetHour, resetMinute);
  return habitDate > todayHabitDate;
};

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
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
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
 * Sorts assignments by due date (oldest first), with no due date at the end.
 * Same due_date -> sort by due_time (earliest first), defaulting missing/invalid times to 12:00 PM.
 * Remaining ties -> stable deterministic tie-breakers (name/title, then id).
 */
export const sortByDueDate = <
  T extends {
    due_date?: string | null;
    due_time?: string | null; // change this if yours is named differently
    title?: string | null;
    name?: string | null;
    id?: string | null;
  }
>(
  assignments: T[]
): T[] => {
  const DEFAULT_DUE_MINUTES = 12 * 60; // 12:00 PM

  const toMinutes = (t?: string | null) => {
    if (!t) return DEFAULT_DUE_MINUTES;
    const [hh, mm] = t.split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return DEFAULT_DUE_MINUTES;
    return hh * 60 + mm;
  };

  const getLabel = (a: T) => (a.title ?? a.name ?? '').toLowerCase();
  const getId = (a: T) => (a.id ?? '').toLowerCase();

  return [...assignments].sort((a, b) => {
    // no due dates go to the end
    if (!a.due_date && !b.due_date) return getLabel(a).localeCompare(getLabel(b)) || getId(a).localeCompare(getId(b));
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;

    // date first
    const dateCmp = compareDateStrings(a.due_date, b.due_date);
    if (dateCmp !== 0) return dateCmp;

    // then time (default noon)
    const timeCmp = toMinutes(a.due_time) - toMinutes(b.due_time);
    if (timeCmp !== 0) return timeCmp;

    // deterministic tie-breakers (NOT created_at)
    const labelCmp = getLabel(a).localeCompare(getLabel(b));
    if (labelCmp !== 0) return labelCmp;

    return getId(a).localeCompare(getId(b));
  });
};