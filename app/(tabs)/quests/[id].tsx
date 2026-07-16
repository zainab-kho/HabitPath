// @/app/(tabs)/quests/[id].tsx
// Quest detail: header (Main/Side badge), phases (pager) or a flat list, and the
// quest's goals — real habits + one-time tasks. "+ Add goal" opens the habit
// creator in quest mode (New Goal); tapping a goal toggles today's completion.
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { PAGE } from '@/constants/colors';
import { HABIT_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { loadHabitsByQuest, setHabitPhase, toggleHabitCompletion } from '@/lib/supabase/queries/habit';
import { addPhase, getQuest } from '@/lib/supabase/queries/quests';
import AddPhaseModal from '@/modals/quests/AddPhaseModal';
import { globalStyles } from '@/styles';
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
    const [phaseModalOpen, setPhaseModalOpen] = useState(false);

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
    const phased = phases.length > 0; // emergent: a quest is phased once it has a phase
    const phase: QuestPhase | undefined = phased ? phases[phaseIndex] : undefined;
    const looseGoals = habits.filter(h => !h.phaseId);

    // items for the current phase: its own items + carried-forward habits from earlier phases
    const itemsForPhase = (phaseId: string | null): Habit[] => {
        const own = habits.filter(h => h.phaseId === phaseId);
        const carried = habits.filter(h =>
            h.questScope === 'carry' && h.phaseId && h.phaseId !== phaseId &&
            phases.findIndex(p => p.id === h.phaseId) < phaseIndex
        );
        return [...own, ...carried];
    };
    const goals = phased ? itemsForPhase(phase?.id ?? null) : habits;
    const unassigned = phased ? looseGoals : []; // loose goals still shown so they aren't lost
    const todayStr = formatLocalDate(new Date());

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
        try {
            setHabits(await toggleHabitCompletion(goal.id, habits, todayStr, 4, 0, user.id));
        } catch (err) {
            console.error('Error toggling goal:', err);
        }
    };

    const createPhaseWithGoals = async (name: string, goalIds: string[]) => {
        if (!quest || !user) return;
        setPhaseModalOpen(false);
        const newPhase = await addPhase(quest.id, { name, sortOrder: phases.length });
        await Promise.all(goalIds.map(gid => setHabitPhase(gid, user.id, newPhase.id, newPhase.endDate ?? null)));
        setPhaseIndex(phases.length); // jump to the new phase
        load();
    };

    const confirmDelete = () => {
        Alert.alert('Delete quest?', 'This removes the quest and its goals.', [
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

    const renderGoal = (g: Habit) => {
        const done = (g.completionHistory ?? []).includes(todayStr);
        const iconFile = g.icon ? HABIT_ICONS[g.icon] : null;
        return (
            <Pressable key={g.id} onPress={() => toggleGoal(g)} style={{ marginBottom: 10 }}>
                <ShadowBox
                    contentBackgroundColor="#fff"
                    contentBorderColor="#000"
                    contentBorderWidth={1}
                    shadowColor={PAGE.quest.primary[0]}
                    shadowBorderRadius={15}
                >
                    <View style={styles.item}>
                        <View style={[styles.check, done && styles.checkDone]}>
                            {done && <Text style={styles.checkMark}>✓</Text>}
                        </View>
                        {iconFile
                            ? <Image source={iconFile} style={styles.icon} />
                            : <Text style={{ fontSize: 22 }}>✦</Text>}
                        <Text style={[globalStyles.body, { flex: 1 }, done && styles.itemDone]} numberOfLines={1}>{g.name}</Text>
                        <View style={styles.freqBubble}>
                            <Text style={[globalStyles.label, { opacity: 1 }]}>{isTask(g) ? 'Task' : g.frequency}</Text>
                        </View>
                    </View>
                </ShadowBox>
            </Pressable>
        );
    };

    const pillButton = (label: string, onPress: () => void, filled?: boolean) => (
        <Pressable onPress={onPress} style={{ marginTop: 14 }}>
            <ShadowBox
                contentBackgroundColor={filled ? PAGE.quest.primary[1] : '#fff'}
                contentBorderColor={PAGE.quest.primary[0]}
                shadowColor={PAGE.quest.primary[0]}
                shadowBorderRadius={15}
            >
                <View style={{ paddingVertical: 11, alignItems: 'center' }}>
                    <Text style={globalStyles.body}>{label}</Text>
                </View>
            </ShadowBox>
        </Pressable>
    );

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
                    <View style={styles.center}><Text style={globalStyles.body}>Quest not found.</Text></View>
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
                        <ShadowBox
                            contentBackgroundColor={PAGE.quest.primary[0]}
                            contentBorderColor="#000"
                            shadowColor="#000"
                            shadowBorderRadius={12}
                        >
                            <View style={{ paddingHorizontal: 12, paddingVertical: 4 }}>
                                <Text style={[globalStyles.label, { color: '#fff', opacity: 1 }]}>
                                    {quest.type === 'main' ? 'MAIN QUEST' : 'SIDE QUEST'}
                                </Text>
                            </View>
                        </ShadowBox>
                        {quest.endDate && (
                            <Text style={[globalStyles.body2, { opacity: 0.7 }]}>by {formatDisplayDate(new Date(quest.endDate))}</Text>
                        )}
                    </View>
                    <Text style={[globalStyles.h1, { fontSize: 24, marginBottom: 16 }]}>{quest.name}</Text>

                    {/* phase pager */}
                    {phased && (
                        <ShadowBox contentBackgroundColor="#fff" shadowColor={PAGE.quest.primary[0]} shadowBorderRadius={16} style={{ marginBottom: phase?.endDate ? 4 : 8 }}>
                            <View style={styles.pager}>
                                <Pressable disabled={phaseIndex === 0} onPress={() => setPhaseIndex(i => i - 1)} hitSlop={12}>
                                    <Text style={[styles.arrow, phaseIndex === 0 && { opacity: 0.25 }]}>‹</Text>
                                </Pressable>
                                <Text style={globalStyles.h4}>{`${phase?.name ?? ''}  ·  ${phaseIndex + 1} of ${phases.length}`}</Text>
                                <Pressable disabled={phaseIndex >= phases.length - 1} onPress={() => setPhaseIndex(i => i + 1)} hitSlop={12}>
                                    <Text style={[styles.arrow, phaseIndex >= phases.length - 1 && { opacity: 0.25 }]}>›</Text>
                                </Pressable>
                            </View>
                        </ShadowBox>
                    )}
                    {phased && phase?.endDate && (
                        <Text style={[globalStyles.label, { textAlign: 'center', marginBottom: 10 }]}>
                            Ends {formatDisplayDate(new Date(phase.endDate))}
                        </Text>
                    )}

                    {/* goals — habits + one-time tasks, unified */}
                    {goals.length > 0 && <Text style={[globalStyles.label, styles.section]}>GOALS</Text>}
                    {goals.map(renderGoal)}
                    {goals.length === 0 && <Text style={[globalStyles.body2, { opacity: 0.5, marginLeft: 4 }]}>No goals yet.</Text>}

                    {pillButton('+ Add goal', () => addGoal(phase?.id ?? null))}

                    {/* loose goals not yet sorted into a phase */}
                    {phased && unassigned.length > 0 && (
                        <>
                            <Text style={[globalStyles.label, styles.section]}>NOT IN A PHASE</Text>
                            {unassigned.map(renderGoal)}
                        </>
                    )}

                    {/* add phase — Main quests only */}
                    {quest.type === 'main' && pillButton('+ Add phase', () => setPhaseModalOpen(true), true)}

                    {/* delete */}
                    <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
                        <Text style={[globalStyles.body2, { color: '#FF7A7A' }]}>Delete quest</Text>
                    </Pressable>
                </ScrollView>
            </PageContainer>

            <AddPhaseModal
                visible={phaseModalOpen}
                looseGoals={looseGoals}
                defaultName={`Phase ${phases.length + 1}`}
                onClose={() => setPhaseModalOpen(false)}
                onCreate={createPhaseWithGoals}
            />
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 12 },
    section: { marginTop: 18, marginBottom: 8, marginLeft: 4 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
    arrow: { fontSize: 26, fontFamily: 'p1' },
    item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    icon: { width: 30, height: 30, resizeMode: 'contain' },
    itemDone: { textDecorationLine: 'line-through', opacity: 0.5 },
    freqBubble: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: PAGE.quest.primary[0], backgroundColor: PAGE.quest.primary[1] },
    check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, borderColor: PAGE.quest.primary[0], alignItems: 'center', justifyContent: 'center' },
    checkDone: { backgroundColor: PAGE.quest.primary[0] },
    checkMark: { color: '#fff', fontSize: 13, fontFamily: 'p1' },
    deleteBtn: { marginTop: 30, alignItems: 'center', paddingVertical: 10 },
});
