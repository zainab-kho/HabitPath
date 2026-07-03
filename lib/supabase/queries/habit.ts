import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';
import { getHabitDate } from '@/utils/dateUtils';


// ─── LOAD ────────────────────────────────────────────────────────────────────

/**
 * loads all habits for a user from Supabase, merging completion history
 * with any cached data to avoid losing recent offline completions.
 */
export async function loadHabitsFromSupabase(
  userId: string,
): Promise<Habit[]> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      habitText: row.name,
      icon: row.icon,
      frequency: row.frequency,
      selectedDays: row.selected_days || [],
      selectedTimeOfDay: row.selected_time_of_day,
      tempTimeOfDay: row.temp_time_of_day ?? undefined,
      tempTimeOfDayDate: row.temp_time_of_day_date ?? undefined,
      tempOrder: row.temp_order ?? undefined,
      tempOrderDate: row.temp_order_date ?? undefined,
      tempSelectedDays: row.temp_selected_days ?? undefined,
      tempSelectedDaysWeek: row.temp_selected_days_week ?? undefined,
      startDate: row.start_date,
      selectedDate: row.selected_date,
      rewardPoints: row.reward_points || 0,
      completionHistory: row.completion_history || [],
      lastCompletedDate: row.last_completed_date ?? undefined,
      snoozedFrom: row.snoozed_from,
      snoozedUntil: row.snoozed_until,
      skippedDates: row.skipped_dates || [],
      archivedAt: row.archived_at,
      keepUntil: row.keep_until || false,
      increment: row.increment || false,
      incrementAmount: row.increment_amount || 0,
      incrementGoal: row.increment_goal || undefined,
      incrementStep: row.increment_step || 1,
      incrementType: row.increment_type || undefined,
      incrementHistory: row.increment_history || {},
      path: row.path,
      pathColor: row.path_color,
      customType: row.custom_type ?? undefined,
      customInterval: row.custom_interval ?? undefined,
      endDate: row.end_date ?? undefined,
      created_at: row.created_at,
    })) as Habit[];
  } catch (err) {
    console.error('Error: loadHabitsFromSupabase failed', err);
    return [];
  }
}

// ─── TOGGLE / UPDATE ─────────────────────────────────────────────────────────

export async function toggleHabitCompletion(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  resetHour: number,
  resetMinute: number,
  userId: string
): Promise<Habit[]> {
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);

  const updated = habits.map(habit => {
    if (habit.id !== habitId) return habit;

    const history = habit.completionHistory || [];
    const completed = history.includes(dateStr);

    return {
      ...habit,
      completionHistory: completed
        ? history.filter(d => d !== dateStr)
        : [...history, dateStr],
      // the day the completion actually happened — for keepUntil habits the
      // history entry sits on the cycle start, which can be days earlier
      lastCompletedDate: completed ? undefined : todayStr,
    };
  });

  const target = updated.find(h => h.id === habitId);

  if (target) {
    try {
      await supabase
        .from('habits')
        .update({ completion_history: target.completionHistory })
        .eq('id', habitId)
        .eq('user_id', userId);
    } catch {
      throw new Error('Failed to update habit completion');
    }

    // best-effort: column may not exist yet, never block the completion itself
    try {
      await supabase
        .from('habits')
        .update({ last_completed_date: target.lastCompletedDate ?? null })
        .eq('id', habitId)
        .eq('user_id', userId);
    } catch {}
  }

  return updated;
}

