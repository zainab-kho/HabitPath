// @/hooks/useHabits.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { formatLocalDate, getHabitDate, getWeekDatesForDate, parseLocalDate } from '@/utils/dateUtils';
import { getResetTime } from '@/lib/supabase/queries';
import {
  addStatusToHabits,
  getHabitCycleStart,
  getProgressUnitsForDay,
  HabitStatus,
  isHabitActiveToday,
  updateAppStreak,
} from '@/utils/habitUtils';
import {
  applyIncrementUpdate,
  applyToggleCompletion,
  archiveHabit as archiveHabitService,
  deleteHabit as deleteHabitService,
  loadHabitsFromSupabase,
  persistHabitCompletion,
  persistHabitIncrement,
  skipHabit as skipHabitService,
  unskipHabit as unskipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
} from '@/lib/supabase/queries/habit';
import { getTotalPoints } from '@/services/habits/cache';

// ─── types ────────────────────────────────────────────────────────────────────

export type HabitWithStatus = Habit & { status: HabitStatus };

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useHabits(viewingDate: Date = new Date()) {
  const { user } = useAuth();

  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetTime, setResetTime] = useState({ hour: 4, minute: 0 });
  const [appStreak, setAppStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressEarned, setProgressEarned] = useState(0);
  const [progressSkipped, setProgressSkipped] = useState(0);

  // Track which date the current habits state was computed for
  const [habitsForDate, setHabitsForDate] = useState<string | null>(null);

  const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

  // Derived loading: true during initial fetch OR when habits are for a different date
  const loading = initialLoading || habitsForDate !== dateStr;

  // raw habits from DB/cache — date-independent, used to reprocess on date change without fetching
  const rawHabitsRef = useRef<Habit[]>([]);

  // ─── core update helper ─────────────────────────────────────────────────────
  // call this after every action that changes habit data.
  // reset must be passed explicitly
  const applyHabitsUpdate = useCallback(
    (updatedHabits: Habit[], reset: { hour: number; minute: number }) => {
      rawHabitsRef.current = updatedHabits;
      const ds = getHabitDate(viewingDate, reset.hour, reset.minute);

      const activeHabits = updatedHabits.filter(h =>
        isHabitActiveToday(h, viewingDate, reset.hour, reset.minute)
      );

      const sortedActive = [...activeHabits].sort((a, b) => {
        if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);

        const ac = (a as any).created_at ?? '';
        const bc = (b as any).created_at ?? '';
        if (ac && bc && ac !== bc) return ac.localeCompare(bc);

        return (a.name || '').localeCompare(b.name || '');
      });

      const withStatus = addStatusToHabits(sortedActive, viewingDate, reset.hour, reset.minute);

      // compute progress units for progress bar
      const { progressTotal, progressEarned, progressSkipped } =
        getProgressUnitsForDay(withStatus, ds, viewingDate, reset.hour, reset.minute);

      // earned points for the day (only fully completed daily habits, not weekly goals)
      const earned = withStatus.reduce((sum, h) => {
        if (h.frequency === 'Weekly Goal') return sum;
        if (h.status === 'completed') return sum + (h.rewardPoints || 0);
        return sum;
      }, 0);

      unstable_batchedUpdates(() => {
        setAllHabits(updatedHabits);
        setHabits(withStatus);
        setHabitsForDate(ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);
        setProgressSkipped(progressSkipped);
        setEarnedPoints(earned);
      });

      return withStatus;
    },
    [viewingDate]
  );

  // strips the derived `status` field before passing habits to service functions
  const stripStatus = (habits: HabitWithStatus[]): Habit[] =>
    habits.map(({ status, ...rest }) => rest);

  // ─── load ───────────────────────────────────────────────────────────────────

  const loadHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setInitialLoading(false);
      return;
    }

    try {
      const reset = await getResetTime();
      setResetTime(reset);

      // quest habits are now real habits, so they come through here too
      const fresh = await loadHabitsFromSupabase(user.id);

      // Fetch streak + points before updating UI so everything lands in one render
      const [streak, total] = await Promise.all([
        updateAppStreak(fresh, reset.hour, reset.minute),
        getTotalPoints(),
      ]);

      // All state updates in one batch — no intermediate renders
      unstable_batchedUpdates(() => {
        applyHabitsUpdate(fresh, reset);
        setAppStreak(streak);
        setTotalPoints(total);
        setInitialLoading(false);
        setError(null);
      });
    } catch (err) {
      console.error('Error loading habits:', err);
      setError('Failed to load habits');
      setInitialLoading(false);
    }
  }, [user, applyHabitsUpdate]);

  // ─── actions ────────────────────────────────────────────────────────────────

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const rawDs = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);
      if (!target) return;

      // keepUntil: use cycle start; snoozed: use snoozedFrom (only while active —
      // increment habits include the arrival day, matching getHabitStatus/HabitItem)
      // Weekly Goal: week-scoped — remove an existing record wherever it sits
      // in the viewed week, otherwise record on the week's monday
      const snoozeDay = target.snoozedUntil?.slice(0, 10);
      const isSnoozedNow = target.snoozedFrom && snoozeDay &&
        (target.increment ? rawDs <= snoozeDay : rawDs < snoozeDay);
      let ds: string;
      if (target.frequency === 'Weekly Goal') {
        const weekDays = getWeekDatesForDate(rawDs);
        ds = weekDays.find(d => target.completionHistory?.includes(d)) ?? weekDays[0];
      } else if (target.keepUntil) {
        ds = getHabitCycleStart(target, viewingDate, resetTime.hour, resetTime.minute);
      } else {
        ds = isSnoozedNow ? target.snoozedFrom! : rawDs;
      }

      const isCurrentlyCompleted = target.completionHistory?.includes(ds) ?? false;

      try {
        // apply synchronously BEFORE the await — rawHabitsRef is fresh for the
        // next tap, so rapid check-offs can't overwrite each other
        const updatedHabits = applyToggleCompletion(habitId, currentHabits, ds, resetTime.hour, resetTime.minute);
        applyHabitsUpdate(updatedHabits, resetTime);

        const updatedTarget = updatedHabits.find(h => h.id === habitId);
        if (updatedTarget) await persistHabitCompletion(updatedTarget, user.id);

        const [streak, total] = await Promise.all([
          updateAppStreak(updatedHabits.filter(h => !h.isQuestGoal), resetTime.hour, resetTime.minute),
          getTotalPoints(),
        ]);
        setAppStreak(streak);
        setTotalPoints(total);
      } catch (err) {
        console.error('Error toggling habit:', err);
        loadHabits();
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const updateIncrement = useCallback(
    async (habitId: string, newAmount: number) => {
      if (!user) return;

      const rawDs = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);
      // increments include the snooze arrival day (<=) so new progress merges
      // with what was logged before snoozing
      const isSnoozedNow = target?.snoozedFrom && target?.snoozedUntil && rawDs <= target.snoozedUntil.slice(0, 10);
      const ds = (target?.frequency === 'Weekly Goal' || target?.keepUntil)
        ? getHabitCycleStart(target, viewingDate, resetTime.hour, resetTime.minute)
        : isSnoozedNow
          ? target.snoozedFrom!
          : rawDs;

      try {
        // Quest goals don't support increment from habits page
        if (target?.isQuestGoal) return;

        // apply synchronously BEFORE the await so rapid increments never read stale state
        const updatedHabits = applyIncrementUpdate(habitId, currentHabits, ds, newAmount, resetTime.hour, resetTime.minute);
        applyHabitsUpdate(updatedHabits, resetTime);

        const updatedTarget = updatedHabits.find(h => h.id === habitId);
        if (updatedTarget) await persistHabitIncrement(updatedTarget, newAmount, user.id);
      } catch (err) {
        console.error('Error updating increment:', err);
        loadHabits();
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const addHabit = useCallback(
    async (newHabit: Habit) => {
      // Use rawHabitsRef for the current truth — `habits` state can be stale in closures
      const updatedHabits = [...rawHabitsRef.current, newHabit];
      applyHabitsUpdate(updatedHabits, resetTime);
    },
    [resetTime, applyHabitsUpdate]
  );

  /**
   * Snooze a habit. Defaults to tomorrow if no snoozeDateStr provided.
   * Pass null as snoozeDateStr to undo a snooze.
   */
  const snoozeHabit = useCallback(
    async (habitId: string, snoozeDateStr?: string | null) => {
      if (!user) return;

      // default: if viewing a past date, snooze to today; if viewing today, snooze to tomorrow
      let targetDate = snoozeDateStr;
      if (targetDate === undefined) {
        const todayStr = getHabitDate(new Date(), resetTime.hour, resetTime.minute);
        const viewingStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
        if (viewingStr < todayStr) {
          targetDate = todayStr;
        } else {
          // day after the current habit day (respects the reset time), not
          // calendar tomorrow
          const tomorrow = parseLocalDate(viewingStr);
          tomorrow.setDate(tomorrow.getDate() + 1);
          targetDate = formatLocalDate(tomorrow);
        }
      }

      try {
        const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

        // Prevent backwards snooze (target date must be after source date)
        if (targetDate && targetDate <= ds) return;

        const currentHabits = rawHabitsRef.current;
        const target = currentHabits.find(h => h.id === habitId);

        const updatedHabits = await snoozeHabitService(
          habitId,
          currentHabits,
          targetDate,
          user.id,
          ds
        );
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error snoozing habit:', err);
        loadHabits();
      }
    },
    [resetTime, user, applyHabitsUpdate, loadHabits]
  );

  /**
   * Bring a snoozed habit back so it's due today — retargets the snooze arrival
   * to today while keeping the original source date, instead of clearing the
   * snooze (which would send the habit back to its original schedule).
   */
  const unsnoozeToToday = useCallback(
    async (habitId: string) => {
      if (!user) return;
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);
      if (!target) return;

      try {
        const todayStr = getHabitDate(new Date(), resetTime.hour, resetTime.minute);
        const updatedHabits = await snoozeHabitService(
          habitId,
          currentHabits,
          todayStr,
          user.id,
          target.snoozedFrom?.slice(0, 10)
        );
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error unsnoozing habit:', err);
        loadHabits();
      }
    },
    [resetTime, user, applyHabitsUpdate, loadHabits]
  );

  /**
   * Skip a habit for the current viewing date.
   * - Repeating habits: adds date to skippedDates array
   * - One-time habits: archives the habit
   */
  const skipHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const rawDs = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);

      const ds = target?.keepUntil
        ? getHabitCycleStart(target, viewingDate, resetTime.hour, resetTime.minute)
        : rawDs;

      try {
        const updatedHabits = await skipHabitService(habitId, currentHabits, ds, user.id);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error skipping habit:', err);
        loadHabits();
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const unskipHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      const rawDs = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);
      const ds = target?.keepUntil
        ? getHabitCycleStart(target, viewingDate, resetTime.hour, resetTime.minute)
        : rawDs;
      try {
        const updatedHabits = await unskipHabitService(habitId, currentHabits, ds, user.id);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error unskipping habit:', err);
        loadHabits();
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const unskipAndCompleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      const rawDs = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = rawHabitsRef.current;
      const target = currentHabits.find(h => h.id === habitId);
      const ds = target?.keepUntil
        ? getHabitCycleStart(target, viewingDate, resetTime.hour, resetTime.minute)
        : rawDs;
      try {
        const unskipped = await unskipHabitService(habitId, currentHabits, ds, user.id);
        const completed = await toggleHabitCompletion(habitId, unskipped, ds, resetTime.hour, resetTime.minute, user.id);
        applyHabitsUpdate(completed, resetTime);
      } catch (err) {
        console.error('Error unskipping and completing habit:', err);
        loadHabits();
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  // ─── reorder (daily temp order + time-of-day section) ───────────────────────
  // The drag handler already persisted the new order to Supabase and hands us an
  // updater that stamps tempOrder/tempTimeOfDay onto each habit. We must mirror
  // those fields back onto rawHabitsRef + allHabits, otherwise the next
  // applyHabitsUpdate (from a toggle/add/etc.) rebuilds `habits` from the stale
  // raw source and the order snaps back until the next full refresh.
  const reorderHabits = useCallback(
    (updater: (prev: HabitWithStatus[]) => HabitWithStatus[]) => {
      setHabits(prev => {
        const next = updater(prev);

        const tempById = new Map(
          next.map(h => [h.id, {
            tempOrder: h.tempOrder,
            tempOrderDate: h.tempOrderDate,
            tempTimeOfDay: h.tempTimeOfDay,
            tempTimeOfDayDate: h.tempTimeOfDayDate,
          }])
        );
        const syncTemp = <T extends Habit>(h: T): T => {
          const t = tempById.get(h.id);
          return t ? { ...h, ...t } : h;
        };

        rawHabitsRef.current = rawHabitsRef.current.map(syncTemp);
        setAllHabits(prevAll => prevAll.map(syncTemp));

        return next;
      });
    },
    []
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      // apply synchronously BEFORE the await so the row disappears immediately
      const before = rawHabitsRef.current;
      applyHabitsUpdate(before.filter(h => h.id !== habitId), resetTime);
      try {
        await deleteHabitService(habitId, before, user.id);
      } catch (err) {
        console.error('Error deleting habit:', err);
        loadHabits(); // restore truth on failure
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const archiveHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      const archivedAt = new Date().toISOString();
      // apply synchronously BEFORE the await — archiving a repeating habit makes
      // isHabitActiveToday drop it, so the row leaves the list immediately
      const before = rawHabitsRef.current;
      applyHabitsUpdate(
        before.map(h => (h.id === habitId ? { ...h, archivedAt } : h)),
        resetTime
      );
      try {
        await archiveHabitService(habitId, before, user.id, archivedAt);
      } catch (err) {
        console.error('Error archiving habit:', err);
        loadHabits(); // restore truth on failure
      }
    },
    [viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  // ─── effects ────────────────────────────────────────────────────────────────

  // initial load + re-load when user changes — does NOT re-run on date navigation
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // date navigation — reprocess from ref. The derived `loading` (habitsForDate !== dateStr)
  // automatically shows the spinner until this effect runs and applyHabitsUpdate sets habitsForDate.
  useEffect(() => {
    if (rawHabitsRef.current.length > 0) {
      applyHabitsUpdate(rawHabitsRef.current, resetTime);
    }
  }, [viewingDate, resetTime]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── return ─────────────────────────────────────────────────────────────────

  return {
    habits,
    allHabits,
    loading,
    error,

    resetTime,
    dateStr,

    appStreak,
    totalPoints,
    earnedPoints,
    progressTotal,
    progressEarned,
    progressSkipped,

    loadHabits,
    addHabit,
    toggleHabit,
    updateIncrement,
    snoozeHabit,
    unsnoozeToToday,
    skipHabit,
    unskipHabit,
    unskipAndCompleteHabit,
    deleteHabit,
    archiveHabit,
    reorderHabits,
  };
}
