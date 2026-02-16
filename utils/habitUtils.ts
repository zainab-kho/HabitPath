import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { getHabitDate, getHabitDayOfWeek } from '@/utils/dateUtils';

/* ============================================================================
   STREAK
============================================================================ */

export async function updateAppStreak(
  habits: Habit[],
  resetHour: number,
  resetMinute: number
): Promise<number> {
  if (habits.length === 0) return 0;

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dateStr = getHabitDate(date, resetHour, resetMinute);

    const completedAny = habits.some(h =>
      h.completionHistory?.includes(dateStr)
    );

    if (!completedAny) break;
    streak++;
  }

  return streak;
}

/* ============================================================================
   HABIT CYCLE HELPERS
============================================================================ */

/**
 * Check if a habit was scheduled for a specific date (ignoring completion)
 */
function isHabitScheduledForDate(
  habit: Habit,
  date: Date,
  resetHour: number,
  resetMinute: number
): boolean {
  const dateStr = getHabitDate(date, resetHour, resetMinute);
  
  // Not started yet
  if (dateStr < habit.startDate) return false;
  
  // One-time goals
  if (!habit.frequency || habit.frequency === 'None') {
    return dateStr === habit.startDate;
  }
  
  // Daily habits
  if (habit.frequency === 'Daily') {
    return true;
  }
  
  // Weekly habits
  if (habit.frequency === 'Weekly') {
    const dow = WEEK_DAYS[getHabitDayOfWeek(date, resetHour, resetMinute)];
    return habit.selectedDays?.includes(dow) ?? false;
  }
  
  // Monthly habits
  if (habit.frequency === 'Monthly') {
    const startDay = parseInt(habit.startDate.split('-')[2], 10);
    const thisDay = parseInt(dateStr.split('-')[2], 10);
    return startDay === thisDay;
  }
  
  return false;
}

/**
 * Returns the start date of the current "cycle" for a habit.
 *
 * For keepUntil habits:
 * - Finds the FIRST incomplete scheduled day and uses that as cycle start
 * - This allows progress to carry over until completed OR next scheduled occurrence
 * - When a new scheduled day arrives, that becomes the new cycle (old incomplete work is abandoned)
 * 
 * For normal habits:
 * - Returns the most recent scheduled day (standard behavior)
 *
 * Examples:
 * - Daily keepUntil: if incomplete yesterday, cycle = yesterday (carries over to today)
 * - Weekly keepUntil: if incomplete on Monday, stays active until next Monday OR completed
 * - Every-2-days keepUntil: if incomplete, carries over until completed OR next scheduled day
 */
export function getHabitCycleStart(
  habit: Habit,
  date: Date,
  resetHour: number,
  resetMinute: number
): string {
  const todayStr = getHabitDate(date, resetHour, resetMinute);
  const startStr = habit.startDate;

  // One-time goals
  if (!habit.frequency || habit.frequency === 'None') {
    return startStr;
  }

  // For keepUntil habits, find the FIRST incomplete scheduled day
  if (habit.keepUntil && habit.completionHistory) {
    let earliestIncomplete: string | null = null;
    
    // Look back up to 365 days for incomplete work
    for (let i = 0; i < 365; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() - i);
      const dStr = getHabitDate(d, resetHour, resetMinute);
      
      // Stop if we go before start date
      if (dStr < startStr) break;
      
      // Check if this day was scheduled
      const wasScheduled = isHabitScheduledForDate(habit, d, resetHour, resetMinute);
      
      if (wasScheduled) {
        // If completed, stop here - cycle starts AFTER completion
        if (habit.completionHistory.includes(dStr)) {
          break;
        }
        // If incomplete, this is part of current cycle
        earliestIncomplete = dStr;
      }
    }
    
    // If we found incomplete work, use that as cycle start
    if (earliestIncomplete) {
      return earliestIncomplete;
    }
  }

  // Standard cycle logic for non-keepUntil or when no incomplete history
  
  // Daily habits
  if (habit.frequency === 'Daily') {
    return todayStr;
  }

  // Weekly habits (based on selectedDays)
  if (habit.frequency === 'Weekly') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);

      const dStr = getHabitDate(d, resetHour, resetMinute);
      const dow = WEEK_DAYS[getHabitDayOfWeek(d, resetHour, resetMinute)];

      if (dStr >= startStr && habit.selectedDays?.includes(dow)) {
        return dStr;
      }
    }

    return startStr;
  }

  // Monthly habits (repeat on same day-of-month as startDate)
  if (habit.frequency === 'Monthly') {
    const startDay = parseInt(startStr.split('-')[2], 10);
    const todayDay = parseInt(todayStr.split('-')[2], 10);

    const cycleDate = new Date(date);
    if (todayDay < startDay) {
      cycleDate.setMonth(cycleDate.getMonth() - 1);
    }
    cycleDate.setDate(startDay);

    return getHabitDate(cycleDate, resetHour, resetMinute);
  }

  return todayStr;
}

