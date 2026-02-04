// @/hooks/useHabits.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { daysBetween, getHabitDate } from '@/utils/dateUtils';

import { STORAGE_KEYS } from '@/storage/keys';
import {
  addCompletedToHabits,
  deleteHabit as deleteHabitService,
  getResetTime,
  getTotalPoints,
  loadHabitsFromSupabase,
  skipHabit as skipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
  updateAppStreak,
  updateHabitIncrement,
} from '@/utils/habitsActions';

const CACHE_KEY = '@habits_cache';
const CACHE_WINDOW_DAYS = 3;
const DEBUG = true;

interface HabitsCache {
  habits: Habit[];
  cachedAt: string;
  cachedForDates: string[];
}

type HabitWithCompleted = Habit & { completed: boolean };

function getProgressUnitsForDay(habits: HabitWithCompleted[], dateStr: string) {
  let progressTotal = 0;
  let progressEarned = 0;

  for (const h of habits) {
    const isIncrement = !!h.increment;

    // If you want to exclude skipped habits from progress, uncomment:
    // if (h.skipped) continue;

    progressTotal += 1;

    if (!isIncrement) {
      progressEarned += h.completed ? 1 : 0;
      continue;
    }

    const currentAmount = h.incrementHistory?.[dateStr] ?? 0;
    const goal = typeof h.incrementGoal === 'number' ? h.incrementGoal : 0;
    const hasGoal = goal > 0;

    if (hasGoal) {
      progressEarned += Math.min(currentAmount / goal, 1);
    } else {
      // no goal -> any progress counts as "done"
      progressEarned += currentAmount > 0 ? 1 : 0;
    }
  }

  return { progressTotal, progressEarned };
}

