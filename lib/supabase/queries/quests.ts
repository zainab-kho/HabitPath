// @/lib/supabase/queries/quests.ts
// Quest + phase CRUD. A quest's actual content (habits & one-time tasks) lives in
// the `habits` table tagged with quest_id/phase_id — load those via loadHabitsByQuest.

import { supabase } from '@/lib/supabase';
import { Quest, QuestPhase, QuestType } from '@/types/Quest';

// ─── mappers ───────────────────────────────────────────────────────────────

const mapPhase = (row: any): QuestPhase => ({
    id: row.id,
    questId: row.quest_id,
    name: row.name ?? '',
    endDate: row.end_date ?? null,
    sortOrder: row.sort_order ?? 0,
    completedAt: row.completed_at ?? null,
});

const mapQuest = (row: any): Quest => ({
    id: row.id,
    userId: row.user_id,
    name: row.name ?? '',
    type: (row.type ?? 'main') as QuestType,
    hasPhases: row.has_phases ?? false,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    currentPhase: row.current_phase ?? 0,
    completedAt: row.completed_at ?? null,
    createdAt: row.created_at,
    phases: (row.quest_phases ?? [])
        .map(mapPhase)
        .sort((a: QuestPhase, b: QuestPhase) => a.sortOrder - b.sortOrder),
});

// ─── quests ────────────────────────────────────────────────────────────────

export async function loadQuests(userId: string): Promise<Quest[]> {
    const { data, error } = await supabase
        .from('quests')
        .select('*, quest_phases(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapQuest);
}

export async function getQuest(questId: string, userId: string): Promise<Quest | null> {
    const { data, error } = await supabase
        .from('quests')
        .select('*, quest_phases(*)')
        .eq('id', questId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) throw error;
    return data ? mapQuest(data) : null;
}

export async function createQuest(
    userId: string,
    fields: {
        name: string;
        type?: QuestType;
        hasPhases?: boolean;
        startDate?: string | null;
        endDate?: string | null;
    },
): Promise<Quest> {
    const { data, error } = await supabase
        .from('quests')
        .insert({
            user_id: userId,
            name: fields.name,
            type: fields.type ?? 'main',
            has_phases: fields.hasPhases ?? false,
            start_date: fields.startDate ?? new Date().toISOString().slice(0, 10),
            end_date: fields.endDate ?? null,
            current_phase: 0,
        })
        .select('*, quest_phases(*)')
        .single();

    if (error) throw error;
    return mapQuest(data);
}

export async function updateQuest(
    questId: string,
    userId: string,
    fields: Partial<{
        name: string;
        type: QuestType;
        endDate: string | null;
        currentPhase: number;
        completedAt: string | null;
    }>,
): Promise<void> {
    const patch: Record<string, any> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.type !== undefined) patch.type = fields.type;
    if (fields.endDate !== undefined) patch.end_date = fields.endDate;
    if (fields.currentPhase !== undefined) patch.current_phase = fields.currentPhase;
    if (fields.completedAt !== undefined) patch.completed_at = fields.completedAt;

    const { error } = await supabase
        .from('quests')
        .update(patch)
        .eq('id', questId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function deleteQuest(questId: string, userId: string): Promise<void> {
    // habits.quest_id has ON DELETE CASCADE, so tagged habits go with it
    const { error } = await supabase
        .from('quests')
        .delete()
        .eq('id', questId)
        .eq('user_id', userId);
    if (error) throw error;
}

// ─── phases ────────────────────────────────────────────────────────────────

export async function addPhase(
    questId: string,
    fields: { name: string; endDate?: string | null; sortOrder: number },
): Promise<QuestPhase> {
    const { data, error } = await supabase
        .from('quest_phases')
        .insert({
            quest_id: questId,
            name: fields.name,
            end_date: fields.endDate ?? null,
            sort_order: fields.sortOrder,
        })
        .select()
        .single();

    if (error) throw error;
    return mapPhase(data);
}

export async function updatePhase(
    phaseId: string,
    fields: Partial<{ name: string; endDate: string | null; sortOrder: number; completedAt: string | null }>,
): Promise<void> {
    const patch: Record<string, any> = {};
    if (fields.name !== undefined) patch.name = fields.name;
    if (fields.endDate !== undefined) patch.end_date = fields.endDate;
    if (fields.sortOrder !== undefined) patch.sort_order = fields.sortOrder;
    if (fields.completedAt !== undefined) patch.completed_at = fields.completedAt;

    const { error } = await supabase.from('quest_phases').update(patch).eq('id', phaseId);
    if (error) throw error;
}

export async function deletePhase(phaseId: string): Promise<void> {
    const { error } = await supabase.from('quest_phases').delete().eq('id', phaseId);
    if (error) throw error;
}
