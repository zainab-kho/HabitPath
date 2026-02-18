import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';

// ─── LOAD ────────────────────────────────────────────────────────────────────

/**
 * loads all habits for a user from Supabase, merging completion history
 * with any cached data to avoid losing recent offline completions.
 */
export async function loadHabitsFromSupabase(
  userId: string,
  cachedHabits: Habit[] = []
): Promise<Habit[]> {
  try {
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const habits = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
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
      created_at: row.created_at,
    })) as Habit[];

    // merge with cached completionHistory to avoid losing recent offline completions
    const cachedMap = new Map(cachedHabits.map(h => [h.id, h]));

    const merged = habits.map(habit => {
      const cached = cachedMap.get(habit.id);
      return {
        ...habit,
        completionHistory: Array.from(new Set([
          ...(habit.completionHistory || []),
          ...(cached?.completionHistory || []),
        ])),
      };
    });

    return merged;
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
    try {
      const { error } = await supabase
        .from('habits')
        .update({ completion_history: target.completionHistory })
        .eq('id', habitId)
        .eq('user_id', userId);
    } catch {
      throw new Error('Failed to update habit completion');
    }
  }

  return updated;
}

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
  const updated = habits.map(h =>
    h.id === habitId
      ? { ...h, snoozedUntil: snoozeDateStr ?? undefined, snoozedFrom: snoozedFrom ?? undefined }
      : h
  );

  await supabase
    .from('habits')
    .update({ snoozed_until: snoozeDateStr, snoozed_from: snoozedFrom ?? null })
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

  const isOneTime = !target.frequency || target.frequency === 'None';

  console.log(`(**TESTING) skipHabit: id=${habitId}, dateStr=${dateStr}, isOneTime=${isOneTime}`);

  

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

  console.log(`(**TESTING) skipHabit: archived one-time + skipped ${dateStr} for ${habitId}`);

  return updated;
}

  // repeating habits: append to skippedDates
  const updated = habits.map(h => {
    if (h.id !== habitId) return h;
    const currentSkipped = h.skippedDates || [];
    if (currentSkipped.includes(dateStr)) return h; // already skipped
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

  console.log(`(**TESTING) skipHabit: added ${dateStr} to skippedDates for ${habitId}`);
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
   ARCHIVE
============================================================================ */

export async function archiveStaleHabits(
  userId: string,
  daysThreshold = 14
): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('frequency', 'None')
    .is('archived_at', null)
    .lt('start_date', cutoffStr);

  if (error) throw error;
}
