// @/hooks/useHabits.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { daysBetween, getHabitDate } from '@/utils/dateUtils';
import { STORAGE_KEYS } from '@/storage/keys';
import { getResetTime } from '@/lib/supabase/queries';
import {
  addStatusToHabits,
  HabitStatus,
  isHabitActiveToday,
} from '@/utils/habitUtils';
import {
  deleteHabit as deleteHabitService,
  getTotalPoints,
  loadHabitsFromSupabase,
  skipHabit as skipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
  updateAppStreak,
  updateHabitIncrement,
} from '@/utils/habitsActions';

// ─── constants ────────────────────────────────────────────────────────────────

const CACHE_WINDOW_DAYS = 3;
const DEBUG = true;

// ─── types ────────────────────────────────────────────────────────────────────

interface HabitsCache {
  habits: Habit[];
  cachedAt: string;
  cachedForDates: string[];
}

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

  // derived — same value as getHabitDate(viewingDate, ...) but stable to pass to children
  const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

  // raw habits from DB/cache — date-independent, used to reprocess on date change without fetching
  const rawHabitsRef = useRef<Habit[]>([]);

  // ─── cache helpers ──────────────────────────────────────────────────────────

  const isInCacheWindow = useCallback((date: Date) => {
    return Math.abs(daysBetween(date, new Date())) <= CACHE_WINDOW_DAYS;
  }, []);

  const getCacheWindowDates = useCallback((reset: { hour: number; minute: number }): string[] => {
    return Array.from({ length: CACHE_WINDOW_DAYS * 2 + 1 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i - CACHE_WINDOW_DAYS);
      return getHabitDate(d, reset.hour, reset.minute);
    });
  }, []);

  const loadFromCache = useCallback(async (): Promise<Habit[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.HABITS_CACHE);
      if (!cached) return null;

      const cacheData: HabitsCache = JSON.parse(cached);

      if (DEBUG)  {
        console.log('📦 Cache data found:', cacheData.habits?.length ?? 0, 'habits, cached at', cacheData.cachedAt);
      }

      if (DEBUG) {
        const ageMs = Date.now() - new Date(cacheData.cachedAt).getTime();
        if (ageMs > 60 * 60 * 1000) console.log('⏰ Cache is stale, will refresh from Supabase');
        console.log('📦 Cache loaded:', cacheData.habits?.length ?? 0, 'habits, cached at', cacheData.cachedAt);
      }

      return cacheData.habits;
    } catch (err) {
      console.error('❌ Error loading from cache:', err);
      return null;
    }
  }, []);

  const saveToCache = useCallback(
    async (habitsData: Habit[], reset: { hour: number; minute: number }) => {
      try {
        const cacheData: HabitsCache = {
          habits: habitsData,
          cachedAt: new Date().toISOString(),
          cachedForDates: getCacheWindowDates(reset),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.HABITS_CACHE, JSON.stringify(cacheData));
        if (DEBUG) console.log('✅ Habits cached successfully');
      } catch (err) {
        console.error('❌ Error saving to cache:', err);
      }
    },
    [getCacheWindowDates]
  );

  // ─── core update helper ─────────────────────────────────────────────────────
  // Call this after every action that changes habit data.
  // reset must be passed explicitly — keeping it out of deps prevents the
  // setResetTime → applyHabitsUpdate recreates → loadHabits recreates → infinite loop.

  const applyHabitsUpdate = useCallback(
    (updatedHabits: Habit[], reset: { hour: number; minute: number }) => {
      rawHabitsRef.current = updatedHabits; // keep ref in sync for instant date-change reprocessing
      const ds = getHabitDate(viewingDate, reset.hour, reset.minute);
      
      // First, filter to only habits that should be active on this date
      const activeHabits = updatedHabits.filter(h => 
        isHabitActiveToday(h, viewingDate, reset.hour, reset.minute)
      );
      
      // Then add status to those active habits
      const withStatus = addStatusToHabits(activeHabits, viewingDate, reset.hour, reset.minute);

      console.log('Applying habits update for date:', ds);
      console.log('Total habits in DB:', updatedHabits.length);
      console.log('Habits active for this date:', activeHabits.length);

      setHabits(withStatus);

      // Calculate progress from habits with status
      const completedCount = withStatus.filter(h => h.status === 'completed').length;
      const skippedCount = withStatus.filter(h => h.status === 'skipped').length;
      const totalCount = withStatus.length;

      setProgressTotal(totalCount);
      setProgressEarned(completedCount);
      setProgressSkipped(skippedCount);

      // Calculate earned points from ALL habits (not just active ones)
      // because points are awarded on completion date regardless of viewing date
      const earned = updatedHabits.reduce((sum, h) => {
        if (h.completionHistory?.includes(ds)) return sum + (h.rewardPoints || 0);
        return sum;
      }, 0);
      setEarnedPoints(earned);

      if (DEBUG) {
        console.log('🔄 Habits updated:', withStatus.length, 'habits for this date');
        console.log('📊 Progress calculation:');
        console.log(`   - Total habits for today: ${totalCount}`);
        console.log(`   - Completed: ${completedCount}`);
        console.log(`   - Skipped: ${skippedCount}`);
        console.log(`   - Active/Missed: ${totalCount - completedCount - skippedCount}`);
        console.log('   Points earned:', earned);
        console.log('   Progress:', completedCount, '/', totalCount);
      }

      return withStatus;
    },
    [viewingDate] // resetTime intentionally excluded — passed explicitly to avoid infinite loop
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
      if (DEBUG) {
        console.log('\n🔍 ========== LOADING HABITS ==========');
        console.log('   User:', user.id);
      }

      const reset = await getResetTime();
      setResetTime(reset);

      if (isInCacheWindow(viewingDate)) {
        // show cache immediately so the UI isn't blank
        const cached = await loadFromCache();
        if (cached && cached.length > 0) {
          if (DEBUG) console.log('📦 Showing cached data while fetching fresh...');
          applyHabitsUpdate(cached, reset);
          setLoading(false);
        }

        // always fetch fresh in background
        if (DEBUG) console.log('🔄 Fetching fresh data from Supabase...');
        const fresh = await loadHabitsFromSupabase(user.id);
        if (DEBUG) console.log('✅ Fresh data loaded:', fresh.length, 'habits');

        await saveToCache(fresh, reset);
        applyHabitsUpdate(fresh, reset);
      } else {
        if (DEBUG) console.log('⏳ Outside cache window, loading from Supabase...');
        setLoading(true);

        const fresh = await loadHabitsFromSupabase(user.id);
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

      if (DEBUG) console.log('========== LOADING COMPLETE ==========\n');
    } catch (err) {
      console.error('❌ Error loading habits:', err);
      setError('Failed to load habits');
      setLoading(false);
    }
  // viewingDate intentionally excluded — date changes are handled by the separate effect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInCacheWindow, loadFromCache, saveToCache, applyHabitsUpdate]);

  // ─── actions ────────────────────────────────────────────────────────────────

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = stripStatus(habits);
      const target = currentHabits.find(h => h.id === habitId);
      if (!target) return;

      const isCurrentlyCompleted = target.completionHistory?.includes(ds) ?? false;

      if (DEBUG) {
        console.log('🔄 Toggling habit:', target.name, '| date:', ds, '| was completed:', isCurrentlyCompleted);
      }

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
        console.error('❌ Error toggling habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, applyHabitsUpdate, loadHabits]
  );

  const updateIncrement = useCallback(
    async (habitId: string, newAmount: number) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
      const currentHabits = stripStatus(habits);

      if (DEBUG) console.log('🔄 Updating increment:', habitId, '| amount:', newAmount, '| date:', ds);

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
        if (DEBUG) console.log('✅ Increment updated');
      } catch (err) {
        console.error('❌ Error updating increment:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, applyHabitsUpdate, loadHabits]
  );

  const addHabit = useCallback(
    async (newHabit: Habit) => {
      const withStatus: HabitWithStatus = { ...newHabit, status: 'active' };
      setHabits(prev => [withStatus, ...prev]);

      const currentHabits = stripStatus(habits);
      await saveToCache([...currentHabits, newHabit], resetTime);
    },
    [habits, resetTime, saveToCache]
  );

  const snoozeHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const updatedHabits = await snoozeHabitService(habitId, stripStatus(habits), viewingDate, user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('❌ Error snoozing habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, applyHabitsUpdate, loadHabits]
  );

  const skipHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const updatedHabits = await skipHabitService(habitId, stripStatus(habits), user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
      } catch (err) {
        console.error('❌ Error skipping habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, applyHabitsUpdate, loadHabits]
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const updatedHabits = await deleteHabitService(habitId, stripStatus(habits), user.id);
        await saveToCache(updatedHabits, resetTime);
        applyHabitsUpdate(updatedHabits, resetTime);
        if (DEBUG) console.log('🗑️ Habit deleted, remaining:', updatedHabits.length);
      } catch (err) {
        console.error('❌ Error deleting habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, applyHabitsUpdate, loadHabits]
  );

  // ─── effects ────────────────────────────────────────────────────────────────

  // initial load + re-load when user changes — does NOT re-run on date navigation
  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  // date navigation — instant reprocess from ref, no fetch, no flicker
  useEffect(() => {
    if (rawHabitsRef.current.length > 0) {
      if (DEBUG) console.log('📅 Date changed, reprocessing from ref for:', viewingDate.toISOString());
      applyHabitsUpdate(rawHabitsRef.current, resetTime);
    }
  }, [viewingDate]); // eslint-disable-line react-hooks/exhaustive-deps
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