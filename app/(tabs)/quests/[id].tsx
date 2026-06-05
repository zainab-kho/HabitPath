import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Image, Pressable, ScrollView,
    StyleSheet, Text, View,
} from 'react-native';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { globalStyles, uiStyles } from '@/styles';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { getIconFile } from '@/components/habits/iconUtils';
import { useQuestCreation } from '@/contexts/QuestCreationContext';

// ─── types ───────────────────────────────────────────────────────────────────

interface Subtask {
    id: string;
    name: string;
    completed: boolean;
    sort_order: number;
}

interface Goal {
    id: string;
    name: string;
    icon: string;
    type: string;
    target_count: number | null;
    completed: boolean;
    week_id: string | null;
    sort_order: number;
    quest_subtasks: Subtask[];
}

interface Week {
    id: string;
    label: string;
    sort_order: number;
}

interface Phase {
    id: string;
    name: string;
    end_date: string | null;
    sort_order: number;
    quest_goals: Goal[];
    quest_weeks: (Week & { quest_goals: Goal[] })[];
}

interface Quest {
    id: string;
    name: string;
    type: string;
    end_date: string | null;
    has_phases: boolean;
    quest_phases: Phase[];
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function QuestDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();

    const [quest, setQuest] = useState<Quest | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
    const [showMenu, setShowMenu] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const {
        setDetailPhaseId,
        setDetailWeekId,
        setEditingGoal,
        setOnDetailGoalSaved,
    } = useQuestCreation();

