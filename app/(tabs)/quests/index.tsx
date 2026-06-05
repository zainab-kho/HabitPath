import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { supabase } from '@/lib/supabase';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { globalStyles } from '@/styles';

import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { getIconFile } from '@/components/habits/iconUtils';
import { uiStyles } from '@/styles';

interface GoalPreview {
    name: string;
    icon: string;
}

interface QuestRow {
    id: string;
    name: string;
    type: string;
    end_date: string | null;
    has_phases: boolean;
    week_start_day: number;
    created_at: string;
    phase_count: number;
    goal_count: number;
    subtask_count: number;
    completed_goal_count: number;
    completed_subtask_count: number;
    goals: GoalPreview[];
}

export default function Quests() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [quests, setQuests] = useState<QuestRow[]>([]);
    const hasLoadedOnce = useRef(false);

    const loadQuests = useCallback(async (showLoader = true) => {
        if (!user) return;
        if (showLoader) setLoading(true);

        try {
            // fetch quests with counts via a single query
            const { data, error } = await supabase
                .from('quests')
                .select(`
                    id, name, type, end_date, has_phases, week_start_day, created_at,
                    quest_phases ( id,
                        quest_goals ( id, name, icon,
                            quest_subtasks ( id )
                        ),
                        quest_weeks ( id,
                            quest_goals:quest_goals ( id, name, icon,
                                quest_subtasks:quest_subtasks ( id )
                            )
                        )
                    )
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const rows: QuestRow[] = (data ?? []).map((q: any) => {
                const phases = q.quest_phases ?? [];
                let goalCount = 0;
                let subtaskCount = 0;
                const allGoals: GoalPreview[] = [];

                for (const phase of phases) {
                    const phaseGoals = phase.quest_goals ?? [];
                    goalCount += phaseGoals.length;
                    for (const g of phaseGoals) {
                        subtaskCount += (g.quest_subtasks ?? []).length;
                        allGoals.push({ name: g.name, icon: g.icon });
                    }
                    for (const week of (phase.quest_weeks ?? [])) {
                        const weekGoals = week.quest_goals ?? [];
                        goalCount += weekGoals.length;
                        for (const g of weekGoals) {
                            subtaskCount += (g.quest_subtasks ?? []).length;
                            allGoals.push({ name: g.name, icon: g.icon });
                        }
                    }
                }

                return {
                    id: q.id,
                    name: q.name,
                    type: q.type,
                    end_date: q.end_date,
                    has_phases: q.has_phases,
                    week_start_day: q.week_start_day,
                    created_at: q.created_at,
                    phase_count: phases.length,
                    goal_count: goalCount,
                    subtask_count: subtaskCount,
                    completed_goal_count: 0,
                    completed_subtask_count: 0,
                    goals: allGoals,
                };
            });

            setQuests(rows);
        } catch (err) {
            console.error('Error loading quests:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            const isFirst = !hasLoadedOnce.current;
            hasLoadedOnce.current = true;
            loadQuests(isFirst);
        }, [loadQuests])
    );

    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" showPlusButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    if (quests.length === 0) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" showPlusButton />
                    <EmptyStateView
                        icon={SYSTEM_ICONS.quest}
                        title="No quests yet"
                        description="Quests help you work toward bigger goals using habits, tasks, and milestones, while earning points and tracking real progress."
                        buttonText="Start a quest"
                        buttonAction={() => router.push('/(tabs)/quests/NewQuestPage')}
                        buttonColor={PAGE.quest.primary[0]}
                    />
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer showBottomNav>
                <PageHeader title="Quests" showPlusButton />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                    {quests.map((quest) => (
                        <QuestCard key={quest.id} quest={quest} onPress={() => router.push(`/(tabs)/quests/${quest.id}`)} />
                    ))}
                </ScrollView>

                {/* floating add button */}
                <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
                    <Pressable onPress={() => router.push('/(tabs)/quests/NewQuestPage')}>
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
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}

function QuestCard({ quest, onPress }: { quest: QuestRow; onPress: () => void }) {
    const totalItems = quest.goal_count + quest.subtask_count;
    const completedItems = quest.completed_goal_count + quest.completed_subtask_count;
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    const endDateLabel = quest.end_date
        ? new Date(quest.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;

    const previewGoals = quest.goals.slice(0, 3);
    const remainingGoals = quest.goals.length - previewGoals.length;

    return (
        <Pressable onPress={onPress}>
            <ShadowBox
                contentBorderRadius={20}
                contentBorderColor="#000"
                contentBorderWidth={1}
                shadowColor={PAGE.quest.primary[0]}
                shadowBorderRadius={25}
                shadowOffset={{ x: 0, y: 5 }}
                style={{ marginBottom: 16 }}
            >
                <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, gap: 14 }}>
                    {/* header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={globalStyles.h4} numberOfLines={1}>{quest.name}</Text>
                        </View>
                        <ShadowBox
                            contentBackgroundColor={quest.type === 'main' ? PAGE.quest.primary[0] : PAGE.quest.primary[1]}
                            contentBorderColor={PAGE.quest.primary[0]}
                            shadowColor={PAGE.quest.primary[0]}
                            shadowOffset={{ x: 1, y: 1 }}
                        >
                            <View style={{ paddingHorizontal: 10, paddingVertical: 2 }}>
                                <Text style={[uiStyles.badgeText]}>
                                    {quest.type === 'main' ? 'Main' : 'Side'}
                                </Text>
                            </View>
                        </ShadowBox>
                    </View>

                    {/* badges row */}
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {quest.has_phases && quest.phase_count > 0 && (
                            <View style={[uiStyles.badge, { backgroundColor: PAGE.quest.primary[1], borderColor: PAGE.quest.primary[0] }]}>
                                <Image source={SYSTEM_ICONS.list} style={[uiStyles.badgeIcon, { tintColor: PAGE.quest.primary[0] }]} />
                                <Text style={uiStyles.badgeText}>
                                    {quest.phase_count} {quest.phase_count === 1 ? 'phase' : 'phases'}
                                </Text>
                            </View>
                        )}

                        {quest.goal_count > 0 && (
                            <View style={[uiStyles.badge, { backgroundColor: PAGE.quest.primary[1], borderColor: PAGE.quest.primary[0] }]}>
                                <Image source={SYSTEM_ICONS.star} style={[uiStyles.badgeIcon, { tintColor: PAGE.quest.primary[0] }]} />
                                <Text style={uiStyles.badgeText}>
                                    {quest.goal_count} {quest.goal_count === 1 ? 'goal' : 'goals'}
                                </Text>
                            </View>
                        )}

                        {endDateLabel && (
                            <View style={[uiStyles.badge, { backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.12)' }]}>
                                <Image source={SYSTEM_ICONS.calendar} style={[uiStyles.badgeIcon, { opacity: 0.5 }]} />
                                <Text style={uiStyles.badgeText}>{endDateLabel}</Text>
                            </View>
                        )}
                    </View>

                    {/* progress bar */}
                    <View style={{ borderRadius: 20, backgroundColor: '#fff', borderWidth: 1 }}>
                        <View style={{
                            height: 26,
                            borderRadius: 20,
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            position: 'relative',
                        }}>
                            {progressPercent > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: 0, left: 0, bottom: 0,
                                    width: `${progressPercent}%`,
                                    backgroundColor: progressPercent >= 100 ? '#54d697' : PAGE.quest.primary[0],
                                    zIndex: 2,
                                }} />
                            )}
                            <View style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                                zIndex: 3,
                            }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontFamily: 'label',
                                    color: '#000',
                                    fontWeight: '600',
                                }}>
                                    {progressPercent}%  ·  {completedItems}/{totalItems} tasks
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* goal previews */}
                    {previewGoals.length > 0 && (
                        <View style={{ gap: 8 }}>
                            {previewGoals.map((goal, i) => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: PAGE.quest.primary[1],
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                        <Image source={getIconFile(goal.icon)} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
                                    </View>
                                    <Text style={[globalStyles.body2, { flex: 1 }]} numberOfLines={1}>{goal.name}</Text>
                                </View>
                            ))}
                            {remainingGoals > 0 && (
                                <Text style={[globalStyles.label, { opacity: 0.4, fontSize: 11, paddingLeft: 38 }]}>
                                    +{remainingGoals} more {remainingGoals === 1 ? 'goal' : 'goals'}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </ShadowBox>
        </Pressable>
    );
}
