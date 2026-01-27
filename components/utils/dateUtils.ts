// @/components/utils/dateUtils.ts

/**
 * formats a Date object to YYYY-MM-DD string in local timezone
 * (avoids UTC timezone conversion issues)
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * parses a YYYY-MM-DD string into a Date object in local timezone
 * (avoids UTC timezone conversion issues)
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
 * gets the current date in YYYY-MM-DD format in local timezone
 */
export const getTodayLocal = (): string => {
  return formatLocalDate(new Date());
};

/**
 * formats a Date object for display (e.g., "Thu, Jan 14")
 */
export const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * formats current time (e.g., "3:45 PM")
 */
export const formatDisplayTime = (date: Date = new Date()): string => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * formats today's date to a weekday name (e.g., "Monday")
 */
export const getTodayWeekday = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date().getDay()];
};