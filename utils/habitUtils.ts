// @/utils/habitUtils.ts
import { WEEK_DAYS } from '@/constants';
import { Habit } from '@/types/Habit';
import { daysBetween, formatLocalDate, getHabitDate, getHabitDayOfWeek, getWeekDatesForDate, parseLocalDate } from '@/utils/dateUtils';

/* ============================================================================
   TIME TRACKING HELPERS
============================================================================ */

/**
 * Returns true if a habit is a weekly time-tracking habit.
 */
export const isTimeTrackingHabit = (habit: Habit): boolean =>
  !!habit.increment && habit.incrementType === 'Time';

/**
 * Sums incrementHistory entries across all days of the week containing `dateStr`.
 * Returns total minutes logged for that week.
 */
export const getWeeklyTimeTotal = (
  incrementHistory: Record<string, number> | undefined,
  dateStr: string,
): number => {
  if (!incrementHistory) return 0;
  const weekDates = getWeekDatesForDate(dateStr);
  return weekDates.reduce((sum, d) => sum + (incrementHistory[d] ?? 0), 0);
};

/* ============================================================================
   STREAK
============================================================================ */

export async function updateAppStreak(
  habits: Habit[],
  resetHour: number,
  resetMinute: number
): Promise<number> {
  if (habits.length === 0) return 0;

  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = parseLocalDate(todayStr);
    d.setDate(d.getDate() - i);
    const dateStr = formatLocalDate(d);

    const completedAny = habits.some(h =>
      h.completionHistory?.includes(dateStr)
    );

    if (!completedAny) {
      if (dateStr === todayStr) continue;
      break;
    }
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

  // Weekly Goal habits — active every day Mon–Sun of the week
  if (habit.frequency === 'Weekly Goal') {
    const dateMonday = getWeekDatesForDate(dateStr)[0];
    const startMonday = getWeekDatesForDate(habit.startDate)[0];
    return dateMonday >= startMonday;
  }

  // Monthly habits
  if (habit.frequency === 'Monthly') {
    const startDay = parseInt(habit.startDate.split('-')[2], 10);
    const thisDay = parseInt(dateStr.split('-')[2], 10);
    return startDay === thisDay;
  }

  // Custom habits
  if (habit.frequency === 'Custom') {
    const interval = habit.customInterval ?? 1;
    const startDateObj = parseLocalDate(habit.startDate);
    const currentDateObj = parseLocalDate(dateStr);

    if (habit.customType === 'daily') {
      const diff = daysBetween(startDateObj, currentDateObj);
      return diff >= 0 && diff % interval === 0;
    }

    if (habit.customType === 'weekly') {
      const dow = WEEK_DAYS[getHabitDayOfWeek(date, resetHour, resetMinute)];
      if (!(habit.selectedDays?.includes(dow) ?? false)) return false;
      const diff = daysBetween(startDateObj, currentDateObj);
      const weeksDiff = Math.floor(diff / 7);
      return weeksDiff >= 0 && weeksDiff % interval === 0;
    }

    if (habit.customType === 'monthly') {
      const startDay = parseInt(habit.startDate.split('-')[2], 10);
      const thisDay = parseInt(dateStr.split('-')[2], 10);
      if (startDay !== thisDay) return false;
      const startParts = habit.startDate.split('-').map(Number);
      const dateParts = dateStr.split('-').map(Number);
      const monthsDiff = (dateParts[0] - startParts[0]) * 12 + (dateParts[1] - startParts[1]);
      return monthsDiff >= 0 && monthsDiff % interval === 0;
    }
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

  // For keepUntil habits, find the earliest incomplete scheduled day after the last completion
  if (habit.keepUntil) {
    const history = habit.completionHistory ?? [];
    let earliestIncomplete: string | null = null;

    for (let i = 0; i < 365; i++) {
      const d = new Date(date);
      d.setDate(date.getDate() - i);
      const dStr = getHabitDate(d, resetHour, resetMinute);

      if (dStr < startStr) break;

      const wasScheduled = isHabitScheduledForDate(habit, d, resetHour, resetMinute);
      if (!wasScheduled) continue;

      let completed = history.includes(dStr);
      if (habit.increment && !completed) {
        const amt = habit.incrementHistory?.[dStr] ?? 0;
        const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
        completed = amt >= goal;
      }

      if (completed) {
        break;
      }
      earliestIncomplete = dStr;
    }

    if (earliestIncomplete) {
      return earliestIncomplete;
    }
  }

  // Standard cycle logic for non-keepUntil or when no incomplete history

  // Daily habits
  if (habit.frequency === 'Daily') {
    return todayStr;
  }

  // Weekly Goal — cycle start is Monday of the current week
  if (habit.frequency === 'Weekly Goal') {
    return getWeekDatesForDate(todayStr)[0];
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

  // Custom habits — walk backwards to find last scheduled date
  if (habit.frequency === 'Custom') {
    const maxLookback = habit.customType === 'monthly'
      ? 365
      : (habit.customInterval ?? 1) * 7 + 1;

    for (let i = 0; i < maxLookback; i++) {
      const d = new Date(date);
      d.setDate(d.getDate() - i);
      if (isHabitScheduledForDate(habit, d, resetHour, resetMinute)) {
        return getHabitDate(d, resetHour, resetMinute);
      }
    }
  }

  return todayStr;
}

/* ============================================================================
   VISIBILITY / SCHEDULING
============================================================================ */

/**
 * determines whether a habit should be visible on a given date.
 *
 * for keepUntil habits:
 * - shows on the day it was scheduled (based on frequency)
 * - shows on the day it was completed (for viewing history)
 * - carries over ONLY to actual today if incomplete
 * - does not show on random future dates when browsing
 *
 * for normal habits:
 * - shows only on scheduled days
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

  // **REVIEW:
  // archived handling:
  // - repeating habits: archived means "never show"
  // - one-time habits: allow showing on the day they were skipped/completed/start for history
  if (habit.archivedAt) {
    const isOneTime = !habit.frequency || habit.frequency === 'None';
    if (!isOneTime) return false;

    // one-time: show ONLY on meaningful history days
    if (todayStr === habit.startDate) return true;
    if (habit.skippedDates?.includes(todayStr)) return true;
    if (habit.completionHistory?.includes(todayStr)) return true;

    return false;
  }

  // habit not started yet
  if (todayStr < habit.startDate) return false;

  // snoozed — hidden until snoozedUntil day (reappears ON that day)
  // .slice(0,10) normalizes legacy ISO strings ("2026-02-17T05:00:00Z" to "2026-02-17")
  const snoozeDay = habit.snoozedUntil?.slice(0, 10);
  const snoozeFrom = habit.snoozedFrom?.slice(0, 10);

  if (snoozeDay && snoozeFrom) {
    // Hide for the entire snooze window (from snoozeFrom up to but not including snoozeDay)
    if (todayStr >= snoozeFrom && todayStr < snoozeDay) return false;

    // Force show it on the day it was snoozed TO
    if (todayStr === snoozeDay) return true;
  }

  // Show history days even for archived habits
  if (habit.skippedDates?.includes(todayStr)) return true;
  if (habit.completionHistory?.includes(todayStr)) return true;

  // Archived one-time habits: hide on all other days
  if (habit.archivedAt && (!habit.frequency || habit.frequency === 'None')) return false;

  // If it was completed on this day, also show it for history.
  if (habit.completionHistory?.includes(todayStr)) return true;

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

  // End date: stop scheduling new occurrences after end date
  if (habit.endDate && todayStr > habit.endDate) return false;

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

  // Weekly Goal — visible every day of the week
  if (habit.frequency === 'Weekly Goal') {
    const dateMonday = getWeekDatesForDate(todayStr)[0];
    const startMonday = getWeekDatesForDate(habit.startDate)[0];
    if (dateMonday < startMonday) return false;
    // endDate check: compare against Monday so the full last week shows
    if (habit.endDate) {
      const endMonday = getWeekDatesForDate(habit.endDate)[0];
      if (dateMonday > endMonday) return false;
    }
    return true;
  }

  // Monthly habits
  if (habit.frequency === 'Monthly') {
    if (habit.startDate > todayStr) return false;

    const startDay = parseInt(habit.startDate.split('-')[2], 10);
    const todayDay = parseInt(todayStr.split('-')[2], 10);
    return startDay === todayDay;
  }

  // Custom habits — delegate to isHabitScheduledForDate
  if (habit.frequency === 'Custom') {
    return isHabitScheduledForDate(habit, date, resetHour, resetMinute);
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
  viewingDate?: Date,
  resetHour?: number,
  resetMinute?: number,
): HabitStatus => {
  // keepUntil: use cycle start; Weekly Goal: use Monday; snoozed: use snoozedFrom (only while active)
  const isSnoozedNow = habit.snoozedFrom && habit.snoozedUntil && dateStr <= habit.snoozedUntil.slice(0, 10);
  const effectiveDateStr =
    (habit.keepUntil && viewingDate && resetHour !== undefined && resetMinute !== undefined)
      ? getHabitCycleStart(habit, viewingDate, resetHour, resetMinute)
      : habit.frequency === 'Weekly Goal'
        ? getWeekDatesForDate(dateStr)[0]
        : isSnoozedNow
          ? habit.snoozedFrom!
          : dateStr;

  if (habit.name === 'Make bed' || habit.name === 'Wash dishes') {
    console.log(`(**DEBUG) getHabitStatus: name=${habit.name}, dateStr=${dateStr}, effectiveDateStr=${effectiveDateStr}, keepUntil=${habit.keepUntil}, snoozedFrom=${habit.snoozedFrom}, completionHistory=${JSON.stringify(habit.completionHistory?.slice(-5))}`);
  }

  // snoozed check first so snoozed habits don't show as missed
  // use < (not <=) so the habit is active ON the snoozedUntil day
  // .slice(0,10) normalizes legacy ISO strings ("2026-02-17T05:00:00Z" → "2026-02-17")
  if (habit.snoozedUntil && dateStr < habit.snoozedUntil.slice(0, 10)) return 'snoozed';

  // completed via checkmark
  if (habit.completionHistory?.includes(effectiveDateStr)) return 'completed';

  // completed via increment goal reached
  if (habit.increment) {
    // Time-tracking habits: check weekly total instead of daily
    const amount = isTimeTrackingHabit(habit)
      ? getWeeklyTimeTotal(habit.incrementHistory, dateStr)
      : (habit.incrementHistory?.[effectiveDateStr] ?? 0);

    // goal logic must match HabitItem:
    // - keepUntil increments: goal defaults to 1
    // - non-keepUntil increments: goal is optional (0/undefined means no "completion by goal")
    const goal =
      habit.keepUntil
        ? (habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1)
        : (habit.incrementGoal ?? 0);

    if (goal > 0 && amount >= goal) return 'completed';
  }

  // explicitly skipped habits
  if (habit.skippedDates?.includes(effectiveDateStr)) return 'skipped';

  // past date and never completed = missed
  // uses todayStr (reset-hour-aware) not raw UTC to avoid off-by-one around midnight
  if (!isViewingToday && dateStr < todayStr) return 'missed';

  return 'active';
};

function computeHabitStreak(
  habit: Habit,
  resetHour: number,
  resetMinute: number
): number {
  const history = habit.completionHistory ?? [];
  if (history.length === 0) return 0;

  const oneTime = !habit.frequency || habit.frequency === 'None';
  if (oneTime) return 0;

  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);

  // Weekly Goal: count consecutive completed weeks
  if (habit.frequency === 'Weekly Goal') {
    let streak = 0;
    const thisMonday = getWeekDatesForDate(todayStr)[0];
    const startMonday = getWeekDatesForDate(habit.startDate)[0];

    for (let i = 0; i < 52; i++) {
      const d = parseLocalDate(thisMonday);
      d.setDate(d.getDate() - i * 7);
      const monday = formatLocalDate(d);
      if (monday < startMonday) break;

      if (history.includes(monday)) {
        streak++;
      } else {
        if (monday === thisMonday) continue;
        break;
      }
    }
    return streak;
  }

  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = parseLocalDate(todayStr);
    d.setDate(d.getDate() - i);

    if (!isHabitScheduledForDate(habit, d, resetHour, resetMinute)) continue;

    const ds = formatLocalDate(d);

    if (ds < habit.startDate) break;

    if (habit.skippedDates?.includes(ds)) continue;

    if (history.includes(ds)) {
      streak++;
    } else {
      if (ds === todayStr) continue;
      break;
    }
  }

  return streak;
}

export const addStatusToHabits = (
  habits: Habit[],
  viewingDate: Date,
  resetHour: number,
  resetMinute: number
): (Habit & { status: HabitStatus })[] => {
  const dateStr = getHabitDate(viewingDate, resetHour, resetMinute);
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);
  const isViewingToday = dateStr === todayStr;

  return habits.map(h => ({
    ...h,
    streak: computeHabitStreak(h, resetHour, resetMinute),
    status: getHabitStatus(h, dateStr, isViewingToday, todayStr, viewingDate, resetHour, resetMinute),
  }));
};

/* ============================================================================
   PROGRESS
============================================================================ */

export const getProgressUnitsForDay = (
  habits: (Habit & { status: HabitStatus })[],
  dateStr: string,
  viewingDate?: Date,
  resetHour?: number,
  resetMinute?: number,
): { progressTotal: number; progressEarned: number; progressSkipped: number } => {
  let progressTotal = 0;
  let progressEarned = 0;
  let progressSkipped = 0;

  for (const h of habits) {
    if (h.frequency === 'Weekly Goal') continue;

    if (h.status === 'skipped' || h.status === 'snoozed') {
      progressSkipped += 1;
      continue;
    }

    progressTotal += 1;

    if (h.increment) {
      const effectiveDate =
        (h.keepUntil || h.frequency === 'Weekly Goal') && viewingDate && resetHour !== undefined && resetMinute !== undefined
          ? getHabitCycleStart(h, viewingDate, resetHour, resetMinute)
          : h.snoozedFrom
            ? h.snoozedFrom
            : dateStr;

      const currentAmount = isTimeTrackingHabit(h)
        ? getWeeklyTimeTotal(h.incrementHistory, dateStr)
        : (h.incrementHistory?.[effectiveDate] ?? 0);
      const goal = h.keepUntil
        ? (h.incrementGoal && h.incrementGoal > 0 ? h.incrementGoal : 1)
        : (h.incrementGoal ?? 0);

      if (goal > 0) {
        progressEarned += Math.min(currentAmount / goal, 1);
      } else if (h.status === 'completed') {
        progressEarned += 1;
      }
      continue;
    }

    if (h.status === 'completed') {
      progressEarned += 1;
    }
  }

  return { progressTotal, progressEarned, progressSkipped };
};