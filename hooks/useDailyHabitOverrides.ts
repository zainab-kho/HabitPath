// @/hooks/useDailyHabitOverrides.ts
//
// Manages two kinds of daily overrides that reset to permanent settings the next day:
//
//   1. ORDER — stored in AsyncStorage keyed by `habit_order_YYYY-MM-DD`
//              (already partially used in HabitsList; now centralised here)
//
//   2. TIME-OF-DAY SECTION — stored in Supabase on the habit row itself as
//              `temp_time_of_day` + `temp_time_of_day_date`.  The next day the
//              habit falls back to `selected_time_of_day` because the date won't
//              match.  (These columns already exist on your Habit type as
//              tempTimeOfDay / tempTimeOfDayDate.)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';
import { formatLocalDate } from '@/utils/dateUtils';

// ─── order (AsyncStorage) ────────────────────────────────────────────────────

function orderKey(dateStr: string) {
  return `@habit_order_${dateStr}`;
}

export async function loadDailyOrder(dateStr: string): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(orderKey(dateStr));
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export async function saveDailyOrder(dateStr: string, orderedIds: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(orderKey(dateStr), JSON.stringify(orderedIds));
  } catch (err) {
    console.error('[useDailyHabitOverrides] saveDailyOrder error:', err);
  }
}

// ─── apply saved order to a habit list ───────────────────────────────────────

/**
 * Sorts `habits` according to the stored daily order for `dateStr`.
 * Habits not in the stored order are appended at the end sorted by startDate.
 */
export function applyDailyOrder<T extends { id: string; startDate: string }>(
  habits: T[],
  savedOrder: string[] | null,
): T[] {
  if (!savedOrder || savedOrder.length === 0) {
    return [...habits].sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  const indexed = new Map(savedOrder.map((id, i) => [id, i]));
  return [...habits].sort((a, b) => {
    const ia = indexed.has(a.id) ? indexed.get(a.id)! : Number.MAX_SAFE_INTEGER;
    const ib = indexed.has(b.id) ? indexed.get(b.id)! : Number.MAX_SAFE_INTEGER;
    if (ia !== ib) return ia - ib;
    return a.startDate.localeCompare(b.startDate);
  });
}

// ─── time-of-day override (Supabase) ─────────────────────────────────────────

/**
 * Returns the effective time-of-day for a habit on a given date.
 * Uses tempTimeOfDay if tempTimeOfDayDate matches today, otherwise
 * falls back to selectedTimeOfDay.
 */
export function effectiveTimeOfDay(habit: Habit, dateStr: string): string {
  if (habit.tempTimeOfDay && habit.tempTimeOfDayDate === dateStr) {
    return habit.tempTimeOfDay;
  }
  return habit.selectedTimeOfDay ?? 'Anytime';
}

/**
 * Saves a temporary time-of-day override for today to Supabase.
 * Does NOT affect selected_time_of_day (the permanent setting).
 */
export async function saveTempTimeOfDay(
  habitId: string,
  userId: string,
  newTimeOfDay: string,
  dateStr: string,
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({
      temp_time_of_day: newTimeOfDay,
      temp_time_of_day_date: dateStr,
    })
    .eq('id', habitId)
    .eq('user_id', userId);

  if (error) {
    console.error('[useDailyHabitOverrides] saveTempTimeOfDay error:', error);
    throw error;
  }
}

// ─── hook (convenience wrapper used in HabitsList) ───────────────────────────

export function useDailyHabitOverrides(dateStr: string) {
  const saveOrder = useCallback(
    (orderedIds: string[]) => saveDailyOrder(dateStr, orderedIds),
    [dateStr],
  );

  const loadOrder = useCallback(
    () => loadDailyOrder(dateStr),
    [dateStr],
  );

  return { saveOrder, loadOrder };
}