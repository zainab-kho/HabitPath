// @/app/(tabs)/quests/[id].tsx
// Quest detail: header (Main/Side badge), phases (pager) or a flat list, and the
// quest's goals — real habits + one-time tasks. "+ Add goal" opens the habit
// creator in quest mode (New Goal); tapping a goal toggles today's completion.
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { loadHabitsByQuest, toggleHabitCompletion } from '@/lib/supabase/queries/habit';
import { addPhase, getQuest } from '@/lib/supabase/queries/quests';
import { Habit } from '@/types/Habit';
import { Quest, QuestPhase } from '@/types/Quest';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { formatDisplayDate, formatLocalDate } from '@/utils/dateUtils';

const isTask = (h: Habit) => !h.frequency || h.frequency === 'None';

export default function QuestDetailPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();

    const [quest, setQuest] = useState<Quest | null>(null);
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [phaseIndex, setPhaseIndex] = useState(0);

    const load = useCallback(async () => {
        if (!user || !id) return;
        try {
            const [q, hs] = await Promise.all([getQuest(id, user.id), loadHabitsByQuest(id, user.id)]);
            setQuest(q);
            setHabits(hs);
            if (q) setPhaseIndex(idx => Math.min(idx, Math.max(0, (q.phases?.length ?? 1) - 1)));
        } catch (err) {
            console.error('Error loading quest:', err);
        } finally {
            setLoading(false);
        }
    }, [user, id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const phases = quest?.phases ?? [];
    const phase: QuestPhase | undefined = quest?.hasPhases ? phases[phaseIndex] : undefined;

    // items for the current phase: its own items + carried-forward habits from earlier phases
    const itemsForPhase = (phaseId: string | null): Habit[] => {
        const own = habits.filter(h => h.phaseId === phaseId);
        const carried = habits.filter(h =>
            h.questScope === 'carry' && h.phaseId && h.phaseId !== phaseId &&
            phases.findIndex(p => p.id === h.phaseId) < phaseIndex
        );
        return [...own, ...carried];
    };
    const items = quest?.hasPhases ? itemsForPhase(phase?.id ?? null) : habits;
    // habits and one-time tasks are all "goals" — one unified list
    const goals = items;
    const todayStr = formatLocalDate(new Date());

    // "+ Add goal" opens the habit creator in quest mode (New Goal); the scope
    // (end with phase / carry / keep) is chosen there
    const addGoal = (phaseId: string | null) => {
        if (!quest) return;
        router.push({
            pathname: '/(tabs)/habits/NewHabitPage',
            params: {
                questId: quest.id,
                phaseId: phaseId ?? '',
                phaseEndDate: phase?.endDate ?? '',
                questEndDate: quest.endDate ?? '',
            },
        } as any);
    };

    const toggleGoal = async (goal: Habit) => {
        if (!user) return;
        const today = formatLocalDate(new Date());
        try {
            setHabits(await toggleHabitCompletion(goal.id, habits, today, 4, 0, user.id));
        } catch (err) {
            console.error('Error toggling goal:', err);
        }
    };

    const confirmDelete = () => {
        Alert.alert('Delete quest?', 'This removes the quest and its habits/tasks.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    if (!user || !quest) return;
                    const { deleteQuest } = await import('@/lib/supabase/queries/quests');
                    await deleteQuest(quest.id, user.id);
                    router.back();
                },
            },
        ]);
    };

    const createPhase = async () => {
        if (!quest) return;
        await addPhase(quest.id, { name: `Phase ${phases.length + 1}`, sortOrder: phases.length });
        load();
    };

    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer>
                    <PageHeader title="" showBackButton />
                    <View style={styles.center}><ActivityIndicator size="small" color={PAGE.quest.primary[0]} /></View>
                </PageContainer>
            </AppLinearGradient>
        );
    }
    if (!quest) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer>
                    <PageHeader title="" showBackButton />
                    <View style={styles.center}><Text style={styles.hint}>Quest not found.</Text></View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer>
                <PageHeader title="" showBackButton />

                <ScrollView contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                    {/* header */}
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{quest.type === 'main' ? 'Main Quest' : 'Side Quest'}</Text>
                        </View>
                        {quest.endDate && (
                            <Text style={styles.meta}>by {formatDisplayDate(new Date(quest.endDate))}</Text>
                        )}
                    </View>
                    <Text style={styles.title}>{quest.name}</Text>

                    {/* phase pager */}
                    {quest.hasPhases && (
                        <View style={styles.pager}>
                            <Pressable disabled={phaseIndex === 0} onPress={() => setPhaseIndex(i => i - 1)} hitSlop={10}>
                                <Text style={[styles.arrow, phaseIndex === 0 && { opacity: 0.25 }]}>‹</Text>
                            </Pressable>
                            <Text style={styles.pagerLabel}>
                                {phases.length === 0 ? 'No phases yet' : `${phase?.name ?? ''} · ${phaseIndex + 1} of ${phases.length}`}
                            </Text>
                            <Pressable disabled={phaseIndex >= phases.length - 1} onPress={() => setPhaseIndex(i => i + 1)} hitSlop={10}>
                                <Text style={[styles.arrow, phaseIndex >= phases.length - 1 && { opacity: 0.25 }]}>›</Text>
                            </Pressable>
                        </View>
                    )}
                    {quest.hasPhases && phase?.endDate && (
                        <Text style={styles.phaseEnd}>Ends {formatDisplayDate(new Date(phase.endDate))}</Text>
                    )}

                    {/* goals — habits + one-time tasks, unified */}
                    {(!quest.hasPhases || phases.length > 0) && (
                        <>
                            {goals.length > 0 && <Text style={styles.section}>Goals</Text>}
                            {goals.map(g => {
                                const done = (g.completionHistory ?? []).includes(todayStr);
                                return (
                                    <Pressable key={g.id} onPress={() => toggleGoal(g)}>
                                        <ShadowBox style={styles.itemWrap} contentBackgroundColor="#fff" contentBorderRadius={14}>
                                            <View style={styles.item}>
                                                <View style={[styles.check, done && styles.checkDone]}>
                                                    {done && <Text style={styles.checkMark}>✓</Text>}
                                                </View>
                                                <Text style={styles.itemIcon}>{g.icon || '✦'}</Text>
                                                <Text style={[styles.itemName, done && styles.itemDone]} numberOfLines={1}>{g.name}</Text>
                                                <Text style={styles.freq}>{isTask(g) ? 'Task' : g.frequency}</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                            {goals.length === 0 && <Text style={styles.emptyGoals}>No goals yet.</Text>}

                            {/* add goal */}
                            <Pressable style={styles.addBtn} onPress={() => addGoal(phase?.id ?? null)}>
                                <Text style={styles.addText}>+ Add goal</Text>
                            </Pressable>
                        </>
                    )}

                    {/* add phase */}
                    {quest.hasPhases && (
                        <Pressable style={styles.addPhaseBtn} onPress={createPhase}>
                            <Text style={styles.addPhaseText}>+ Add phase</Text>
                        </Pressable>
                    )}

                    {/* delete */}
                    <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                        <Text style={styles.deleteText}>Delete quest</Text>
                    </Pressable>
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    hint: { fontFamily: 'p3', fontSize: 14, opacity: 0.6 },
    title: { fontFamily: 'p1', fontSize: 24, marginBottom: 16 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 10 },
    badge: { backgroundColor: PAGE.quest.primary[0], paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontFamily: 'p1', fontSize: 12, color: '#fff' },
    meta: { fontFamily: 'p2', fontSize: 13, opacity: 0.7 },
    emptyGoals: { fontFamily: 'p3', fontSize: 13, opacity: 0.5, marginTop: 8, marginLeft: 4 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 6 },
    arrow: { fontSize: 26, fontFamily: 'p1' },
    pagerLabel: { fontFamily: 'p1', fontSize: 15 },
    phaseEnd: { fontFamily: 'p3', fontSize: 12, opacity: 0.6, textAlign: 'center', marginBottom: 10 },
    section: { fontFamily: 'p1', fontSize: 13, opacity: 0.55, marginTop: 16, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
    itemWrap: { marginBottom: 10 },
    item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    itemIcon: { fontSize: 18 },
    itemName: { flex: 1, fontFamily: 'p2', fontSize: 15 },
    itemDone: { textDecorationLine: 'line-through', opacity: 0.5 },
    freq: { fontFamily: 'p3', fontSize: 12, opacity: 0.6 },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: PAGE.quest.primary[0], alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: PAGE.quest.primary[0] },
    checkMark: { color: '#fff', fontSize: 13, fontFamily: 'p1' },
    addBtn: { marginTop: 14, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: PAGE.quest.primary[0] },
    addText: { fontFamily: 'p1', fontSize: 14, color: '#000' },
    addPhaseBtn: { marginTop: 20, backgroundColor: PAGE.quest.primary[1], borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
    addPhaseText: { fontFamily: 'p1', fontSize: 14 },
    deleteBtn: { marginTop: 30, alignItems: 'center', paddingVertical: 10 },
    deleteText: { fontFamily: 'p2', fontSize: 14, color: '#FF7A7A' },
});