export function useHabits(viewingDate: Date = new Date()) {
  const { user } = useAuth();

  const [habits, setHabits] = useState<(Habit & { completed: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetTime, setResetTime] = useState({ hour: 4, minute: 0 });

  const [appStreak, setAppStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // ✅ new: progress that includes increment partials
  const [progressTotal, setProgressTotal] = useState(0);
  const [progressEarned, setProgressEarned] = useState(0);

  // ✅ expose dateStr so screens/components can use the same one
  const dateStr = useMemo(() => {
    return getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
  }, [viewingDate, resetTime.hour, resetTime.minute]);

  const isInCacheWindow = useCallback((date: Date) => {
    const today = new Date();
    const daysDiff = Math.abs(daysBetween(date, today));
    return daysDiff <= CACHE_WINDOW_DAYS;
  }, []);

  const getCacheWindowDates = useCallback((reset: { hour: number; minute: number }): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = -CACHE_WINDOW_DAYS; i <= CACHE_WINDOW_DAYS; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(getHabitDate(d, reset.hour, reset.minute));
    }
    return dates;
  }, []);

  const loadFromCache = useCallback(async (): Promise<Habit[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.HABITS_CACHE);
      if (!cached) return null;

      const cacheData: HabitsCache = JSON.parse(cached);

      if (DEBUG) {
        const cacheAge = Date.now() - new Date(cacheData.cachedAt).getTime();
        const oneHour = 60 * 60 * 1000;
        if (cacheAge > oneHour) console.log('⏰ Cache is stale, will refresh from Supabase');

        console.log('📦 Cache loaded:');
        console.log('   Cached at:', cacheData.cachedAt);
        console.log('   Number of habits:', cacheData.habits?.length || 0);
        console.log('   Valid for dates:', cacheData.cachedForDates);
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

  const processHabitsData = useCallback(
    (habitsData: Habit[], reset: { hour: number; minute: number }) => {
      const ds = getHabitDate(viewingDate, reset.hour, reset.minute);

      if (DEBUG) {
        console.log('🔄 Processing habits data:');
        console.log('   Viewing date:', viewingDate.toISOString());
        console.log('   Habit date string:', ds);
        console.log('   Reset time:', `${reset.hour}:${reset.minute}`);
        console.log('   Raw habits count:', habitsData.length);
      }

      const habitsWithCompleted = addCompletedToHabits(habitsData, viewingDate, reset.hour, reset.minute);
      setHabits(habitsWithCompleted);

      // ✅ NEW: progress bar (includes increment partials)
      const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
      setProgressTotal(progressTotal);
      setProgressEarned(progressEarned);

      // points earned (still based on completionHistory)
      const earned = habitsData.reduce((sum, h) => {
        if (h.completionHistory?.includes(ds)) return sum + (h.rewardPoints || 0);
        return sum;
      }, 0);

      setEarnedPoints(earned);

      if (DEBUG) {
        console.log('   Habits with completed property:', habitsWithCompleted.length);
        habitsWithCompleted.forEach(h => {
          console.log(`      - ${h.name}: completed=${h.completed}, start=${h.startDate}, freq=${h.frequency}`);
        });
        console.log('   Points earned on this date:', earned);
        console.log('   Progress:', progressEarned, '/', progressTotal);
      }

      return habitsData;
    },
    [viewingDate]
  );

  const loadHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      if (DEBUG) {
        console.log('\n🔍 ========== LOADING HABITS ==========');
        console.log('User ID:', user.id);
        console.log('Viewing date:', viewingDate.toISOString());
      }

      const reset = await getResetTime();
      setResetTime(reset);

      if (DEBUG) {
        console.log('Reset time:', `${reset.hour}:${reset.minute}`);
        console.log('Habit date for viewing date:', getHabitDate(viewingDate, reset.hour, reset.minute));
      }

      const inCacheWindow = isInCacheWindow(viewingDate);
      if (DEBUG) console.log('In cache window:', inCacheWindow);

      if (inCacheWindow) {
        const cached = await loadFromCache();

        if (cached && cached.length > 0) {
          if (DEBUG) console.log('📦 Loading from cache...');
          processHabitsData(cached, reset);
          setLoading(false);

          const streak = await updateAppStreak(cached, reset.hour, reset.minute);
          setAppStreak(streak);

          const total = await getTotalPoints();
          setTotalPoints(total);
        } else {
          if (DEBUG) console.log('📦 Cache empty, will load from Supabase');
        }

        if (DEBUG) console.log('🔄 Fetching fresh data in background...');
        const fresh = await loadHabitsFromSupabase(user.id);
        if (DEBUG) console.log('✅ Fresh data loaded:', fresh.length, 'habits');

        await saveToCache(fresh, reset);
        processHabitsData(fresh, reset);

        const freshStreak = await updateAppStreak(fresh, reset.hour, reset.minute);
        setAppStreak(freshStreak);

        const freshTotal = await getTotalPoints();
        setTotalPoints(freshTotal);

        setLoading(false);
      } else {
        if (DEBUG) console.log('⏳ Outside cache window, loading from Supabase...');
        setLoading(true);

        const fresh = await loadHabitsFromSupabase(user.id);
        processHabitsData(fresh, reset);

        const streak = await updateAppStreak(fresh, reset.hour, reset.minute);
        setAppStreak(streak);

        const total = await getTotalPoints();
        setTotalPoints(total);

        setLoading(false);
      }

      if (DEBUG) console.log('========== LOADING COMPLETE ==========\n');
      setError(null);
    } catch (err) {
      console.error('❌ Error loading habits:', err);
      setError('Failed to load habits');
      setLoading(false);
    }
  }, [user, viewingDate, isInCacheWindow, loadFromCache, saveToCache, processHabitsData]);

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

      try {
        const currentHabits = habits.map(({ completed, ...rest }) => rest);
        const targetHabit = currentHabits.find(h => h.id === habitId);

        if (targetHabit) {
          const isCurrentlyCompleted = targetHabit.completionHistory?.includes(ds) || false;

          if (DEBUG) {
            console.log('🔄 Toggling habit:', targetHabit.name);
            console.log('   Date:', ds);
            console.log('   Currently completed:', isCurrentlyCompleted);
          }

          // optimistic
          const optimisticHabits = habits.map(h => {
            if (h.id === habitId) return { ...h, completed: !isCurrentlyCompleted };
            return h;
          });
          setHabits(optimisticHabits);

          // points optimistic
          const pointChange = isCurrentlyCompleted
            ? -(targetHabit.rewardPoints || 0)
            : (targetHabit.rewardPoints || 0);
          setEarnedPoints(prev => prev + pointChange);
        }

        const updatedHabits = await toggleHabitCompletion(
          habitId,
          currentHabits,
          ds,
          resetTime.hour,
          resetTime.minute,
          user.id
        );

        await saveToCache(updatedHabits, resetTime);

        const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
        setHabits(habitsWithCompleted);

        // recompute points + progress
        const earned = updatedHabits.reduce((sum, h) => {
          if (h.completionHistory?.includes(ds)) return sum + (h.rewardPoints || 0);
          return sum;
        }, 0);
        setEarnedPoints(earned);

        const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);

        const streak = await updateAppStreak(updatedHabits, resetTime.hour, resetTime.minute);
        setAppStreak(streak);

        const total = await getTotalPoints();
        setTotalPoints(total);
      } catch (err) {
        console.error('❌ Error toggling habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, loadHabits]
  );

  const updateIncrement = useCallback(
    async (habitId: string, newAmount: number) => {
      if (!user) return;

      const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

      try {
        const currentHabits = habits.map(({ completed, ...rest }) => rest);

        if (DEBUG) {
          console.log('🔄 Updating increment:', habitId);
          console.log('   Date:', ds);
          console.log('   New amount:', newAmount);
        }

        // optimistic update: write into incrementHistory[ds]
        const optimisticHabits = habits.map(h => {
          if (h.id !== habitId) return h;

          const incrementHistory = h.incrementHistory || {};
          return {
            ...h,
            // optional convenience denormalization:
            incrementAmount: newAmount,
            incrementHistory: {
              ...incrementHistory,
              [ds]: newAmount,
            },
          };
        });

        setHabits(optimisticHabits);

        const updatedHabits = await updateHabitIncrement(habitId, currentHabits, ds, newAmount, user.id);

        await saveToCache(updatedHabits, resetTime);

        const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
        setHabits(habitsWithCompleted);

        // progress may change when increments change
        const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);

        if (DEBUG) console.log('✅ Increment updated successfully');
      } catch (err) {
        console.error('❌ Error updating increment:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, loadHabits]
  );

  const addHabit = useCallback(
    async (newHabit: Habit) => {
      const habitWithCompleted = { ...newHabit, completed: false };
      setHabits(prev => [habitWithCompleted, ...prev]);

      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = [...currentHabits, newHabit];

      await saveToCache(updatedHabits, resetTime);
    },
    [habits, resetTime, saveToCache]
  );

  const snoozeHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const currentHabits = habits.map(({ completed, ...rest }) => rest);
        const updatedHabits = await snoozeHabitService(habitId, currentHabits, viewingDate, user.id);

        await saveToCache(updatedHabits, resetTime);

        const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
        setHabits(habitsWithCompleted);

        const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
        const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);
      } catch (err) {
        console.error('❌ Error snoozing habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, loadHabits]
  );

  const skipHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const currentHabits = habits.map(({ completed, ...rest }) => rest);
        const updatedHabits = await skipHabitService(habitId, currentHabits, user.id);

        await saveToCache(updatedHabits, resetTime);

        const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
        setHabits(habitsWithCompleted);

        const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
        const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);
      } catch (err) {
        console.error('❌ Error skipping habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, loadHabits]
  );

  const deleteHabit = useCallback(
    async (habitId: string) => {
      if (!user) return;
      try {
        const currentHabits = habits.map(({ completed, ...rest }) => rest);
        const updatedHabits = await deleteHabitService(habitId, currentHabits, user.id);

        await saveToCache(updatedHabits, resetTime);

        const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
        setHabits(habitsWithCompleted);

        const ds = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
        const { progressTotal, progressEarned } = getProgressUnitsForDay(habitsWithCompleted, ds);
        setProgressTotal(progressTotal);
        setProgressEarned(progressEarned);

        if (DEBUG) console.log('🗑️ Habit deleted, remaining:', habitsWithCompleted.length);
      } catch (err) {
        console.error('❌ Error deleting habit:', err);
        loadHabits();
      }
    },
    [habits, viewingDate, resetTime, user, saveToCache, loadHabits]
  );

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  return {
    habits,
    loading,
    error,

    resetTime,
    dateStr, // ✅ new: use this everywhere so everything stays aligned

    // old points/streak
    appStreak,
    totalPoints,
    earnedPoints,

    // ✅ new: progress for bar (supports increment partials)
    progressTotal,
    progressEarned,

    loadHabits,
    addHabit,
    toggleHabit,
    updateIncrement,
    snoozeHabit,
    skipHabit,
    deleteHabit,
  };
}