// @/hooks/useHabits.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { unstable_batchedUpdates } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { formatLocalDate, getHabitDate } from '@/utils/dateUtils';
import { getResetTime } from '@/lib/supabase/queries';
import {
  addStatusToHabits,
  getProgressUnitsForDay,
  HabitStatus,
  isHabitActiveToday,
  updateAppStreak,
} from '@/utils/habitUtils';
import {
  deleteHabit as deleteHabitService,
  loadHabitsFromSupabase,
  skipHabit as skipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
  updateHabitIncrement,
} from '@/lib/supabase/queries/habit';
import {
  isInCacheWindow,
  loadFromCache,
  saveToCache,
  getTotalPoints,
} from '@/services/habits/cache';

// ─── types ────────────────────────────────────────────────────────────────────

export type HabitWithStatus = Habit & { status: HabitStatus };

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useHabits(viewingDate: Date = new Date()) {
  const { user } = useAuth();

  const [habits, setHabits] = useState<HabitWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetTime, setResetTime] = useState({ hour: 4, minute: 0 });
  const [appStreak, setAppStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressEarned, setProgressEarned] = useState(0);
  const [progressSkipped, setProgressSkipped] = useState(0);

  const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

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
        getProgressUnitsForDay(withStatus, ds);

      // earned points for the day (for display in header)
      const earned = updatedHabits.reduce((sum, h) => {
        if (h.completionHistory?.includes(ds)) return sum + (h.rewardPoints || 0);
        return sum;
      }, 0);

      // **TODO: find a way to make everything load at the same time
      unstable_batchedUpdates(() => {
        setHabits(withStatus);
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
      setLoading(false);
      return;
    }

    try {
      const reset = await getResetTime();
      setResetTime(reset);

      // load cache for immediate display and for merge with fresh data
      const cached = await loadFromCache();

      if (isInCacheWindow(viewingDate)) {
        // show cache immediately so the UI isn't blank
        if (cached && cached.length > 0) {
          applyHabitsUpdate(cached, reset);
          setLoading(false);
        }

        // always fetch fresh in background, passing cache for completion history merge
        const fresh = await loadHabitsFromSupabase(user.id, cached ?? []);
        await saveToCache(fresh, reset);
        applyHabitsUpdate(fresh, reset);
      } else {
        setLoading(true);
        const fresh = await loadHabitsFromSupabase(user.id, cached ?? []);
        applyHabitsUpdate(fresh, reset);
      }

      const [streak, total] = await Promise.all([
        updateAppStreak(rawHabitsRef.current, reset.hour, reset.minute),
        getTotalPoints(),
      ]);
      setAppStreak(streak);
      setTotalPoints(total);

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading habits:', err);
      setError('Failed to load habits');
      setLoading(false);
    }
  }, [user, applyHabitsUpdate]);

  // ─── actions ────────────────────────────────────────────────────────────────

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = stripStatus(habits);
      const target = currentHabits.find(h => h.id === habitId);
      if (!target) return;

      const isCurrentlyCompleted = target.completionHistory?.includes(ds) ?? false;

      // optimistic: flip status immediately
      setHabits(prev => prev.map(h =>
        h.id === habitId
          ? { ...h, status: isCurrentlyCompleted ? 'active' : 'completed' as HabitStatus }
          : h
      ));
      setEarnedPoints(prev => prev + (isCurrentlyCompleted ? -(target.rewardPoints || 0) : (target.rewardPoints || 0)));

      try {
        const updatedHabits = await toggleHabitCompletion(habitId, currentHabits, ds, resetTime.hour, resetTime.minute, user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);

        const [streak, total] = await Promise.all([
          updateAppStreak(updatedHabits, resetTime.hour, resetTime.minute),
          getTotalPoints(),
        ]);
        setAppStreak(streak);
        setTotalPoints(total);
      } catch (err) {
        console.error('Error toggling habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const updateIncrement = useCallback(
    async (habitId: string, newAmount: number) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = stripStatus(habits);

      // optimistic
      setHabits(prev => prev.map(h =>
        h.id !== habitId ? h : {
          ...h,
          incrementAmount: newAmount,
          incrementHistory: { ...(h.incrementHistory || {}), [ds]: newAmount },
        }
      ));

      try {
        const updatedHabits = await updateHabitIncrement(habitId, currentHabits, ds, newAmount, user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error updating increment:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const addHabit = useCallback(
    async (newHabit: Habit) => {
      const withStatus: HabitWithStatus = { ...newHabit, status: 'active' };
      setHabits(prev => [withStatus, ...prev]);

      const currentHabits = stripStatus(habits);
      await saveToCache([...currentHabits, newHabit], resetTime);
    },
    [habits, resetTime]
  );

  /**
   * Snooze a habit. Defaults to tomorrow if no snoozeDateStr provided.
   * Pass null as snoozeDateStr to undo a snooze.
   */
  const snoozeHabit = useCallback(
    async (habitId: string, snoozeDateStr?: string | null) => {
      if (!user) return;

      // default to tomorrow (timezone-safe YYYY-MM-DD)
      let targetDate = snoozeDateStr;
      if (targetDate === undefined) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = formatLocalDate(tomorrow);
      }

      console.log(`(**TESTING) useHabits.snoozeHabit: habitId=${habitId}, targetDate=${targetDate}`);

      try {
        const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
        const updatedHabits = await snoozeHabitService(
          habitId,
          stripStatus(habits),
          targetDate,
          user.id,
          ds
        );
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error snoozing habit:', err);
        loadHabits();
      }
    },
    [habits, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  /**
   * Skip a habit for the current viewing date.
   * - Repeating habits: adds date to skippedDates array
   * - One-time habits: archives the habit
   */
  const skipHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      console.log(`(**TESTING) useHabits.skipHabit: habitId=${habitId}, dateStr=${ds}`);

      try {
        const updatedHabits = await skipHabitService(habitId, stripStatus(habits), ds, user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error skipping habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const updatedHabits = await deleteHabitService(habitId, stripStatus(habits), user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('Error deleting habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, applyHabitsUpdate, loadHabits]
  );

  // ─── effects ────────────────────────────────────────────────────────────────

  // initial load + re-load when user changes — does NOT re-run on date navigation
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // date navigation — instant reprocess from ref, no fetch, no flicker
  useEffect(() => {
    if (rawHabitsRef.current.length > 0) {
      applyHabitsUpdate(rawHabitsRef.current, resetTime);
    }
  }, [viewingDate, resetTime]); // include resetTime // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ intentionally only viewingDate — applyHabitsUpdate and resetTime are stable
  //   enough within a date-nav gesture that we don't need them here

  // ─── return ─────────────────────────────────────────────────────────────────

  return {
    habits,
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
    skipHabit,
    deleteHabit,
  };
}
