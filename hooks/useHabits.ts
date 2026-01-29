// hooks/useHabits.ts
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
  updateAppStreak
} from '@/utils/habitsActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * Smart caching strategy:
 * - Cache habits for last 3 days + next 3 days (7 day window)
 * - Load from cache immediately for instant display
 * - Fetch from Supabase in background to update cache
 * - Show loading only when viewing dates outside cache window
 */

const CACHE_KEY = '@habits_cache';
const CACHE_WINDOW_DAYS = 3; // Days before and after today to cache

interface HabitsCache {
  habits: Habit[];
  cachedAt: string; // ISO timestamp
  cachedForDates: string[]; // Array of date strings this cache is valid for
}

export const useHabits = (viewingDate: Date = new Date()) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<(Habit & { completed: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTime, setResetTime] = useState({ hour: 4, minute: 0 });
  const [appStreak, setAppStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  /**
   * Check if a date is within the cache window (±3 days from today)
   */
  const isInCacheWindow = useCallback((date: Date, reset: { hour: number; minute: number }): boolean => {
    const today = new Date();
    const daysDiff = Math.abs(daysBetween(date, today));
    return daysDiff <= CACHE_WINDOW_DAYS;
  }, []);

  /**
   * Get dates in cache window (last 3 days + today + next 3 days)
   */
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

  /**
   * Load habits from cache
   */
  const loadFromCache = useCallback(async (): Promise<Habit[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cacheData: HabitsCache = JSON.parse(cached);
      
      // Check if cache is reasonably fresh (less than 1 hour old)
      const cacheAge = Date.now() - new Date(cacheData.cachedAt).getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (cacheAge > oneHour) {
        console.log('Cache is stale, will refresh from Supabase');
      }

      return cacheData.habits;
    } catch (err) {
      console.error('Error loading from cache:', err);
      return null;
    }
  }, []);

  /**
   * Save habits to cache
   */
  const saveToCache = useCallback(async (habitsData: Habit[], reset: { hour: number; minute: number }) => {
    try {
      const cacheData: HabitsCache = {
        habits: habitsData,
        cachedAt: new Date().toISOString(),
        cachedForDates: getCacheWindowDates(reset),
      };
      
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('✅ Habits cached successfully');
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  }, [getCacheWindowDates]);

  /**
   * Process habits data (add completed property, calculate stats)
   */
  const processHabitsData = useCallback((habitsData: Habit[], reset: { hour: number; minute: number }) => {
    // Add completed property based on viewing date
    const habitsWithCompleted = addCompletedToHabits(
      habitsData,
      viewingDate,
      reset.hour,
      reset.minute
    );
    
    setHabits(habitsWithCompleted);

    // Calculate points for viewing date
    const dateStr = getHabitDate(viewingDate, reset.hour, reset.minute);
    const earned = habitsData.reduce((sum, h) => {
      if (h.completionHistory?.includes(dateStr)) {
        return sum + (h.rewardPoints || 0);
      }
      return sum;
    }, 0);
    setEarnedPoints(earned);

    return habitsData;
  }, [viewingDate]);

  /**
   * Load habits with smart caching
   */
  const loadHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      // Load reset time first
      const reset = await getResetTime();
      setResetTime(reset);

      // Check if viewing date is in cache window
      const inCacheWindow = isInCacheWindow(viewingDate, reset);

      if (inCacheWindow) {
        // Try to load from cache immediately for instant display
        const cached = await loadFromCache();
        
        if (cached && cached.length > 0) {
          console.log('📦 Loading from cache...');
          processHabitsData(cached, reset);
          setLoading(false);

          // Calculate streak and total points from cached data
          const streak = await updateAppStreak(cached, reset.hour, reset.minute);
          setAppStreak(streak);

          const total = await getTotalPoints();
          setTotalPoints(total);
        }

        // Fetch from Supabase in background to update cache
        console.log('🔄 Fetching fresh data in background...');
        const fresh = await loadHabitsFromSupabase(user.id);
        
        // Update cache
        await saveToCache(fresh, reset);
        
        // Update UI with fresh data
        processHabitsData(fresh, reset);
        
        const freshStreak = await updateAppStreak(fresh, reset.hour, reset.minute);
        setAppStreak(freshStreak);

        const freshTotal = await getTotalPoints();
        setTotalPoints(freshTotal);

      } else {
        // Outside cache window - show loading and fetch from Supabase
        console.log('⏳ Outside cache window, loading from Supabase...');
        setLoading(true);
        
        const fresh = await loadHabitsFromSupabase(user.id);
        processHabitsData(fresh, reset);
        
        const streak = await updateAppStreak(fresh, reset.hour, reset.minute);
        setAppStreak(streak);

        const total = await getTotalPoints();
        setTotalPoints(total);

        setLoading(false);
      }

      setError(null);
    } catch (err) {
      console.error('Error loading habits:', err);
      setError('Failed to load habits');
      setLoading(false);
    }
  }, [user, viewingDate, isInCacheWindow, loadFromCache, saveToCache, processHabitsData]);

  /**
   * Toggle habit completion with optimistic update
   */
  const toggleHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

    try {
      // Optimistic update - update UI immediately
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const targetHabit = currentHabits.find(h => h.id === habitId);
      
      if (targetHabit) {
        const isCurrentlyCompleted = targetHabit.completionHistory?.includes(dateStr) || false;
        
        // Update UI optimistically
        const optimisticHabits = habits.map(h => {
          if (h.id === habitId) {
            return { ...h, completed: !isCurrentlyCompleted };
          }
          return h;
        });
        setHabits(optimisticHabits);

        // Update points optimistically
        const pointChange = isCurrentlyCompleted ? -(targetHabit.rewardPoints || 0) : (targetHabit.rewardPoints || 0);
        setEarnedPoints(prev => prev + pointChange);
      }

      // Update Supabase in background
      const updatedHabits = await toggleHabitCompletion(
        habitId,
        currentHabits,
        dateStr,
        resetTime.hour,
        resetTime.minute,
        user.id
      );

      // Update cache
      await saveToCache(updatedHabits, resetTime);

      // Update state with real data
      const habitsWithCompleted = addCompletedToHabits(
        updatedHabits,
        viewingDate,
        resetTime.hour,
        resetTime.minute
      );
      setHabits(habitsWithCompleted);

      // Recalculate accurate points
      const earned = updatedHabits.reduce((sum, h) => {
        if (h.completionHistory?.includes(dateStr)) {
          return sum + (h.rewardPoints || 0);
        }
        return sum;
      }, 0);
      setEarnedPoints(earned);

      // Update app streak
      const streak = await updateAppStreak(updatedHabits, resetTime.hour, resetTime.minute);
      setAppStreak(streak);

      // Update total points
      const total = await getTotalPoints();
      setTotalPoints(total);
    } catch (err) {
      console.error('Error toggling habit:', err);
      // Revert optimistic update by reloading
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  /**
   * Add a new habit
   */
  const addHabit = useCallback(async (newHabit: Habit) => {
    // Optimistically add to UI
    const habitWithCompleted = {
      ...newHabit,
      completed: false,
    };
    setHabits(prev => [habitWithCompleted, ...prev]);

    // Update cache in background
    const currentHabits = habits.map(({ completed, ...rest }) => rest);
    const updatedHabits = [...currentHabits, newHabit];
    await saveToCache(updatedHabits, resetTime);
  }, [habits, resetTime, saveToCache]);

  /**
   * Snooze habit
   */
  const snoozeHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await snoozeHabitService(
        habitId,
        currentHabits,
        viewingDate,
        user.id
      );

      await saveToCache(updatedHabits, resetTime);

      const habitsWithCompleted = addCompletedToHabits(
        updatedHabits,
        viewingDate,
        resetTime.hour,
        resetTime.minute
      );

      setHabits(habitsWithCompleted);
    } catch (err) {
      console.error('Error snoozing habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  /**
   * Skip habit
   */
  const skipHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await skipHabitService(habitId, currentHabits, user.id);

      await saveToCache(updatedHabits, resetTime);

      const habitsWithCompleted = addCompletedToHabits(
        updatedHabits,
        viewingDate,
        resetTime.hour,
        resetTime.minute
      );

      setHabits(habitsWithCompleted);
    } catch (err) {
      console.error('Error skipping habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  /**
   * Delete habit
   */
  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await deleteHabitService(habitId, currentHabits, user.id);

      await saveToCache(updatedHabits, resetTime);

      const habitsWithCompleted = addCompletedToHabits(
        updatedHabits,
        viewingDate,
        resetTime.hour,
        resetTime.minute
      );

      setHabits(habitsWithCompleted);
    } catch (err) {
      console.error('Error deleting habit:', err);
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, saveToCache, loadHabits]);

  // Load on mount and when viewing date changes
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
    snoozeHabit,
    skipHabit,
    deleteHabit,
  };
};