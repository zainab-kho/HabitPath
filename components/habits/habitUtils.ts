// @/components/habits/habitUtils.ts
import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { getHabitDate, getHabitDayOfWeek } from '@/utils/dateUtils';

/**
 * Check if a habit should be active/visible on a given date
 * Respects frequency, selected days, start date, snooze status, keepUntil, and increment goals
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

  // Get current increment amount for today
  const currentAmount = habit.incrementHistory?.[todayStr] || 0;
  
  // Increment habits with goals now stay visible even when goal is reached
  // They'll show a checkmark but remain on the list for the day
  
  // Increment habits WITHOUT goals stay visible (they can be incremented indefinitely)

  // KeepUntil logic: if habit is marked as keepUntil, it stays visible until explicitly completed
  // This is handled by the completed flag in the completion history
  if (habit.keepUntil && habit.completionHistory?.includes(todayStr)) {
    return false; // Hide if explicitly marked as complete
  }

  // Get day of week using centralized function
  const dayOfWeekIndex = getHabitDayOfWeek(checkDate, resetHour, resetMinute);
  const dayOfWeek = WEEK_DAYS[dayOfWeekIndex];

  // Non-repeating habits (goals) - only show on exact start date (unless keepUntil)
  if (habit.frequency === 'None' || !habit.frequency) {
    if (habit.keepUntil) {
      // keepUntil goals stay visible after start date until completed
      return startDateStr <= todayStr;
    }
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
    const startDateParts = startDateStr.split('-');
    const startDay = parseInt(startDateParts[2], 10);
    
    // Get today's day of month
    const todayDateParts = todayStr.split('-');
    const todayDay = parseInt(todayDateParts[2], 10);

    return startDay === todayDay;
  }

  return false;
};

/**
 * Add completed property to habits based on viewing date
 * For increment habits with goals, also check if goal is reached
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
  
  return habits.map(habit => {
    // Check explicit completion (only from completionHistory)
    const explicitlyCompleted = habit.completionHistory?.includes(dateStr) ?? false;
    
    // For increment habits, we don't auto-mark as "completed" when goal is reached
    // The visual checkmark is shown by isGoalReached in the component
    // But the habit isn't considered "completed" unless user manually marks it
    const completed = explicitlyCompleted;
    
    if (habit.increment) {
      console.log(`🔢 Processing increment habit "${habit.name}":`, {
        dateStr,
        incrementHistory: habit.incrementHistory,
        currentAmount: habit.incrementHistory?.[dateStr] || 0,
      });
    }
    
    return {
      ...habit,
      completed,
      // Update incrementAmount to today's amount for display
      incrementAmount: habit.incrementHistory?.[dateStr] || 0,
    };
  });
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