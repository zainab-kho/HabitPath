import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';
import { getHabitDate, getWeekDatesForDate } from '@/utils/dateUtils';
import uuid from 'react-native-uuid';


// ─── CREATE ──────────────────────────────────────────────────────────────────

// inserts a habit row. `habitData` is the same column-shaped object NewHabitPage
// builds (snake_case keys). Returns the new row id. Used both by NewHabitPage and
// when a quest creates a real habit tagged with quest_id / phase_id / quest_scope.
export async function createHabit(
  habitData: Record<string, any>,
  userId: string,
): Promise<string> {
  const id = habitData.id ? String(habitData.id) : String(uuid.v4());
  const { error } = await supabase.from('habits').insert([{
    ...habitData,
    id,
    user_id: userId,
    created_at: new Date().toISOString(),
  }]);
  if (error) throw error;
  return id;
}


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

    return (data || []).map(mapHabitRow);
  } catch (err) {
    console.error('Error: loadHabitsFromSupabase failed', err);
    return [];
  }
}

// maps a raw `habits` row to a Habit. Shared by the full load and quest-scoped load.
export function mapHabitRow(row: any): Habit {
  return {
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
    // empty = inbox habit: not scheduled anywhere until the user picks a date
    startDate: row.start_date ?? '',
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
    monthlyWeek: row.monthly_week ?? undefined,
    monthlyWeekday: row.monthly_weekday ?? undefined,
    monthlyDay: row.monthly_day ?? undefined,
    endDate: row.end_date ?? undefined,
    created_at: row.created_at,
    // quest linkage (real columns; null for normal habits)
    questId: row.quest_id ?? undefined,
    phaseId: row.phase_id ?? undefined,
    questScope: row.quest_scope ?? undefined,
  } as Habit;
}

// assign / move a quest goal into a phase: sets phase_id, scope, and end date
export async function setHabitPhase(
  habitId: string,
  userId: string,
  phaseId: string | null,
  endDate: string | null,
  scope: 'phase' | 'carry' | 'forever' = 'phase',
): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({ phase_id: phaseId, quest_scope: scope, end_date: endDate })
    .eq('id', habitId)
    .eq('user_id', userId);
  if (error) throw error;
}

// loads all habits belonging to one quest (any phase), incl. archived ones —
// the quest detail decides what to show per phase.
export async function loadHabitsByQuest(questId: string, userId: string): Promise<Habit[]> {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_id', questId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapHabitRow);
}

// ─── TOGGLE / UPDATE ─────────────────────────────────────────────────────────

// pure state change — no DB. Split from the persist step so callers can apply
// the update synchronously (fixes rapid-tap races where two toggles both read
// a stale snapshot and the second overwrites the first).
export function applyToggleCompletion(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  resetHour: number,
  resetMinute: number
): Habit[] {
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);

  return habits.map(habit => {
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
}

export async function persistHabitCompletion(target: Habit, userId: string): Promise<void> {
  try {
    await supabase
      .from('habits')
      .update({ completion_history: target.completionHistory })
      .eq('id', target.id)
      .eq('user_id', userId);
  } catch {
    throw new Error('Failed to update habit completion');
  }

  // best-effort: column may not exist yet, never block the completion itself
  try {
    await supabase
      .from('habits')
      .update({ last_completed_date: target.lastCompletedDate ?? null })
      .eq('id', target.id)
      .eq('user_id', userId);
  } catch {}
}

export async function toggleHabitCompletion(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  resetHour: number,
  resetMinute: number,
  userId: string
): Promise<Habit[]> {
  const updated = applyToggleCompletion(habitId, habits, dateStr, resetHour, resetMinute);

  const target = updated.find(h => h.id === habitId);
  if (target) await persistHabitCompletion(target, userId);

  return updated;
}

// pure state change — no DB (see applyToggleCompletion for why this is split)
export function applyIncrementUpdate(
  habitId: string,
  habits: Habit[],
  dateStr: string,
  newAmount: number,
  resetHour: number = 4,
  resetMinute: number = 0
): Habit[] {
  const todayStr = getHabitDate(new Date(), resetHour, resetMinute);

  return habits.map(habit => {
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

    // one-time habits have a single lifetime total (their readers SUM all
    // buckets) — consolidate into one bucket on every write so the stored
    // history matches the newAmount instead of double-counting old buckets
    const isOneTime = !habit.frequency || habit.frequency === 'None';

    return {
      ...habit,
      incrementAmount: newAmount,
      incrementHistory: isOneTime
        ? { [dateStr]: newAmount }
        : { ...incrementHistory, [dateStr]: newAmount },
      lastCompletedDate,
    };
  });
}

export async function persistHabitIncrement(target: Habit, newAmount: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('habits')
    .update({
      increment_amount: newAmount,
      increment_history: target.incrementHistory,
    })
    .eq('id', target.id)
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
        .eq('id', target.id)
        .eq('user_id', userId);
    } catch {}
  }
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
  const updated = applyIncrementUpdate(habitId, habits, dateStr, newAmount, resetHour, resetMinute);

  const target = updated.find(h => h.id === habitId);
  if (target) await persistHabitIncrement(target, newAmount, userId);

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

  // week goals are week-scoped: the skip is recorded on the week's start day,
  // which is what getHabitStatus checks — so the whole week reads as skipped
  // and the goal comes back fresh on its next occurrence (next week / next month)
  if (target.frequency === 'Weekly Goal') {
    dateStr = getWeekDatesForDate(dateStr)[0];
  }

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
  // mirror skipHabit: week goals record their skip on the week's start day
  const unskipTarget = habits.find(h => h.id === habitId);
  if (unskipTarget?.frequency === 'Weekly Goal') {
    dateStr = getWeekDatesForDate(dateStr)[0];
  }

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

// soft-hide a habit — stamps archived_at; the row stays in the DB so it can be
// restored later. Returns the list with archivedAt applied.
export async function archiveHabit(
  habitId: string,
  habits: Habit[],
  userId: string,
  archivedAt: string = new Date().toISOString()
): Promise<Habit[]> {
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: archivedAt })
    .eq('id', habitId)
    .eq('user_id', userId);
  if (error) throw error;

  return habits.map(h => (h.id === habitId ? { ...h, archivedAt } : h));
}

