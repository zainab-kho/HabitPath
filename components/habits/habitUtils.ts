import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { getHabitDate, getHabitDayOfWeek } from '@/utils/dateUtils';

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
   COMPLETION + PROGRESS (DERIVED STATE)
============================================================================ */

/**
 * Adds a derived `completed` flag to habits based on the CURRENT CYCLE.
 *
 * For increment habits:
 * - Ensures incrementGoal defaults to 1 if missing
 * - Loads progress from incrementHistory[cycleStart]
 *
 * Completion is stored per-cycle, which allows habits to persist across days
 * until the next scheduled occurrence (for keepUntil habits).
 */
export function addCompletedProperty(
  habits: Habit[],
  date: Date,
  resetHour: number,
  resetMinute: number
): (Habit & { completed: boolean })[] {
  return habits.map(habit => {
    const cycleStart = getHabitCycleStart(
      habit,
      date,
      resetHour,
      resetMinute
    );

    // Check if completed via checkmark
    let completed = habit.completionHistory?.includes(cycleStart) ?? false;

    // For increment habits, ensure goal defaults to 1
    const incrementGoal = habit.increment
      ? (habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1)
      : habit.incrementGoal;

    const currentAmount = habit.incrementHistory?.[cycleStart] ?? 0;

    // DEBUG: Always log for habits with "increment" in the name
    if (habit.name.toLowerCase().includes('increment')) {
      console.log(`\n🔍 Checking "${habit.name}":`);
      console.log(`   habit.increment: ${habit.increment}`);
      console.log(`   completed (from history): ${completed}`);
      console.log(`   incrementGoal (raw): ${habit.incrementGoal}`);
      console.log(`   incrementGoal (normalized): ${incrementGoal}`);
      console.log(`   currentAmount: ${currentAmount}`);
      console.log(`   cycleStart: ${cycleStart}`);
      console.log(`   keepUntil: ${habit.keepUntil}`);
    }

    // For increment habits, also check if goal was reached
    // This makes them show as "completed" for the toggle hide/show
    if (habit.increment && !completed && incrementGoal) {
      const goalReached = currentAmount >= incrementGoal;
      
      console.log(`   ✅ Entering goal check:`)
      console.log(`   goalReached: ${goalReached} (${currentAmount} >= ${incrementGoal})`);
      
      completed = goalReached;
    }

    if (habit.name.toLowerCase().includes('increment')) {
      console.log(`   FINAL completed: ${completed}\n`);
    }

    return {
      ...habit,
      completed,
      incrementAmount: currentAmount,
      incrementGoal, // normalized goal
    };
  });
}

/* ============================================================================
   FILTERING HELPERS
============================================================================ */

/**
 * Returns only habits that are scheduled to be active on a given date.
 * Completion status does not affect this filter.
 */
export function getActiveHabitsForDate(
  habits: Habit[],
  date: Date,
  resetHour: number,
  resetMinute: number
): Habit[] {
  return habits.filter(habit =>
    isHabitActiveToday(habit, date, resetHour, resetMinute)
  );
}