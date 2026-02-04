import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { getHabitDate, getHabitDayOfWeek } from '@/utils/dateUtils';

/* ============================================================================
   HABIT CYCLE HELPERS
============================================================================ */

/**
 * Returns the start date of the current "cycle" for a habit.
 *
 * A cycle represents one scheduled window in which a habit can be completed.
 * Completion and increment progress are tracked against this cycle start,
 * NOT the calendar day.
 *
 * Examples:
 * - Daily habit → cycle starts today
 * - Weekly habit → cycle starts on the most recent selected weekday
 * - One-time goal → cycle starts on the habit's startDate
 *
 * This enables "carry-over" behavior for keepUntil habits:
 * if the habit is missed, it remains active until the next cycle begins,
 * at which point it resets automatically.
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
 * IMPORTANT:
 * - Visibility is based ONLY on scheduling rules
 * - Completion does NOT hide a habit
 * - keepUntil habits are allowed to carry over until the next cycle
 *
 * Completion is handled separately by derived state.
 */
export function isHabitActiveToday(
  habit: Habit,
  date: Date,
  resetHour: number,
  resetMinute: number
): boolean {
  const todayStr = getHabitDate(date, resetHour, resetMinute);

  // Not started yet
  if (todayStr < habit.startDate) return false;

  // Snoozed
  if (habit.snoozedUntil && todayStr < habit.snoozedUntil) return false;

  // One-time goals
  if (!habit.frequency || habit.frequency === 'None') {
    return habit.keepUntil
      ? habit.startDate <= todayStr
      : habit.startDate === todayStr;
  }

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
 * Completion is stored per-cycle (not per-day), which allows habits
 * to persist across days until the next scheduled occurrence.
 *
 * Increment progress is also keyed to the cycle start so it resets naturally
 * when the next cycle begins.
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

    const completed =
      habit.completionHistory?.includes(cycleStart) ?? false;

    return {
      ...habit,
      completed,
      incrementAmount: habit.incrementHistory?.[cycleStart] ?? 0,
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