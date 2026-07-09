// @/hooks/useHabits.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { formatLocalDate, getHabitDate, getWeekDatesForDate } from '@/utils/dateUtils';
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
  deleteHabit as deleteHabitService,
  loadHabitsFromSupabase,
  skipHabit as skipHabitService,
  unskipHabit as unskipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
  updateHabitIncrement,
} from '@/lib/supabase/queries/habit';
import {
  loadQuestGoalsAsHabits,
  toggleQuestGoalWorkedOn,
  snoozeQuestGoal,
  skipQuestGoal,
} from '@/lib/supabase/queries/questGoalHabits';
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

      // Fetch everything in parallel — habits, quest goals
      const [fresh, questGoals] = await Promise.all([
        loadHabitsFromSupabase(user.id),
        loadQuestGoalsAsHabits(user.id),
      ]);
      const merged = [...fresh, ...questGoals];

      // Fetch streak + points before updating UI so everything lands in one render
      const [streak, total] = await Promise.all([
        updateAppStreak(fresh, reset.hour, reset.minute),
        getTotalPoints(),
      ]);

      // All state updates in one batch — no intermediate renders
      unstable_batchedUpdates(() => {
        applyHabitsUpdate(merged, reset);
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

      // keepUntil: use cycle start; snoozed: use snoozedFrom (only while active)
      // Weekly Goal: week-scoped — remove an existing record wherever it sits
      // in the viewed week, otherwise record on the week's monday
      const isSnoozedNow = target.snoozedFrom && target.snoozedUntil && rawDs < target.snoozedUntil.slice(0, 10);
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

      // optimistic: flip status immediately
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, status: isCurrentlyCompleted ? 'active' : 'completed' as HabitStatus }
          : h
      ));
      // weekly goals don't count toward the daily points badge
      if (target.frequency !== 'Weekly Goal') {
        setEarnedPoints(prev => prev + (isCurrentlyCompleted ? -(target.rewardPoints || 0) : (target.rewardPoints || 0)));
      }

      try {
        // Quest goals: "worked on it today" visual toggle (not actual completion)
        if (target.isQuestGoal && target.questGoalId) {
          await toggleQuestGoalWorkedOn(target.questGoalId, ds, isCurrentlyCompleted);
          const updatedHabits = currentHabits.map(h => {
            if (h.id !== habitId) return h;
            const history = h.completionHistory || [];
            return {
              ...h,
              completionHistory: isCurrentlyCompleted
                ? history.filter(d => d !== ds)
                : [...history, ds],
            };
          });
          applyHabitsUpdate(updatedHabits, resetTime);
          return;
        }

        const updatedHabits = await toggleHabitCompletion(habitId, currentHabits, ds, resetTime.hour, resetTime.minute, user.id);
        applyHabitsUpdate(updatedHabits, resetTime);

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

      // optimistic
      setHabits(prev => prev.map(h =>
        h.id !== habitId ? h : {
          ...h,
          incrementAmount: newAmount,
          incrementHistory: { ...(h.incrementHistory || {}), [ds]: newAmount },
        }
      ));

      try {
        // Quest goals don't support increment from habits page
        if (target?.isQuestGoal) return;

        const updatedHabits = await updateHabitIncrement(habitId, currentHabits, ds, newAmount, user.id, resetTime.hour, resetTime.minute);
        applyHabitsUpdate(updatedHabits, resetTime);
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
          const tomorrow = new Date();
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

        // Quest goals: update quest_goals table
        if (target?.isQuestGoal && target.questGoalId) {
          await snoozeQuestGoal(target.questGoalId, targetDate, ds);
          const updatedHabits = currentHabits.map(h =>
            h.id === habitId
              ? { ...h, snoozedUntil: targetDate ?? undefined, snoozedFrom: ds }
              : h
          );
          applyHabitsUpdate(updatedHabits, resetTime);
          return;
        }

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

        // Quest goals: update quest_goals table
        if (target?.isQuestGoal && target.questGoalId) {
          await skipQuestGoal(target.questGoalId, ds);
          const updatedHabits = currentHabits.map(h =>
            h.id === habitId
              ? { ...h, skippedDates: [...(h.skippedDates || []), ds] }
              : h
          );
          applyHabitsUpdate(updatedHabits, resetTime);
          return;
        }

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

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const updatedHabits = await deleteHabitService(habitId, rawHabitsRef.current, user.id);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error deleting habit:', err);
        loadHabits();
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
    reorderHabits: (updater: (prev: HabitWithStatus[]) => HabitWithStatus[]) => setHabits(updater),
  };
}
