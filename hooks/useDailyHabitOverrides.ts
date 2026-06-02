// @/hooks/useDailyHabitOverrides.ts
//
// Manages two kinds of daily overrides that reset to permanent settings the next day:
//
//   1. ORDER — stored on each habit row as `temp_order` + `temp_order_date`.
//              The next day the habit falls back to default order because the
//              date won't match.
//
//   2. TIME-OF-DAY SECTION — stored on each habit row as
//              `temp_time_of_day` + `temp_time_of_day_date`.

import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';

// ─── apply saved order to a habit list ───────────────────────────────────────

/**
 * Sorts habits by temp_order for today, falling back to startDate.
 * Habits whose tempOrderDate doesn't match today are treated as unordered.
 */
export function applyDailyOrder<T extends Pick<Habit, 'id' | 'startDate' | 'tempOrder' | 'tempOrderDate'>>(
  habits: T[],
  dateStr: string,
): T[] {
  return [...habits].sort((a, b) => {
    const aHasOrder = a.tempOrder != null && a.tempOrderDate === dateStr;
    const bHasOrder = b.tempOrder != null && b.tempOrderDate === dateStr;

    if (aHasOrder && bHasOrder) return a.tempOrder! - b.tempOrder!;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;
    return (a.startDate ?? '').localeCompare(b.startDate ?? '');
  });
}

// ─── save order to Supabase ─────────────────────────────────────────────────

/**
 * Saves the daily order for a list of habits to Supabase.
 * Each habit gets its position index stored as temp_order + temp_order_date.
 */
export async function saveDailyOrder(
  orderedIds: string[],
  userId: string,
  dateStr: string,
): Promise<void> {
  // Batch update: set temp_order for each habit
  const promises = orderedIds.map((id, index) =>
    supabase
      .from('habits')
      .update({ temp_order: index, temp_order_date: dateStr })
      .eq('id', id)
      .eq('user_id', userId)
  );

  const results = await Promise.all(promises);
  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    console.error('[useDailyHabitOverrides] saveDailyOrder errors:', failed.map(r => r.error));
  }
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
