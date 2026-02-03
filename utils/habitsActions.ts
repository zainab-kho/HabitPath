import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';
import { getHabitDate } from '@/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@habits_cache';

/* ============================================================================
   CACHE TYPES + HELPERS
============================================================================ */

interface HabitsCache {
  habits: Habit[];
  cachedAt: string;
  cachedForDates: string[];
}

/**
 * Safely get habits array from cache
 */
async function getCachedHabits(): Promise<Habit[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    // New cache shape
    if (Array.isArray(parsed?.habits)) {
      return parsed.habits;
    }

    // Old fallback
    if (Array.isArray(parsed)) {
      return parsed;
    }

    console.warn('⚠️ Invalid habits cache shape');
    return [];
  } catch (err) {
    console.error('❌ Failed to read habits cache', err);
    return [];
  }
}

/* ============================================================================
   CORE LOAD
============================================================================ */

export async function loadHabitsFromSupabase(userId: string): Promise<Habit[]> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const habits = (data || []).map(row => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      habitText: row.name, 
      icon: row.icon,
      frequency: row.frequency,
      selectedDays: row.selected_days || [],
      selectedTimeOfDay: row.selected_time_of_day,
      startDate: row.start_date,  
      selectedDate: row.selected_date,
      rewardPoints: row.reward_points || 0,
      completionHistory: row.completion_history || [],
      snoozedUntil: row.snoozed_until,
      skipped: row.skipped || false,
      keepUntil: row.keep_until || false,
      increment: row.increment || false,
      incrementAmount: row.increment_amount || 0,
      incrementGoal: row.increment_goal || undefined,
      incrementStep: row.increment_step || 1,
      incrementType: row.increment_type || undefined,
      incrementHistory: row.increment_history || {},
      pathColor: row.path_color,
      created_at: row.created_at,
    })) as Habit[];

    console.log('📥 Loaded from Supabase:', habits.length, 'habits');
    habits.forEach(h => {
      console.log(`   - ${h.name}: startDate=${h.startDate}, freq=${h.frequency}`);
      if (h.increment && h.incrementHistory) {
        console.log(`      INCREMENT DATA:`, JSON.stringify(h.incrementHistory));
      }
    });

    // Merge with cached completionHistory defensively
    const cachedHabits = await getCachedHabits();
    const cachedMap = new Map(cachedHabits.map(h => [h.id, h]));

    const merged = habits.map(habit => {
      const cached = cachedMap.get(habit.id);

      return {
        ...habit,
        completionHistory:
          habit.completionHistory?.length
            ? habit.completionHistory
            : cached?.completionHistory || [],
      };
    });

    return merged;
  } catch (err) {
    console.error('❌ loadHabitsFromSupabase failed', err);
    return [];
  }
}

/* ============================================================================
   RESET TIME
============================================================================ */

export async function getResetTime(): Promise<{ hour: number; minute: number }> {
  try {
    const raw = await AsyncStorage.getItem('@reset_time');
    if (!raw) return { hour: 4, minute: 0 };

    return JSON.parse(raw);
  } catch {
    return { hour: 4, minute: 0 };
  }
}

/* ============================================================================
   COMPLETION HELPERS
============================================================================ */

export function addCompletedToHabits(
  habits: Habit[],
  date: Date,
  resetHour: number,
  resetMinute: number
) {
  const dateStr = getHabitDate(date, resetHour, resetMinute);

  return habits.map(habit => ({
    ...habit,
    completed: habit.completionHistory?.includes(dateStr) ?? false,
  }));
}

/* ============================================================================
   TOGGLE / UPDATE ACTIONS
============================================================================ */

export async function toggleHabitCompletion(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  resetHour: number,
  resetMinute: number,
  userId: string
): Promise<Habit[]> {
  const updated = habits.map(habit => {
    if (habit.id !== habitId) return habit;

    const history = habit.completionHistory || [];
    const completed = history.includes(dateStr);

    return {
      ...habit,
      completionHistory: completed
        ? history.filter(d => d !== dateStr)
        : [...history, dateStr],
    };
  });

  const target = updated.find(h => h.id === habitId);

  if (target) {
    await supabase
      .from('habits')
      .update({ completion_history: target.completionHistory })
      .eq('id', habitId)
      .eq('user_id', userId);
  }

  return updated;
}

/**
 * Update increment amount for a habit on a specific date
 */
export async function updateHabitIncrement(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  newAmount: number,
  userId: string
): Promise<Habit[]> {
  const updated = habits.map(habit => {
    if (habit.id !== habitId) return habit;

    const incrementHistory = habit.incrementHistory || {};
    
    return {
      ...habit,
      incrementAmount: newAmount,
      incrementHistory: {
        ...incrementHistory,
        [dateStr]: newAmount,
      },
    };
  });

  const target = updated.find(h => h.id === habitId);

  if (target) {
    console.log('💾 Saving increment to Supabase:', {
      habitId,
      dateStr,
      newAmount,
      incrementHistory: target.incrementHistory,
    });

    const { data, error } = await supabase
      .from('habits')
      .update({ 
        increment_amount: newAmount,
        increment_history: target.incrementHistory,
      })
      .eq('id', habitId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Supabase increment update failed:', error);
    } else {
      console.log('✅ Supabase increment update succeeded');
    }
  }

  return updated;
}

/* ============================================================================
   SNOOZE / SKIP / DELETE
============================================================================ */

export async function snoozeHabit(
  habitId: string,
  habits: Habit[],
  viewingDate: Date,
  userId: string
): Promise<Habit[]> {
  const updated = habits.map(h =>
    h.id === habitId
      ? { ...h, snoozedUntil: viewingDate.toISOString() }
      : h
  );

  await supabase
    .from('habits')
    .update({ snoozed_until: viewingDate.toISOString() })
    .eq('id', habitId)
    .eq('user_id', userId);

  return updated;
}

export async function skipHabit(
  habitId: string,
  habits: Habit[],
  userId: string
): Promise<Habit[]> {
  const updated = habits.map(h =>
    h.id === habitId ? { ...h, skipped: true } : h
  );

  await supabase
    .from('habits')
    .update({ skipped: true })
    .eq('id', habitId)
    .eq('user_id', userId);

  return updated;
}

export async function deleteHabit(
  habitId: string,
  habits: Habit[],
  userId: string
): Promise<Habit[]> {
  await supabase
    .from('habits')
    .delete()
    .eq('id', habitId)
    .eq('user_id', userId);

  return habits.filter(h => h.id !== habitId);
}

/* ============================================================================
   STREAK + POINTS
============================================================================ */

export async function updateAppStreak(
  habits: Habit[],
  resetHour: number,
  resetMinute: number
): Promise<number> {
  if (habits.length === 0) return 0;

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);

    const dateStr = getHabitDate(date, resetHour, resetMinute);

    const completedAny = habits.some(h =>
      h.completionHistory?.includes(dateStr)
    );

    if (!completedAny) break;
    streak++;
  }

  return streak;
}

export async function getTotalPoints(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem('@total_points');
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}