/* ============================================================================
   VISIBILITY / SCHEDULING
============================================================================ */

/**
 * Determines whether a habit should be visible on a given date.
 *
 * For keepUntil habits:
 * - Shows on the day it was scheduled (based on frequency)
 * - Shows on the day it was completed (for viewing history)
 * - Carries over ONLY to actual today if incomplete
 * - Does NOT show on random future dates when browsing
 *
 * For normal habits:
 * - Shows only on scheduled days
 */
export function isHabitActiveToday(
  habit: Habit,
  date: Date,
  resetHour: number,
  resetMinute: number
): boolean {
  const todayStr = getHabitDate(date, resetHour, resetMinute);
  const actualTodayStr = getHabitDate(new Date(), resetHour, resetMinute);
  const isViewingToday = todayStr === actualTodayStr;

  // Not started yet
  if (todayStr < habit.startDate) return false;

  // Snoozed
  if (habit.snoozedUntil && todayStr < habit.snoozedUntil) return false;

  // One-time goals (freq = None)
  if (!habit.frequency || habit.frequency === 'None') {
    if (habit.keepUntil) {
      const cycleStart = getHabitCycleStart(habit, date, resetHour, resetMinute);
      
      // Check if completed (either checkmark OR reached increment goal)
      let isCompleted = habit.completionHistory?.includes(cycleStart) ?? false;
      
      // For increment habits, also check if goal was reached
      if (habit.increment && !isCompleted) {
        const currentAmount = habit.incrementHistory?.[cycleStart] ?? 0;
        const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
        isCompleted = currentAmount >= goal;
      }
      
      // If completed, ONLY show on the completion date (for viewing history)
      if (isCompleted) {
        return todayStr === cycleStart;
      }
      
      // If incomplete:
      // - Show on start date
      // - Show on actual TODAY if started in past (carry over)
      // - Do NOT show on random future/past dates when browsing
      if (todayStr === habit.startDate) {
        return true; // Show on start date
      }
      
      if (isViewingToday && todayStr > habit.startDate) {
        return true; // Carry over to actual today only
      }
      
      return false;
    } else {
      // Normal one-time goals: show only on start date
      return todayStr === habit.startDate;
    }
  }

  // For repeating keepUntil habits, check if there's incomplete work carrying over
  if (habit.keepUntil) {
    const cycleStart = getHabitCycleStart(habit, date, resetHour, resetMinute);
    
    // If cycle started in the past and not completed, show it ONLY on actual today
    if (cycleStart < todayStr) {
      let isCompleted = habit.completionHistory?.includes(cycleStart) ?? false;
      
      // For increment habits, also check if goal was reached
      if (habit.increment && !isCompleted) {
        const currentAmount = habit.incrementHistory?.[cycleStart] ?? 0;
        const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
        isCompleted = currentAmount >= goal;
      }
      
      if (!isCompleted && isViewingToday) {
        return true; // Carry over to actual today only
      }
    }
  }

  // Standard scheduling rules for repeating habits
  
  // Daily habits
  if (habit.frequency === 'Daily') {
    return habit.startDate <= todayStr;
  }

  // Weekly habits
  if (habit.frequency === 'Weekly') {
    if (habit.startDate === todayStr) return true;

    if (habit.startDate < todayStr) {
      const dow = WEEK_DAYS[getHabitDayOfWeek(date, resetHour, resetMinute)];
      return habit.selectedDays?.includes(dow) ?? false;
    }

    return false;
  }

  // Monthly habits
  if (habit.frequency === 'Monthly') {
    if (habit.startDate > todayStr) return false;

    const startDay = parseInt(habit.startDate.split('-')[2], 10);
    const todayDay = parseInt(todayStr.split('-')[2], 10);
    return startDay === todayDay;
  }

  return false;
}

