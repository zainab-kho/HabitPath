// hooks/useHabits.ts
import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import {
  addCompletedToHabits,
  deleteHabit as deleteHabitService,
  getHabitDate,
  getResetTime,
  getTotalPoints,
  loadHabitsFromSupabase,
  skipHabit as skipHabitService,
  snoozeHabit as snoozeHabitService,
  toggleHabitCompletion,
  updateAppStreak
} from '@/utils/habitsActions';
import { useCallback, useEffect, useState } from 'react';

export const useHabits = (viewingDate: Date = new Date()) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<(Habit & { completed: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetTime, setResetTime] = useState({ hour: 4, minute: 0 });
  const [appStreak, setAppStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedPoints, setEarnedPoints] = useState(0);

  // Load habits from Supabase
  const loadHabits = useCallback(async () => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // load reset time
      const reset = await getResetTime();
      setResetTime(reset);

      // load habits
      const loadedHabits = await loadHabitsFromSupabase(user.id);
      
      // add completed property based on viewing date
      const habitsWithCompleted = addCompletedToHabits(
        loadedHabits,
        viewingDate,
        reset.hour,
        reset.minute
      );
      
      setHabits(habitsWithCompleted);

      // update app streak
      const streak = await updateAppStreak(loadedHabits, reset.hour, reset.minute);
      setAppStreak(streak);

      // calculate points for viewing date
      const dateStr = getHabitDate(viewingDate, reset.hour, reset.minute);
      const earned = loadedHabits.reduce((sum, h) => {
        if (h.completionHistory?.includes(dateStr)) {
          return sum + (h.rewardPoints || 0);
        }
        return sum;
      }, 0);
      setEarnedPoints(earned);

      // load total points
      const total = await getTotalPoints();
      setTotalPoints(total);

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading habits:', err);
      setError('Failed to load habits');
      setLoading(false);
    }
  }, [user, viewingDate]);

  // Add a new habit (passed from modal)
  const addHabit = useCallback((newHabit: Habit) => {
    const habitWithCompleted = {
      ...newHabit,
      completed: false,
    };
    setHabits(prev => [habitWithCompleted, ...prev]);
  }, []);

  // Toggle habit completion
  const toggleHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

    try {
      // Get current habits without completed property
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      
      const updatedHabits = await toggleHabitCompletion(
        habitId,
        currentHabits,
        dateStr,
        resetTime.hour,
        resetTime.minute,
        user.id
      );

      // Add completed property back
      const habitsWithCompleted = addCompletedToHabits(
        updatedHabits,
        viewingDate,
        resetTime.hour,
        resetTime.minute
      );

      setHabits(habitsWithCompleted);

      // Recalculate points
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
      loadHabits();
    }
  }, [habits, viewingDate, resetTime, user, loadHabits]);

  // Snooze habit
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
  }, [habits, viewingDate, resetTime, user, loadHabits]);

  // Skip habit
  const skipHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await skipHabitService(habitId, currentHabits, user.id);

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
  }, [habits, viewingDate, resetTime, user, loadHabits]);

  // Delete habit
  const deleteHabit = useCallback(async (habitId: string) => {
    if (!user) return;

    try {
      const currentHabits = habits.map(({ completed, ...rest }) => rest);
      const updatedHabits = await deleteHabitService(habitId, currentHabits, user.id);

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
  }, [habits, viewingDate, resetTime, user, loadHabits]);

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