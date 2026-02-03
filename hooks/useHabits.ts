// @/hooks/useHabits.ts
import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { daysBetween, getHabitDate } from '@/utils/dateUtils';
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
  updateHabitIncrement
} from '@/utils/habitsActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY = '@habits_cache';
const CACHE_WINDOW_DAYS = 3;
const DEBUG = true;

interface HabitsCache {
  habits: Habit[];
  cachedAt: string;
  cachedForDates: string[];
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

  const isInCacheWindow = useCallback((date: Date, reset: { hour: number; minute: number }): boolean => {
    const today = new Date();
    const daysDiff = Math.abs(daysBetween(date, today));
    return daysDiff <= CACHE_WINDOW_DAYS;
  }, []);

  const getCacheWindowDates = useCallback((reset: { hour: number; minute: number }): string[] => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = -CACHE_WINDOW_DAYS; i <= CACHE_WINDOW_DAYS; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push(getHabitDate(date, reset.hour, reset.minute));
    }
    return dates;
  }, []);

  const loadFromCache = useCallback(async (): Promise<Habit[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const cacheData: HabitsCache = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(cacheData.cachedAt).getTime();
      const oneHour = 60 * 60 * 1000;
      if (cacheAge > oneHour) {
        if (DEBUG) console.log('⏰ Cache is stale, will refresh from Supabase');
      }
      if (DEBUG) {
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

  const saveToCache = useCallback(async (habitsData: Habit[], reset: { hour: number; minute: number }) => {
    try {
      const cacheData: HabitsCache = {
        habits: habitsData,
        cachedAt: new Date().toISOString(),
        cachedForDates: getCacheWindowDates(reset),
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      if (DEBUG) console.log('✅ Habits cached successfully');
    } catch (err) {
      console.error('❌ Error saving to cache:', err);
    }
  }, [getCacheWindowDates]);

  const processHabitsData = useCallback((habitsData: Habit[], reset: { hour: number; minute: number }) => {
    const dateStr = getHabitDate(viewingDate, reset.hour, reset.minute);
    if (DEBUG) {
      console.log('🔄 Processing habits data:');
      console.log('   Viewing date:', viewingDate.toISOString());
      console.log('   Habit date string:', dateStr);
      console.log('   Reset time:', `${reset.hour}:${reset.minute}`);
      console.log('   Raw habits count:', habitsData.length);
    }
    const habitsWithCompleted = addCompletedToHabits(habitsData, viewingDate, reset.hour, reset.minute);
    if (DEBUG) {
      console.log('   Habits with completed property:', habitsWithCompleted.length);
      habitsWithCompleted.forEach(h => {
        console.log(`      - ${h.name}: completed=${h.completed}, start=${h.startDate}, freq=${h.frequency}`);
      });
    }
    setHabits(habitsWithCompleted);
    const earned = habitsData.reduce((sum, h) => {
      if (h.completionHistory?.includes(dateStr)) {
        return sum + (h.rewardPoints || 0);
      }
      return sum;
    }, 0);
    if (DEBUG) {
      console.log('   Points earned on this date:', earned);
    }
    setEarnedPoints(earned);
    return habitsData;
  }, [viewingDate]);

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
      const inCacheWindow = isInCacheWindow(viewingDate, reset);
      if (DEBUG) {
        console.log('In cache window:', inCacheWindow);
      }
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
        if (DEBUG) {
          console.log('✅ Fresh data loaded:', fresh.length, 'habits');
        }
        await saveToCache(fresh, reset);
        processHabitsData(fresh, reset);
        const freshStreak = await updateAppStreak(fresh, reset.hour, reset.minute);
        setAppStreak(freshStreak);
        const freshTotal = await getTotalPoints();
        setTotalPoints(freshTotal);
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

  const toggleHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const targetHabit = currentHabits.find(h => h.id === habitId);
      if (targetHabit) {
        const isCurrentlyCompleted = targetHabit.completionHistory?.includes(dateStr) || false;
        if (DEBUG) {
          console.log('🔄 Toggling habit:', targetHabit.name);
          console.log('   Date:', dateStr);
          console.log('   Currently completed:', isCurrentlyCompleted);
        }
        const optimisticHabits = habits.map(h => {
          if (h.id === habitId) {
            return { ...h, completed: !isCurrentlyCompleted };
          }
          return h;
        });
        setHabits(optimisticHabits);
        const pointChange = isCurrentlyCompleted ? -(targetHabit.rewardPoints || 0) : (targetHabit.rewardPoints || 0);
        setEarnedPoints(prev => prev + pointChange);
      }
      const updatedHabits = await toggleHabitCompletion(habitId, currentHabits, dateStr, resetTime.hour, resetTime.minute, user.id);
      await saveToCache(updatedHabits, resetTime);
      const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
      setHabits(habitsWithCompleted);
      const earned = updatedHabits.reduce((sum, h) => {
        if (h.completionHistory?.includes(dateStr)) {
          return sum + (h.rewardPoints || 0);
        }
        return sum;
      }, 0);
      setEarnedPoints(earned);
      const streak = await updateAppStreak(updatedHabits, resetTime.hour, resetTime.minute);
      setAppStreak(streak);
      const total = await getTotalPoints();
      setTotalPoints(total);
    } catch (err) {
      console.error('❌ Error toggling habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  const updateIncrement = useCallback(async (habitId: string, newAmount: number) => {
    if (!user) return;
    const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      if (DEBUG) {
        console.log('🔄 Updating increment:', habitId);
        console.log('   Date:', dateStr);
        console.log('   New amount:', newAmount);
      }
      const optimisticHabits = habits.map(h => {
        if (h.id === habitId) {
          const incrementHistory = h.incrementHistory || {};
          return {
            ...h,
            incrementAmount: newAmount,
            incrementHistory: {
              ...incrementHistory,
              [dateStr]: newAmount,
            },
          };
        }
        return h;
      });
      setHabits(optimisticHabits);
      const updatedHabits = await updateHabitIncrement(habitId, currentHabits, dateStr, newAmount, user.id);
      await saveToCache(updatedHabits, resetTime);
      const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
      setHabits(habitsWithCompleted);
      if (DEBUG) {
        console.log('✅ Increment updated successfully');
      }
    } catch (err) {
      console.error('❌ Error updating increment:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  const addHabit = useCallback(async (newHabit: Habit) => {
    if (DEBUG) {
      console.log('➕ Adding new habit:', newHabit.name);
      console.log('   Start date:', newHabit.startDate);
      console.log('   Frequency:', newHabit.frequency);
    }
    const habitWithCompleted = {
      ...newHabit,
      completed: false,
    };
    setHabits(prev => [habitWithCompleted, ...prev]);
    const currentHabits = habits.map(({ completed, ...rest }) => rest);
    const updatedHabits = [...currentHabits, newHabit];
    await saveToCache(updatedHabits, resetTime);
  }, [habits, resetTime, saveToCache]);

  const snoozeHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await snoozeHabitService(habitId, currentHabits, viewingDate, user.id);
      await saveToCache(updatedHabits, resetTime);
      const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
      setHabits(habitsWithCompleted);
    } catch (err) {
      console.error('❌ Error snoozing habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  const skipHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await skipHabitService(habitId, currentHabits, user.id);
      await saveToCache(updatedHabits, resetTime);
      const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
      setHabits(habitsWithCompleted);
    } catch (err) {
      console.error('❌ Error skipping habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;
    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await deleteHabitService(habitId, currentHabits, user.id);
      await saveToCache(updatedHabits, resetTime);
      const habitsWithCompleted = addCompletedToHabits(updatedHabits, viewingDate, resetTime.hour, resetTime.minute);
      setHabits(habitsWithCompleted);
      if (DEBUG) {
        console.log('🗑️ Habit deleted, remaining:', habitsWithCompleted.length);
      }
    } catch (err) {
      console.error('❌ Error deleting habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  return {
    habits,
    loading,
    error,
    resetTime,
    appStreak,
    totalPoints,
    earnedPoints,
    loadHabits,
    addHabit,
    toggleHabit,
    updateIncrement,
    snoozeHabit,
    skipHabit,
    deleteHabit,
  };
}