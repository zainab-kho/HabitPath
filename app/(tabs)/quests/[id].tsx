// @/app/(tabs)/quests/[id].tsx
// Quest detail: header (Main/Side badge), phases (pager) or a flat list, and the
// quest's goals — real habits + one-time tasks. "+ Add goal" opens the habit
// creator in quest mode (New Goal); tapping a goal toggles today's completion.
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
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

    const qColor = PAGE.quest.primary[0];

    // matches the paths detail habit card: white card that fills with the page
    // color when done, icon left, name + frequency bubble stacked
    const renderGoal = (g: Habit) => {
        const done = (g.completionHistory ?? []).includes(todayStr);
        const iconFile = g.icon ? HABIT_ICONS[g.icon] : null;
        return (
            <Pressable key={g.id} onPress={() => toggleGoal(g)}>
                <ShadowBox
                    contentBackgroundColor={done ? qColor : '#fff'}
                    contentBorderColor="#000"
                    contentBorderWidth={1}
                    shadowBorderRadius={15}
                    shadowOffset={done ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                    shadowColor={done ? '#000' : qColor}
                    style={{ marginBottom: 12 }}
                >
                    <View style={styles.habitRow}>
                        <View style={styles.habitIconWrap}>
                            {iconFile
                                ? <Image source={iconFile} style={styles.habitIcon} />
                                : <Text style={{ fontSize: 24 }}>✦</Text>}
                        </View>
                        <View style={{ flex: 1, gap: 6 }}>
                            <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>{g.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.quest.background[1], borderColor: qColor }]}>
                                    <Text style={globalStyles.label}>{isTask(g) ? '1×' : `↻ ${g.frequency}`}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </ShadowBox>
            </Pressable>
        );
    };

    // small section-header chip, same as the paths page's Edit/Archived buttons
    const chip = (label: string, onPress: () => void, filled?: boolean) => (
        <Pressable onPress={onPress}>
            <ShadowBox
                contentBackgroundColor={filled ? qColor : BUTTON_COLORS.Cancel}
                shadowBorderRadius={15}
                shadowOffset={{ x: 0, y: 3 }}
            >
                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                    <Text style={globalStyles.body1}>{label}</Text>
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
                <PageHeader title={quest.name} showBackButton />

                <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
                    {/* main/side badge + end date */}
                    <View style={styles.badgeRow}>
                        <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.quest.background[1], borderColor: qColor }]}>
                            <Text style={globalStyles.label}>
                                {quest.type === 'main' ? 'MAIN QUEST' : 'SIDE QUEST'}
                            </Text>
                        </View>
                        {quest.endDate && (
                            <View style={[globalStyles.bubbleLabel, { backgroundColor: '#97AFB9', borderColor: qColor }]}>
                                <Text style={globalStyles.label}>by {formatDisplayDate(new Date(quest.endDate))}</Text>
                            </View>
                        )}
                    </View>

                    {/* phase pager */}
                    {phased && (
                        <ShadowBox
                            contentBackgroundColor="#fff"
                            contentBorderColor="#000"
                            contentBorderWidth={1}
                            shadowColor={qColor}
                            shadowBorderRadius={15}
                            shadowOffset={{ x: 0, y: 5 }}
                            style={{ marginBottom: phase?.endDate ? 6 : 16 }}
                        >
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
                        <Text style={[globalStyles.label, { textAlign: 'center', marginBottom: 12 }]}>
                            Ends {formatDisplayDate(new Date(phase.endDate))}
                        </Text>
                    )}

                    {/* goals — habits + one-time tasks, unified */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionLabel}>Goals</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {quest.type === 'main' && chip('Add phase', () => setPhaseModalOpen(true))}
                            {chip('Add goal', () => addGoal(phase?.id ?? null), true)}
                        </View>
                    </View>
                    {goals.length === 0 ? (
                        <ShadowBox
                            contentBackgroundColor="#fff"
                            shadowBorderRadius={15}
                            shadowOffset={{ x: 0, y: 5 }}
                            shadowColor={qColor}
                            style={{ marginBottom: 12 }}
                        >
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                                    No goals yet — tap Add goal to get started
                                </Text>
                            </View>
                        </ShadowBox>
                    ) : goals.map(renderGoal)}

                    {/* loose goals not yet sorted into a phase */}
                    {phased && unassigned.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                                <Text style={styles.sectionLabel}>Not in a phase</Text>
                            </View>
                            {unassigned.map(renderGoal)}
                        </>
                    )}

                    {/* delete — same action-row style as the paths page */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20 }}>
                        <Pressable onPress={confirmDelete} style={{ flex: 1, maxWidth: 100 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={20}>
                                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Delete</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
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

// mirrors the paths detail page styles so quest and path detail read as siblings
const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
    arrow: { fontSize: 26, fontFamily: 'p1' },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionLabel: {
        fontFamily: 'label',
        fontSize: 12,
        fontWeight: '600' as const,
        textTransform: 'uppercase' as const,
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    habitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        padding: 12,
    },
    habitIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    habitIcon: {
        width: 40,
        height: 40,
        resizeMode: 'contain' as const,
    },
});