/* ============================================================================
   STATUS
============================================================================ */

export type HabitStatus = 'completed' | 'skipped' | 'snoozed' | 'active' | 'missed';

export const getHabitStatus = (
  habit: Habit,
  dateStr: string,
  isViewingToday: boolean,
  todayStr: string, // must be computed via getHabitDate to respect reset hour — never raw new Date()
): HabitStatus => {
  // snoozed check first so snoozed habits don't show as missed
  if (habit.snoozedUntil && dateStr <= habit.snoozedUntil) return 'snoozed';

  // completed via checkmark
  if (habit.completionHistory?.includes(dateStr)) return 'completed';

  // completed via increment goal reached
  if (habit.increment) {
    const amount = habit.incrementHistory?.[dateStr] ?? 0;
    const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
    if (amount >= goal) return 'completed';
  }

  // explicitly skipped
  if (habit.skippedDates?.includes(dateStr)) return 'skipped';

  // past date and never completed = missed
  // uses todayStr (reset-hour-aware) not raw UTC to avoid off-by-one around midnight
  if (!isViewingToday && dateStr < todayStr) return 'missed';

  return 'active';
};

export const addStatusToHabits = (
  habits: Habit[],
  viewingDate: Date,
  resetHour: number,
  resetMinute: number
): (Habit & { status: HabitStatus })[] => {
  const dateStr = getHabitDate(viewingDate, resetHour, resetMinute);
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute); // same source — respects reset hour
  const isViewingToday = dateStr === todayStr;

  return habits.map(h => ({
    ...h,
    status: getHabitStatus(h, dateStr, isViewingToday, todayStr),
  }));
};

/* ============================================================================
   PROGRESS
============================================================================ */

export const getProgressUnitsForDay = (
  habits: (Habit & { status: HabitStatus })[],
  dateStr: string
): { progressTotal: number; progressEarned: number; progressSkipped: number } => {
  // progressTotal  = completed + active + missed (your real workload for the day)
  // progressEarned = completed (how much you've done)
  // progressSkipped = skipped + snoozed (shown as a separate color, not in the denominator)
  let progressTotal = 0;
  let progressEarned = 0;
  let progressSkipped = 0;

  for (const h of habits) {
    if (h.status === 'skipped' || h.status === 'snoozed') {
      progressSkipped += 1;
      continue;
    }

    // completed, active, missed all count toward the workload total
    progressTotal += 1;

    if (h.status !== 'completed') continue;

    if (!h.increment) {
      progressEarned += 1;
      continue;
    }

    // increment habits: partial progress
    const currentAmount = h.incrementHistory?.[dateStr] ?? 0;
    const goal = typeof h.incrementGoal === 'number' ? h.incrementGoal : 0;
    if (goal > 0) {
      progressEarned += Math.min(currentAmount / goal, 1);
    } else {
      progressEarned += currentAmount > 0 ? 1 : 0;
    }
  }

  return { progressTotal, progressEarned, progressSkipped };
};