    const loadQuest = useCallback(async () => {
        if (!user || !id) return;
        try {
            const { data, error } = await supabase
                .from('quests')
                .select(`
                    id, name, type, end_date, has_phases,
                    quest_phases ( id, name, end_date, sort_order,
                        quest_goals ( id, name, icon, type, target_count, completed, week_id, sort_order,
                            quest_subtasks ( id, name, completed, sort_order )
                        ),
                        quest_weeks ( id, label, sort_order,
                            quest_goals:quest_goals ( id, name, icon, type, target_count, completed, week_id, sort_order,
                                quest_subtasks:quest_subtasks ( id, name, completed, sort_order )
                            )
                        )
                    )
                `)
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error || !data) {
                router.back();
                return;
            }

            // sort phases, goals, weeks, subtasks
            const q = data as unknown as Quest;
            q.quest_phases.sort((a, b) => a.sort_order - b.sort_order);
            for (const phase of q.quest_phases) {
                phase.quest_goals.sort((a, b) => a.sort_order - b.sort_order);
                phase.quest_weeks.sort((a, b) => a.sort_order - b.sort_order);
                for (const goal of phase.quest_goals) {
                    goal.quest_subtasks.sort((a, b) => a.sort_order - b.sort_order);
                }
                for (const week of phase.quest_weeks) {
                    week.quest_goals.sort((a, b) => a.sort_order - b.sort_order);
                    for (const goal of week.quest_goals) {
                        goal.quest_subtasks.sort((a, b) => a.sort_order - b.sort_order);
                    }
                }
            }

            setQuest(q);
        } catch (err) {
            console.error('Error loading quest:', err);
        } finally {
            setLoading(false);
        }
    }, [user, id]);

    useEffect(() => { loadQuest(); }, [loadQuest]);

    const toggleGoalCompleted = async (goalId: string, current: boolean) => {
        await supabase.from('quest_goals').update({ completed: !current }).eq('id', goalId);
        loadQuest();
    };

    const toggleSubtaskCompleted = async (subtaskId: string, current: boolean) => {
        await supabase.from('quest_subtasks').update({ completed: !current }).eq('id', subtaskId);
        loadQuest();
    };

    const toggleGoalExpanded = (goalId: string) => {
        setExpandedGoals(prev => {
            const next = new Set(prev);
            if (next.has(goalId)) next.delete(goalId);
            else next.add(goalId);
            return next;
        });
    };

    const handleRemoveGoal = async (goalId: string) => {
        await supabase.from('quest_goals').delete().eq('id', goalId);
        loadQuest();
    };

    const navigateToAddGoal = (phaseId: string, weekId: string | null) => {
        setEditingGoal(null);
        setDetailPhaseId(phaseId);
        setDetailWeekId(weekId);
        setOnDetailGoalSaved(() => loadQuest);
        router.push('/(tabs)/quests/AddGoal');
    };

    const handleDeleteQuest = () => {
        Alert.alert('Delete Quest', 'This will permanently delete this quest and all its data.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await supabase.from('quests').delete().eq('id', id);
                    router.back();
                },
            },
        ]);
    };

    // ── loading ──
    if (loading || !quest) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="" showBackButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    // ── stats ──
    const allGoals = quest.quest_phases.flatMap(p => [
        ...p.quest_goals,
        ...p.quest_weeks.flatMap(w => w.quest_goals),
    ]);
    const allSubtasks = allGoals.flatMap(g => g.quest_subtasks);
    const totalItems = allGoals.length + allSubtasks.length;
    const completedItems = allGoals.filter(g => g.completed).length + allSubtasks.filter(s => s.completed).length;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const phase = quest.quest_phases[currentPhaseIndex];
    const phaseCount = quest.quest_phases.length;

    // ── render ──
    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer showBottomNav>
                <PageHeader title={quest.name} showBackButton />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>

                    {/* overall progress */}
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ borderRadius: 20, backgroundColor: '#fff', borderWidth: 1 }}>
                            <View style={{
                                height: 30,
                                borderRadius: 20,
                                overflow: 'hidden',
                                backgroundColor: '#fff',
                                position: 'relative',
                            }}>
                                {progressPercent > 0 && (
                                    <View style={{
                                        position: 'absolute', top: 0, left: 0, bottom: 0,
                                        width: `${progressPercent}%`,
                                        backgroundColor: progressPercent >= 100 ? '#54d697' : PAGE.quest.primary[0],
                                        zIndex: 2,
                                    }} />
                                )}
                                <View style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    justifyContent: 'center', alignItems: 'center', zIndex: 3,
                                }}>
                                    <Text style={{ fontSize: 12, fontFamily: 'label', fontWeight: '600' }}>
                                        {progressPercent}%  ·  {completedItems}/{totalItems} tasks
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* phase navigation (if has phases) */}
                    {quest.has_phases && phaseCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                                {currentPhaseIndex > 0 && (
                                    <Pressable onPress={() => setCurrentPhaseIndex(currentPhaseIndex - 1)}>
                                        <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 22, height: 22 }} />
                                    </Pressable>
                                )}
                            </View>
                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={globalStyles.label}>
                                    PHASE {currentPhaseIndex + 1} OF {phaseCount}
                                </Text>
                                <Text style={[globalStyles.body, { marginTop: 2 }]}>{phase?.name}</Text>
                            </View>
                            <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                                {currentPhaseIndex < phaseCount - 1 && (
                                    <Pressable onPress={() => setCurrentPhaseIndex(currentPhaseIndex + 1)}>
                                        <Image source={SYSTEM_ICONS.sortRight} style={{ width: 22, height: 22 }} />
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    )}

                    {/* phase content */}
                    {phase && (
                        <View style={{ gap: 12 }}>
                            {/* phase-level goals */}
                            {phase.quest_goals.length > 0 && (
                                <View>
                                    <Text style={[globalStyles.label, { marginBottom: 8 }]}>GOALS</Text>
                                    {phase.quest_goals.map(goal => (
                                        <GoalCard
                                            key={goal.id}
                                            goal={goal}
                                            expanded={expandedGoals.has(goal.id)}
                                            editMode={editMode}
                                            onToggleExpand={() => toggleGoalExpanded(goal.id)}
                                            onToggleGoal={() => toggleGoalCompleted(goal.id, goal.completed)}
                                            onToggleSubtask={toggleSubtaskCompleted}
                                            onRemove={() => handleRemoveGoal(goal.id)}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* weeks */}
                            {phase.quest_weeks.map(week => (
                                <View key={week.id}>
                                    <Text style={[globalStyles.label, { marginBottom: 8 }]}>{week.label.toUpperCase()}</Text>
                                    {week.quest_goals.length === 0 ? (
                                        <Text style={[globalStyles.body2, { opacity: 0.4, marginBottom: 8 }]}>
                                            No goals this week
                                        </Text>
                                    ) : (
                                        week.quest_goals.map(goal => (
                                            <GoalCard
                                                key={goal.id}
                                                goal={goal}
                                                expanded={expandedGoals.has(goal.id)}
                                                onToggleExpand={() => toggleGoalExpanded(goal.id)}
                                                onToggleGoal={() => toggleGoalCompleted(goal.id, goal.completed)}
                                                onToggleSubtask={toggleSubtaskCompleted}
                                            />
                                        ))
                                    )}
                                    {/* add goal to week */}
                                    <Pressable
                                        onPress={() => navigateToAddGoal(phase.id, week.id)}
                                        style={{ marginTop: 4, marginBottom: 8 }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={PAGE.quest.primary[1]}
                                            shadowBorderRadius={20}
                                            style={{ width: '100%' }}
                                        >
                                            <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 5 }}>
                                                <Text style={globalStyles.body}>+</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}

                </ScrollView>

                {/* floating menu overlay */}
                {showMenu && (
                    <Pressable
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                        onPress={() => setShowMenu(false)}
                    >
                        <Pressable
                            style={{
                                position: 'absolute',
                                bottom: 60,
                                right: 50,
                                backgroundColor: '#fff',
                                borderRadius: 20,
                                borderWidth: 1,
                                borderColor: '#000',
                                padding: 15,
                                gap: 12,
                                minWidth: 180,
                                shadowColor: '#000',
                                shadowOffset: { width: 1, height: 1 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {phase && (
                                <Pressable onPress={() => {
                                    setShowMenu(false);
                                    navigateToAddGoal(phase.id, null);
                                }}>
                                    <View style={{ padding: 5, borderBottomWidth: 1 }}>
                                        <Text style={globalStyles.body}>Add Goal</Text>
                                    </View>
                                </Pressable>
                            )}

                            <Pressable onPress={() => {
                                setShowMenu(false);
                                setEditMode(!editMode);
                            }}>
                                <View style={{ padding: 5, borderBottomWidth: 1 }}>
                                    <Text style={globalStyles.body}>{editMode ? 'Done Editing' : 'Edit'}</Text>
                                </View>
                            </Pressable>

                            <Pressable onPress={() => {
                                setShowMenu(false);
                                handleDeleteQuest();
                            }}>
                                <View style={{ padding: 5 }}>
                                    <Text style={[globalStyles.body, { color: '#e74c3c' }]}>Delete Quest</Text>
                                </View>
                            </Pressable>
                        </Pressable>
                    </Pressable>
                )}

                {/* floating buttons */}
                <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable onPress={() => setShowMenu(!showMenu)}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.quest.primary[1]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                            >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.more} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>

                        {phase && (
                            <Pressable onPress={() => navigateToAddGoal(phase.id, null)}>
                                <ShadowBox
                                    contentBackgroundColor={PAGE.quest.primary[0]}
                                    contentBorderRadius={30}
                                    shadowBorderRadius={30}
                                >
                                    <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 20, textAlign: 'center' }}>+</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        )}
                    </View>
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}

// ─── goal card component ─────────────────────────────────────────────────────

function GoalCard({
    goal,
    expanded,
    editMode,
    onToggleExpand,
    onToggleGoal,
    onToggleSubtask,
    onRemove,
}: {
    goal: Goal;
    expanded: boolean;
    editMode?: boolean;
    onToggleExpand: () => void;
    onToggleGoal: () => void;
    onToggleSubtask: (id: string, current: boolean) => void;
    onRemove?: () => void;
}) {
    const hasSubtasks = goal.quest_subtasks.length > 0;
    const completedSubtasks = goal.quest_subtasks.filter(s => s.completed).length;

    return (
        <View style={{ marginBottom: 12 }}>
            <ShadowBox
                contentBackgroundColor={goal.completed ? PAGE.quest.primary[0] : '#fff'}
                contentBorderColor="#000"
                contentBorderWidth={1}
                shadowBorderRadius={15}
                shadowOffset={goal.completed ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                shadowColor={goal.completed ? '#000' : PAGE.quest.primary[0]}
            >
                <View style={{ padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>

                        {/* icon */}
                        <View style={{ width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' }}>
                            <Image source={getIconFile(goal.icon)} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
                        </View>

                        {/* name + subtask count */}
                        <View style={{ flex: 1 }}>
                            <Text
                                style={[
                                    globalStyles.body,
                                    { fontSize: 15 },
                                    goal.completed && { textDecorationLine: 'line-through', opacity: 0.6 },
                                ]}
                                numberOfLines={1}
                            >
                                {goal.name}
                            </Text>
                            {hasSubtasks && (
                                <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.5, marginTop: 2 }]}>
                                    {completedSubtasks}/{goal.quest_subtasks.length} subtasks
                                </Text>
                            )}
                        </View>

                        {/* expand arrow or weekly goal badge */}
                        {goal.type === 'increment' && goal.target_count && (
                            <View style={[uiStyles.badge, { backgroundColor: PAGE.quest.primary[1], borderColor: PAGE.quest.primary[0] }]}>
                                <Image source={SYSTEM_ICONS.star} style={[uiStyles.badgeIcon, { tintColor: PAGE.quest.primary[0] }]} />
                                <Text style={uiStyles.badgeText}>{goal.target_count}/wk</Text>
                            </View>
                        )}

                        {hasSubtasks && !editMode && (
                            <Pressable onPress={onToggleExpand}>
                                <Image
                                    source={expanded ? SYSTEM_ICONS.sort : SYSTEM_ICONS.sortRight}
                                    style={{ width: 16, height: 16, opacity: 0.4 }}
                                />
                            </Pressable>
                        )}

                        {/* checkbox */}
                        <Pressable onPress={onToggleGoal}>
                            <ShadowBox
                                shadowBorderRadius={8}
                                contentBorderRadius={8}
                                contentBorderColor="#000"
                                shadowColor={goal.completed ? '#000' : PAGE.quest.primary[0]}
                                shadowOffset={{ x: 2, y: 2 }}
                                contentBackgroundColor={goal.completed ? PAGE.quest.primary[0] : '#fff'}
                            >
                                <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                                    {goal.completed && (
                                        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>✓</Text>
                                    )}
                                </View>
                            </ShadowBox>
                        </Pressable>

                        {editMode && onRemove && (
                            <Pressable onPress={onRemove}>
                                <View style={{
                                    backgroundColor: BUTTON_COLORS.Delete,
                                    borderWidth: 1,
                                    borderRadius: 12,
                                    width: 25,
                                    height: 25,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <Image source={SYSTEM_ICONS.delete} style={{ width: 12, height: 12 }} />
                                </View>
                            </Pressable>
                        )}
                    </View>

                    {/* subtasks (expanded) */}
                    {hasSubtasks && expanded && !editMode && (
                        <View style={{ marginTop: 10, paddingLeft: 52, gap: 8 }}>
                            {goal.quest_subtasks.map(st => (
                                <Pressable key={st.id} onPress={() => onToggleSubtask(st.id, st.completed)}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ShadowBox
                                            contentBorderRadius={0}
                                            shadowBorderRadius={0}
                                            shadowColor={st.completed ? '#000' : PAGE.quest.primary[1]}
                                            shadowOffset={{ x: 2, y: 2 }}
                                            contentBackgroundColor={st.completed ? PAGE.quest.primary[0] : '#fff'}
                                            contentBorderColor="#000"
                                            contentBorderWidth={1}
                                        >
                                            <View style={{ height: 14, width: 14, justifyContent: 'center', alignItems: 'center' }}>
                                                {st.completed && (
                                                    <Text style={{ fontSize: 9, fontWeight: 'bold' }}>✓</Text>
                                                )}
                                            </View>
                                        </ShadowBox>
                                        <Text
                                            style={[
                                                globalStyles.body2,
                                                { fontSize: 13 },
                                                st.completed && { textDecorationLine: 'line-through', opacity: 0.5 },
                                            ]}
                                        >
                                            {st.name}
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            </ShadowBox>
        </View>
    );
}
