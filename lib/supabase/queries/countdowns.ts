// @/lib/supabase/queries/countdowns.ts
import { supabase } from '@/lib/supabase';
import { Countdown } from '@/types/Countdown';

// everything the new / edit countdown page can change
export type CountdownFields = Pick<
    Countdown,
    'title' | 'targetAt' | 'hasTime' | 'color' | 'showProgress' | 'remindMe' | 'reminderTime'
>;

// ─── mappers ─────────────────────────────────────────────────────────────────

// database row -> app shape
const mapCountdown = (row: any): Countdown => ({
    id: row.id,
    userId: row.user_id,
    title: row.title ?? '',
    targetAt: row.target_at,
    hasTime: row.has_time ?? false,
    color: row.color ?? null,
    showProgress: row.show_progress ?? true,
    remindMe: row.remind_me ?? false,
    reminderTime: row.reminder_time ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

// app shape -> database columns
const toRow = (fields: CountdownFields) => ({
    title: fields.title,
    target_at: fields.targetAt,
    has_time: fields.hasTime,
    color: fields.color,
    show_progress: fields.showProgress,
    remind_me: fields.remindMe,
    // no point keeping a reminder time around when reminders are off
    reminder_time: fields.remindMe ? fields.reminderTime : null,
});

// ─── queries ─────────────────────────────────────────────────────────────────

// soonest first
export async function loadCountdowns(userId: string): Promise<Countdown[]> {
    const { data, error } = await supabase
        .from('countdowns')
        .select('*')
        .eq('user_id', userId)
        .order('target_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapCountdown);
}

export async function createCountdown(userId: string, fields: CountdownFields): Promise<Countdown> {
    const { data, error } = await supabase
        .from('countdowns')
        .insert({ user_id: userId, ...toRow(fields) })
        .select()
        .single();

    if (error) throw error;
    return mapCountdown(data);
}

export async function updateCountdown(
    countdownId: string,
    userId: string,
    fields: CountdownFields
): Promise<void> {
    const { error } = await supabase
        .from('countdowns')
        .update({ ...toRow(fields), updated_at: new Date().toISOString() })
        .eq('id', countdownId)
        .eq('user_id', userId);

    if (error) throw error;
}

export async function deleteCountdown(countdownId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('countdowns')
        .delete()
        .eq('id', countdownId)
        .eq('user_id', userId);

    if (error) throw error;
}