export async function updateHabitIncrement(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  newAmount: number,
  userId: string,
  resetHour: number = 4,
  resetMinute: number = 0
): Promise<Habit[]> {
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);

  const updated = habits.map(habit => {
    if (habit.id !== habitId) return habit;

    const incrementHistory = habit.incrementHistory || {};

    // keepUntil increments: track the day the goal was actually reached, since
    // the increment history sits on the cycle start
    let lastCompletedDate = habit.lastCompletedDate;
    if (habit.keepUntil && habit.increment) {
      const goal = habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
      if (newAmount >= goal) lastCompletedDate = todayStr;
      else lastCompletedDate = undefined;
    }

    return {
      ...habit,
      incrementAmount: newAmount,
      incrementHistory: {
        ...incrementHistory,
        [dateStr]: newAmount,
      },
      lastCompletedDate,
    };
  });

  const target = updated.find(h => h.id === habitId);

  if (target) {
    const { error } = await supabase
      .from('habits')
      .update({
        increment_amount: newAmount,
        increment_history: target.incrementHistory,
      })
      .eq('id', habitId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase increment update failed:', error);
    }

    // best-effort, separate so a missing column never blocks the increment
    if (target.keepUntil && target.increment) {
      try {
        await supabase
          .from('habits')
          .update({ last_completed_date: target.lastCompletedDate ?? null })
          .eq('id', habitId)
          .eq('user_id', userId);
      } catch {}
    }
  }

  return updated;
}

// ─── SNOOZE / SKIP / DELETE ───────────────────────────────────────────────────

/**
 * Snooze a habit until a specific date (YYYY-MM-DD string, no time component).
 * Pass `null` as snoozeDateStr to undo a snooze.
 */
export async function snoozeHabit(
  habitId: string,
  habits: Habit[],
  snoozeDateStr: string | null,
  userId: string,
  snoozedFrom?: string
): Promise<Habit[]> {
  const target = habits.find(h => h.id === habitId);
  const clearArchive = target?.keepUntil && snoozeDateStr;

  const updated = habits.map(h =>
    h.id === habitId
      ? {
          ...h,
          snoozedUntil: snoozeDateStr ?? undefined,
          snoozedFrom: snoozedFrom ?? undefined,
          ...(clearArchive ? { archivedAt: undefined } : {}),
        }
      : h
  );

  await supabase
    .from('habits')
    .update({
      snoozed_until: snoozeDateStr,
      snoozed_from: snoozedFrom ?? null,
      ...(clearArchive ? { archived_at: null } : {}),
    })
    .eq('id', habitId)
    .eq('user_id', userId);

  return updated;
}

/**
 * Skip a habit for a specific date.
 * - Repeating habits: adds dateStr to skippedDates array
 * - One-time habits (freq = None): archives the habit
 */
export async function skipHabit(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  userId: string
): Promise<Habit[]> {
  const target = habits.find(h => h.id === habitId);
  if (!target) return habits;

  const isOneTime = (!target.frequency || target.frequency === 'None') && !target.keepUntil;

  if (isOneTime) {
    const archiveIso = new Date().toISOString();

    const updated = habits.map(h => {
      if (h.id !== habitId) return h;

      const currentSkipped = h.skippedDates || [];
      const nextSkipped = currentSkipped.includes(dateStr)
        ? currentSkipped
        : [...currentSkipped, dateStr];

      return {
        ...h,
        skippedDates: nextSkipped,
        archivedAt: archiveIso,
      };
    });

    const updatedTarget = updated.find(h => h.id === habitId);

    await supabase
      .from('habits')
      .update({
        skipped_dates: updatedTarget?.skippedDates ?? [dateStr],
        archived_at: archiveIso,
      })
      .eq('id', habitId)
      .eq('user_id', userId);

    return updated;
  }

  // repeating habits: append to skippedDates
  const updated = habits.map(h => {
    if (h.id !== habitId) return h;
    const currentSkipped = h.skippedDates || [];
    if (currentSkipped.includes(dateStr)) return h;
    return { ...h, skippedDates: [...currentSkipped, dateStr] };
  });

  const updatedTarget = updated.find(h => h.id === habitId);
  if (updatedTarget) {
    await supabase
      .from('habits')
      .update({ skipped_dates: updatedTarget.skippedDates })
      .eq('id', habitId)
      .eq('user_id', userId);
  }

  return updated;
}

export async function unskipHabit(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  userId: string
): Promise<Habit[]> {
  const updated = habits.map(h => {
    if (h.id !== habitId) return h;
    return {
      ...h,
      skippedDates: (h.skippedDates ?? []).filter(d => d !== dateStr),
    };
  });

  const target = updated.find(h => h.id === habitId);
  if (target) {
    await supabase
      .from('habits')
      .update({ skipped_dates: target.skippedDates })
      .eq('id', habitId)
      .eq('user_id', userId);
  }

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

