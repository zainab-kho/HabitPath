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
 * True when dateStr is the nth occurrence of a weekday in its month
 * (week 5 = last occurrence, whether that's the 4th or 5th).
 */
export function matchesNthWeekday(dateStr: string, week: number, weekday: string): boolean {
  const d = parseLocalDate(dateStr);
  if (WEEK_DAYS[d.getDay()] !== weekday) return false;
  if (week === 5) {
    const next = new Date(d);
    next.setDate(d.getDate() + 7);
    return next.getMonth() !== d.getMonth();
  }
  return Math.ceil(d.getDate() / 7) === week;
}

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

  // inbox habits (no start date) are never scheduled
  if (!habit.startDate) return false;

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
    if (habit.tempSelectedDays && habit.tempSelectedDaysWeek) {
      const dateMonday = getWeekDatesForDate(dateStr)[0];
      if (dateMonday === habit.tempSelectedDaysWeek) {
        return habit.tempSelectedDays.includes(dow);
      }
    }
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
    if (habit.monthlyWeek && habit.monthlyWeekday) {
      return matchesNthWeekday(dateStr, habit.monthlyWeek, habit.monthlyWeekday);
    }
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
    const latestRecorded = [...history].sort().at(-1) ?? null;
    const lastDone = habit.lastCompletedDate ?? null;
    let earliestIncomplete: string | null = null;
    let coveredByCompletedCycle = false;

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

      // scheduled days between the recorded completion (cycle start) and the day
      // it was actually finished belong to that completed cycle, not a new one
      if (!completed && lastDone && latestRecorded && dStr > latestRecorded && dStr <= lastDone) {
        coveredByCompletedCycle = true;
        break;
      }

      if (completed) {
        break;
      }
      earliestIncomplete = dStr;
    }

    if (earliestIncomplete) {
      return earliestIncomplete;
    }
    // current cycle is the completed carried-over one
    if (coveredByCompletedCycle && latestRecorded) {
      return latestRecorded;
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
    // nth-weekday mode: walk back to the most recent scheduled day
    if (habit.monthlyWeek && habit.monthlyWeekday) {
      for (let i = 0; i < 62; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() - i);
        const dStr = getHabitDate(d, resetHour, resetMinute);
        if (dStr < startStr) break;
        if (matchesNthWeekday(dStr, habit.monthlyWeek, habit.monthlyWeekday)) return dStr;
      }
      return startStr;
    }

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
  // inbox habits (no start date) are never active
  if (!habit.startDate) return false;

  const todayStr = getHabitDate(date, resetHour, resetMinute);
  const actualTodayStr = getHabitDate(new Date(), resetHour, resetMinute);
  const isViewingToday = todayStr === actualTodayStr;

  if (habit.archivedAt) {
    if (habit.keepUntil) {
    } else {
      const isOneTime = !habit.frequency || habit.frequency === 'None';
      if (!isOneTime) return false;

      if (todayStr === habit.startDate) return true;
      if (habit.skippedDates?.includes(todayStr)) return true;
      if (habit.completionHistory?.includes(todayStr)) return true;

      return false;
    }
  }

  if (todayStr < habit.startDate) return false;

  const snoozeDay = habit.snoozedUntil?.slice(0, 10);
  const snoozeFrom = habit.snoozedFrom?.slice(0, 10);

  if (snoozeDay && snoozeFrom) {
    if (todayStr >= snoozeFrom && todayStr < snoozeDay) return false;
    if (todayStr === snoozeDay) return true;
  }

  if (habit.skippedDates?.includes(todayStr)) return true;
  if (habit.completionHistory?.includes(todayStr)) return true;

  if (habit.archivedAt && (!habit.frequency || habit.frequency === 'None') && !habit.keepUntil) return false;

  if (!habit.frequency || habit.frequency === 'None') {
    if (habit.keepUntil) {
      const cycleStart = getHabitCycleStart(habit, date, resetHour, resetMinute);

      let isCompleted = habit.completionHistory?.includes(cycleStart) ?? false;

      if (habit.increment && !isCompleted) {
        const currentAmount = habit.incrementHistory?.[cycleStart] ?? 0;
        const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
        isCompleted = currentAmount >= goal;
      }

      if (isCompleted) {
        return todayStr === cycleStart;
      }

      return todayStr >= habit.startDate && todayStr <= actualTodayStr;
    } else {
      return todayStr === habit.startDate;
    }
  }

  // weekly goal + keepUntil: carries week to week until completed once,
  // then disappears after the week it was finished
  if (habit.frequency === 'Weekly Goal' && habit.keepUntil) {
    const thisMonday = getWeekDatesForDate(todayStr)[0];
    const startMonday = getWeekDatesForDate(habit.startDate)[0];
    if (thisMonday < startMonday) return false;

    // anchor on completionHistory (the recorded per-week completions) so this
    // visibility check agrees with getHabitStatus. lastCompletedDate tracks the
    // physical tap day (and the increment path writes it without touching
    // completionHistory), so it can drift into a later week than the recorded
    // completion and keep a finished goal visible. fall back to it only when
    // there's no recorded history (e.g. a pure-increment goal).
    const latestCompletion = [...(habit.completionHistory ?? [])].sort().at(-1)
      ?? habit.lastCompletedDate
      ?? null;
    if (latestCompletion) {
      return thisMonday <= getWeekDatesForDate(latestCompletion)[0];
    }
    return true;
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

  // End date: stop scheduling new occurrences after end date.
  // Weekly Goals are week-scoped — their own branch below ends them by WEEK
  // (endMonday), so a mid-week end date still shows for the rest of that week
  // instead of being cut off the day after.
  if (habit.endDate && habit.frequency !== 'Weekly Goal' && todayStr > habit.endDate) return false;

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
      if (habit.tempSelectedDays && habit.tempSelectedDaysWeek) {
        const dateMonday = getWeekDatesForDate(todayStr)[0];
        if (dateMonday === habit.tempSelectedDaysWeek) {
          return habit.tempSelectedDays.includes(dow);
        }
      }
      return habit.selectedDays?.includes(dow) ?? false;
    }

    return false;
  }

  // Weekly Goal — visible every day of the week
  if (habit.frequency === 'Weekly Goal') {
    const dateMonday = getWeekDatesForDate(todayStr)[0];
    const startMonday = getWeekDatesForDate(habit.startDate)[0];
    if (dateMonday < startMonday) return false;
    if (habit.endDate) {
      const endMonday = getWeekDatesForDate(habit.endDate)[0];
      if (dateMonday > endMonday) return false;
    }
    // no endDate = recurring weekly goal: shows every week from the start week on,
    // with per-week increments that reset each Monday (see getHabitStatus).
    // a one-week goal instead carries endDate = the Sunday of its start week.
    return true;
  }

  // Monthly habits
  if (habit.frequency === 'Monthly') {
    if (habit.startDate > todayStr) return false;

    if (habit.monthlyWeek && habit.monthlyWeekday) {
      return matchesNthWeekday(todayStr, habit.monthlyWeek, habit.monthlyWeekday);
    }
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
  // keepUntil: use cycle start; Weekly Goal: use Monday; snoozed: use snoozedFrom
  // (only while active — increment habits include the arrival day so progress follows)
  const snoozeDay = habit.snoozedUntil?.slice(0, 10);
  const isSnoozedNow = habit.snoozedFrom && snoozeDay &&
    (habit.increment ? dateStr <= snoozeDay : dateStr < snoozeDay);
  const effectiveDateStr =
    (habit.keepUntil && viewingDate && resetHour !== undefined && resetMinute !== undefined)
      ? getHabitCycleStart(habit, viewingDate, resetHour, resetMinute)
      : habit.frequency === 'Weekly Goal'
        ? getWeekDatesForDate(dateStr)[0]
        : isSnoozedNow
          ? habit.snoozedFrom!
          : dateStr;

  // snoozed check first so snoozed habits don't show as missed.
  // window is [snoozedFrom, snoozedUntil): the lower bound guard stops a FUTURE
  // snooze from marking the habit snoozed on days before the window starts.
  // use < (not <=) on the upper bound so the habit is active ON the snoozedUntil day.
  // .slice(0,10) normalizes legacy ISO strings ("2026-02-17T05:00:00Z" → "2026-02-17")
  if (
    habit.snoozedUntil &&
    dateStr < habit.snoozedUntil.slice(0, 10) &&
    (!habit.snoozedFrom || dateStr >= habit.snoozedFrom.slice(0, 10))
  ) {
    return 'snoozed';
  }

  // weekly goals are week-scoped: a completion anywhere in the viewed week
  // marks the whole week, no matter which day it was recorded on
  if (habit.frequency === 'Weekly Goal') {
    const weekDays = getWeekDatesForDate(dateStr);
    if (weekDays.some(d => habit.completionHistory?.includes(d))) return 'completed';
    if (habit.increment) {
      const amount = weekDays.reduce((s, d) => s + (habit.incrementHistory?.[d] ?? 0), 0);
      const goal = habit.incrementGoal && habit.incrementGoal > 0
        ? habit.incrementGoal
        : (habit.keepUntil ? 1 : 0);
      if (goal > 0 && amount >= goal) return 'completed';
    }
  }

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

function computeBestStreak(
  habit: Habit,
  resetHour: number,
  resetMinute: number
): number {
  const history = habit.completionHistory ?? [];
  if (history.length === 0) return 0;

  const oneTime = !habit.frequency || habit.frequency === 'None';
  if (oneTime) return 0;

  if (habit.frequency === 'Weekly Goal') {
    const sortedWeeks = [...history].sort();
    let best = 1;
    let current = 1;
    for (let i = 1; i < sortedWeeks.length; i++) {
      const prev = parseLocalDate(sortedWeeks[i - 1]);
      const curr = parseLocalDate(sortedWeeks[i]);
      const diff = Math.round((curr.getTime() - prev.getTime()) / (7 * 86400000));
      if (diff === 1) {
        current++;
        if (current > best) best = current;
      } else {
        current = 1;
      }
    }
    return best;
  }

  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);
  let best = 0;
  let current = 0;

  for (let i = 365; i >= 0; i--) {
    const d = parseLocalDate(todayStr);
    d.setDate(d.getDate() - i);
    const ds = formatLocalDate(d);

    if (ds < habit.startDate) continue;
    if (!isHabitScheduledForDate(habit, d, resetHour, resetMinute)) continue;
    if (habit.skippedDates?.includes(ds)) continue;

    if (history.includes(ds)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }

  return best;
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
    bestStreak: computeBestStreak(h, resetHour, resetMinute),
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

    // quest goals track "worked on it" separately — they don't gate the daily bar
    if (h.isQuestGoal) continue;

    if (h.status === 'skipped' || h.status === 'snoozed') {
      progressSkipped += 1;
      continue;
    }

    progressTotal += 1;

    if (h.increment) {
      // only fall back to the snooze source date while the habit is STILL snoozed.
      // a leftover snoozedFrom from an elapsed snooze must not pull a past (already
      // completed) amount into today's progress — that's how an untouched habit was
      // showing full credit. (matches the isSnoozedNow guard in toggleHabit /
      // handleUndoIncrement — increments use <= since they include the arrival day)
      const snoozeDay = h.snoozedUntil?.slice(0, 10);
      const isSnoozedNow = !!h.snoozedFrom && !!snoozeDay && dateStr <= snoozeDay;
      const effectiveDate =
        (h.keepUntil || h.frequency === 'Weekly Goal') && viewingDate && resetHour !== undefined && resetMinute !== undefined
          ? getHabitCycleStart(h, viewingDate, resetHour, resetMinute)
          : isSnoozedNow
            ? h.snoozedFrom!
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