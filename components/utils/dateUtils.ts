// @/components/utils/dateUtils.ts

/**
 * formats a Date object to YYYY-MM-DD string in local timezone
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * parses a YYYY-MM-DD string into a Date object in local timezone
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
 * gets today's date in YYYY-MM-DD format
 */
export const getTodayLocal = (): string => formatLocalDate(new Date());

/**
 * adds N days to today and returns YYYY-MM-DD
 */
export const addDaysLocal = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};

/**
 * formats a date for display, e.g., "Thu, Jan 14"
 */
export const formatDisplayDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

/**
 * formats current time, e.g., "3:45 PM"
 */
export const formatDisplayTime = (date: Date = new Date()): string =>
  date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * get today weekday name, e.g., "Monday"
 */
export const getTodayWeekday = (): string => {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  return days[new Date().getDay()];
};