// @/lib/supabase/queries/questGoalHabits.ts
//
// Loads quest goals that have "show_on_habits_page" enabled and converts them
// into Habit-shaped objects so the habits page can render them seamlessly.
//
// KEY BEHAVIOR:
// - Only the first INCOMPLETE goal per quest is shown.
// - It appears daily until completed on the quest detail page.
// - Subtasks can be checked off from the habits page.
// - A "worked on it today" checkbox lets users visually track daily effort,
//   stored in quest_goal_completions (separate from actual quest completion).

import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';

// ─── LOAD ────────────────────────────────────────────────────────────────────

export async function loadQuestGoalsAsHabits(userId: string): Promise<Habit[]> {
  try {
    const { data, error } = await supabase
      .from('quest_goals')
      .select(`
        id, name, icon, type, target_count, active_days, completed, sort_order, week_id,
        snoozed_until, snoozed_from, skipped_dates,
        quest_subtasks ( id, name, completed, sort_order ),
        quest_phases!inner (
          id, sort_order, quest_id,
          quests!inner ( id, name, user_id )
        )
      `)
      .eq('show_on_habits_page', true)
      .eq('quest_phases.quests.user_id', userId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Collect all goal IDs to fetch "worked on it" completions
    const allGoalIds = data.map((g: any) => g.id);
    const { data: completions } = await supabase
      .from('quest_goal_completions')
      .select('goal_id, date')
      .in('goal_id', allGoalIds);

    // Build lookup: goalId -> array of dates worked on
    const workedOnMap = new Map<string, string[]>();
    for (const c of (completions ?? [])) {
      if (!workedOnMap.has(c.goal_id)) workedOnMap.set(c.goal_id, []);
      workedOnMap.get(c.goal_id)!.push(c.date);
    }

    // Group goals by quest
    const questGoalsMap = new Map<string, any[]>();
    for (const goal of data) {
      const questId = (goal as any).quest_phases?.quests?.id;
      if (!questId) continue;
      if (!questGoalsMap.has(questId)) questGoalsMap.set(questId, []);
      questGoalsMap.get(questId)!.push(goal);
    }

    // For each quest, sort by phase sort_order then goal sort_order,
    // and pick the FIRST incomplete goal
    const habits: Habit[] = [];

    for (const [questId, goals] of questGoalsMap) {
      goals.sort((a: any, b: any) => {
        const phaseDiff = (a.quest_phases?.sort_order ?? 0) - (b.quest_phases?.sort_order ?? 0);
        if (phaseDiff !== 0) return phaseDiff;
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      });

      const firstIncomplete = goals.find((g: any) => !g.completed);
      if (!firstIncomplete) continue;

      const quest = firstIncomplete.quest_phases?.quests;
      const subtasks = (firstIncomplete.quest_subtasks ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((s: any) => ({ id: s.id, name: s.name, completed: s.completed ?? false }));

      // "worked on it" dates act as completionHistory for visual check-off
      const workedOnDates = workedOnMap.get(firstIncomplete.id) ?? [];

      const habit: Habit = {
        id: `quest_goal_${firstIncomplete.id}`,
        name: firstIncomplete.name,
        icon: firstIncomplete.icon,
        frequency: 'Daily',
        selectedDays: [],
        selectedTimeOfDay: 'Anytime',
        startDate: '2020-01-01',
        rewardPoints: 0,
        completionHistory: workedOnDates,  // "worked on it today" dates
        increment: false,
        incrementAmount: 0,
        incrementHistory: {},

        // snooze / skip
        snoozedUntil: firstIncomplete.snoozed_until ?? undefined,
        snoozedFrom: firstIncomplete.snoozed_from ?? undefined,
        skippedDates: firstIncomplete.skipped_dates ?? [],

        // quest-specific fields
        isQuestGoal: true,
        questGoalId: firstIncomplete.id,
        questName: quest?.name ?? 'Quest',
        questId: quest?.id,
        questSubtasks: subtasks,
      };

      habits.push(habit);
    }

    return habits;
  } catch (err) {
    console.error('Error loading quest goals as habits:', err);
    return [];
  }
}

// ─── WORKED ON IT TODAY (toggle) ─────────────────────────────────────────

export async function toggleQuestGoalWorkedOn(
  questGoalId: string,
  dateStr: string,
  isCurrentlyWorkedOn: boolean,
): Promise<void> {
  if (isCurrentlyWorkedOn) {
    await supabase
      .from('quest_goal_completions')
      .delete()
      .eq('goal_id', questGoalId)
      .eq('date', dateStr);
  } else {
    await supabase
      .from('quest_goal_completions')
      .upsert({
        goal_id: questGoalId,
        date: dateStr,
      }, { onConflict: 'goal_id,date' });
  }
}

// ─── SNOOZE ──────────────────────────────────────────────────────────────

export async function snoozeQuestGoal(
  questGoalId: string,
  snoozedUntil: string | null,
  snoozedFrom?: string | null,
): Promise<void> {
  await supabase
    .from('quest_goals')
    .update({
      snoozed_until: snoozedUntil,
      snoozed_from: snoozedFrom ?? null,
    })
    .eq('id', questGoalId);
}

// ─── SKIP ────────────────────────────────────────────────────────────────

export async function skipQuestGoal(
  questGoalId: string,
  dateStr: string,
): Promise<void> {
  const { data } = await supabase
    .from('quest_goals')
    .select('skipped_dates')
    .eq('id', questGoalId)
    .single();

  const current: string[] = data?.skipped_dates ?? [];
  if (current.includes(dateStr)) return;

  await supabase
    .from('quest_goals')
    .update({ skipped_dates: [...current, dateStr] })
    .eq('id', questGoalId);
}

// ─── SUBTASK TOGGLE ──────────────────────────────────────────────────────

export async function toggleQuestSubtaskCompletion(
  subtaskId: string,
  completed: boolean,
): Promise<void> {
  await supabase
    .from('quest_subtasks')
    .update({ completed })
    .eq('id', subtaskId);
}
