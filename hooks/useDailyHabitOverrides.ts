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
 * Sorts habits by temp_order for today, then by the permanent display_order set
 * on the All Goals page, then by startDate for habits that have never been
 * arranged. Habits whose tempOrderDate doesn't match today are treated as
 * having no daily order.
 */
export function applyDailyOrder<
  T extends Pick<Habit, 'id' | 'startDate' | 'displayOrder' | 'tempOrder' | 'tempOrderDate'>
>(
  habits: T[],
  dateStr: string,
): T[] {
  return [...habits].sort((a, b) => {
    const aHasOrder = a.tempOrder != null && a.tempOrderDate === dateStr;
    const bHasOrder = b.tempOrder != null && b.tempOrderDate === dateStr;

    if (aHasOrder && bHasOrder) return a.tempOrder! - b.tempOrder!;
    if (aHasOrder && !bHasOrder) return -1;
    if (!aHasOrder && bHasOrder) return 1;

    // permanent order next — habits that have never been arranged sort after
    // the ones that have, keeping their old startDate ordering among themselves
    const aPermanent = a.displayOrder ?? null;
    const bPermanent = b.displayOrder ?? null;
    if (aPermanent != null && bPermanent != null) return aPermanent - bPermanent;
    if (aPermanent != null) return -1;
    if (bPermanent != null) return 1;

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
  // Filter out quest goal IDs — they live in quest_goals, not habits
  const habitIds = orderedIds.filter(id => !id.startsWith('quest_goal_'));

  // Batch update: set temp_order for each habit
  const promises = habitIds.map((id, index) =>
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

// ─── permanent order (Supabase) ──────────────────────────────────────────────

/**
 * Saves the permanent order of habits — the order every day starts from, before
 * any per-day drag. Set from the All Goals page; `orderedIds` must be the full
 * list of habits being arranged, in their new order.
 */
export async function savePermanentOrder(
  orderedIds: string[],
  userId: string,
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('habits')
        .update({ display_order: index })
        .eq('id', id)
        .eq('user_id', userId)
    )
  );

  const failed = results.filter(r => r.error);
  if (failed.length > 0) {
    console.error('[useDailyHabitOverrides] savePermanentOrder errors:', failed.map(r => r.error));
  }
}

/**
 * Moves a habit into a different time-of-day section for good (unlike
 * saveTempTimeOfDay, which only applies to one day).
 */
export async function savePermanentTimeOfDay(
  habitId: string,
  userId: string,
  newTimeOfDay: string,
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ selected_time_of_day: newTimeOfDay })
    .eq('id', habitId)
    .eq('user_id', userId);

  if (error) {
    console.error('[useDailyHabitOverrides] savePermanentTimeOfDay error:', error);
    throw error;
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

// ─── day-of-week override (Supabase) ────────────────────────────────────────

export async function saveTempSelectedDays(
  habitId: string,
  userId: string,
  days: string[],
  weekMonday: string,
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({
      temp_selected_days: days,
      temp_selected_days_week: weekMonday,
    })
    .eq('id', habitId)
    .eq('user_id', userId);

  if (error) {
    console.error('[useDailyHabitOverrides] saveTempSelectedDays error:', error);
    throw error;
  }
}

// Re-anchors a habit by rewriting its start date. Used by "move to a different
// day": for one-time habits it just reschedules the single due date; for
// every-N-days habits it shifts the whole interval grid.
// Optionally rewrites completion_history too, so a re-anchor can drop stale
// completions that no longer line up with the new grid.
export async function saveHabitStartDate(
  habitId: string,
  userId: string,
  startDate: string,
  completionHistory?: string[],
): Promise<void> {
  const update: { start_date: string; completion_history?: string[] } = { start_date: startDate };
  if (completionHistory) update.completion_history = completionHistory;

  const { error } = await supabase
    .from('habits')
    .update(update)
    .eq('id', habitId)
    .eq('user_id', userId);

  if (error) {
    console.error('[useDailyHabitOverrides] saveHabitStartDate error:', error);
    throw error;
  }
}
