// @/components/habits/habitUtils.ts
import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { getHabitDate, getHabitDayOfWeek } from '@/utils/dateUtils';

/**
 * Check if a habit should be active/visible on a given date
 * Respects frequency, selected days, start date, and snooze status
 * 
 * @param habit - The habit to check
 * @param date - The date to check (defaults to today)
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns true if habit should be shown on this date
 */
export const isHabitActiveToday = (
  habit: Habit,
  date?: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): boolean => {
  const checkDate = date || new Date();
  
  // use centralized date utilities
  const todayStr = getHabitDate(checkDate, resetHour, resetMinute);
  const startDateStr = habit.startDate;

  // hide if today is BEFORE the start date
  if (todayStr < startDateStr) {
    return false;
  }

  // Hide if today is BEFORE the snooze-until date
  if (habit.snoozedUntil && todayStr < habit.snoozedUntil) {
    return false;
  }

  // Get day of week using centralized function
  const dayOfWeekIndex = getHabitDayOfWeek(checkDate, resetHour, resetMinute);
  const dayOfWeek = WEEK_DAYS[dayOfWeekIndex];

  // Non-repeating habits (goals) - only show on exact start date
  if (habit.frequency === 'None' || !habit.frequency) {
    return startDateStr === todayStr;
  }

  // Daily habits - show every day after start date
  if (habit.frequency === 'Daily') {
    return startDateStr <= todayStr;
  }

  // Weekly habits
  if (habit.frequency === 'Weekly') {
    // Show on start date regardless of selected day
    if (startDateStr === todayStr) return true;
    
    // After start date, only show on selected days
    if (startDateStr < todayStr) {
      return habit.selectedDays?.includes(dayOfWeek) ?? false;
    }
    
    return false;
  }

  // Monthly habits - repeat on the same day of month as startDate
  if (habit.frequency === 'Monthly') {
    if (startDateStr > todayStr) return false; // hasn't started yet

    // Parse the start date to get the day of month
    // Using a consistent parsing method to avoid timezone issues
    const startDateParts = startDateStr.split('-');
    const startDay = parseInt(startDateParts[2], 10); // day of month from startDate
    
    // Get today's day of month from the habit date (which respects reset time)
    const todayDateParts = todayStr.split('-');
    const todayDay = parseInt(todayDateParts[2], 10);

    return startDay === todayDay;
  }

  return false;
};

/**
 * Add completed property to habits based on viewing date
 * 
 * @param habits - Array of habits
 * @param date - The date to check completion for
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns Habits with completed property added
 */
export const addCompletedProperty = (
  habits: Habit[],
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): (Habit & { completed: boolean })[] => {
  const dateStr = getHabitDate(date, resetHour, resetMinute);
  
  return habits.map(habit => ({
    ...habit,
    completed: habit.completionHistory?.includes(dateStr) ?? false,
  }));
};

/**
 * Filter habits that are active on a specific date
 * 
 * @param habits - Array of habits
 * @param date - The date to filter for
 * @param resetHour - Hour when the day resets
 * @param resetMinute - Minute when the day resets
 * @returns Filtered array of active habits
 */
export const getActiveHabitsForDate = (
  habits: Habit[],
  date: Date,
  resetHour: number = 4,
  resetMinute: number = 0
): Habit[] => {
  return habits.filter(habit => 
    isHabitActiveToday(habit, date, resetHour, resetMinute)
  );
};

/**
 * Calculate completion rate for a habit
 * 
 * @param habit - The habit to calculate for
 * @returns Completion rate as percentage (0-100)
 */
export const getHabitCompletionRate = (habit: Habit): number => {
  if (!habit.completionHistory || habit.completionHistory.length === 0) {
    return 0;
  }

  // Calculate based on days since start
  const startDate = new Date(habit.startDate);
  const today = new Date();
  const daysSinceStart = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  
  const completionCount = habit.completionHistory.length;
  return Math.round((completionCount / daysSinceStart) * 100);
};