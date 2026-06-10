import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View, Text, TextInput, Pressable, Switch, Image } from 'react-native';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { globalStyles, uiStyles } from '@/styles';
import SimpleCalendar from '@/ui/SimpleCalendar';

// constants
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ShadowBox from '@/ui/ShadowBox';
import { formatLocalDate, getDateLabel } from '@/utils/dateUtils';
import { supabase } from '@/lib/supabase';
import { useQuestCreation } from '@/contexts/QuestCreationContext';

export default function NewQuestPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [endQuestDateToggle, setEndQuestDateToggle] = useState(false);
    const [endQuestDate, setEndQuestDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [phaseCountToggle, setPhaseCountToggle] = useState(false);

    const { phaseCount, phases, weekStartDay, setWeekStartDay, resetPhases } = useQuestCreation();

    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    const totalGoals = phases.reduce(
        (sum, p) => sum + p.goals.length + p.weeks.reduce((ws, w) => ws + w.goals.length, 0),
        0
    );

    const handleSave = async () => {
        if (!name.trim() || !user) return;
        setSaving(true);

        try {
            // 1. Insert quest
            const { data: quest, error: questError } = await supabase
                .from('quests')
                .insert({
                    user_id: user.id,
                    name: name.trim(),
                    type: 'main',
                    start_date: formatLocalDate(new Date()),
                    end_date: endQuestDateToggle ? formatLocalDate(endQuestDate) : null,
                    has_phases: phaseCountToggle,
                    week_start_day: weekStartDay,
                })
                .select('id')
                .single();

            if (questError || !quest) throw questError;

            // 2. Insert phases (if enabled)
            if (phaseCountToggle) {
                for (let pi = 0; pi < phases.length; pi++) {
                    const phase = phases[pi];

                    const { data: phaseRow, error: phaseError } = await supabase
                        .from('quest_phases')
                        .insert({
                            quest_id: quest.id,
                            name: phase.name,
                            end_date: phase.endDate ? formatLocalDate(phase.endDate) : null,
                            sort_order: pi,
                        })
                        .select('id')
                        .single();

                    if (phaseError || !phaseRow) throw phaseError;

                    // 3. Insert phase-level goals
                    for (let gi = 0; gi < phase.goals.length; gi++) {
                        const goal = phase.goals[gi];
                        await insertGoal(goal, phaseRow.id, null, gi);
                    }

                    // 4. Insert weeks
                    for (let wi = 0; wi < phase.weeks.length; wi++) {
                        const week = phase.weeks[wi];

                        const { data: weekRow, error: weekError } = await supabase
                            .from('quest_weeks')
                            .insert({
                                phase_id: phaseRow.id,
                                start_date: formatLocalDate(week.startDate),
                                end_date: formatLocalDate(week.endDate),
                                label: week.label,
                                sort_order: wi,
                            })
                            .select('id')
                            .single();

                        if (weekError || !weekRow) throw weekError;

                        // 5. Insert week goals
                        for (let wgi = 0; wgi < week.goals.length; wgi++) {
                            const goal = week.goals[wgi];
                            await insertGoal(goal, phaseRow.id, weekRow.id, wgi);
                        }
                    }
                }
            }

            router.back();
        } catch (err) {
            console.error('Error saving quest:', err);
            Alert.alert('Error', 'Failed to save quest. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const insertGoal = async (
        goal: (typeof phases)[0]['goals'][0],
        phaseId: string,
        weekId: string | null,
        sortOrder: number,
    ) => {
        const { data: goalRow, error: goalError } = await supabase
            .from('quest_goals')
            .insert({
                phase_id: phaseId,
                week_id: weekId,
                name: goal.name,
                icon: goal.icon,
                type: goal.type,
                target_count: goal.targetCount,
                show_on_habits_page: goal.showOnHabitsPage,
                active_days: goal.activeDays,
                sort_order: sortOrder,
            })
            .select('id')
            .single();

        if (goalError || !goalRow) throw goalError;

        // Insert day schedules
        if (goal.daySchedule.length > 0) {
            const schedules = goal.daySchedule.map(s => ({
                goal_id: goalRow.id,
                day: s.day,
                max_count: s.maxCount,
            }));
            const { error: schedError } = await supabase
                .from('quest_goal_schedules')
                .insert(schedules);
            if (schedError) throw schedError;
        }

        // Insert subtasks
        if (goal.subtasks.length > 0) {
            const subtasks = goal.subtasks.map((s, i) => ({
                goal_id: goalRow.id,
                name: s.name,
                sort_order: i,
            }));
            const { error: subError } = await supabase
                .from('quest_subtasks')
                .insert(subtasks);
            if (subError) throw subError;
        }
    };

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer>
                <PageHeader title="Create Quest" showBackButton />

                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    contentContainerStyle={{
                        borderWidth: 1,
                        borderRadius: 20,
                        backgroundColor: '#fff'
                    }}
                >
                    <View style={{ padding: 20 }}>
                        {/* title */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>TITLE</Text>
                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.quest.primary[0],
                                marginBottom: 15,
                            }]}
                            placeholder='e.g. Get an Internship'
                            returnKeyType="next"
                            value={name}
                            onChangeText={setName}
                            cursorColor={PAGE.quest.primary[0]}
                            selectionColor={PAGE.quest.primary[0]}
                        />

                        {/* end date toggle */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={globalStyles.body}>End date?</Text>
                            <Switch
                                trackColor={{ true: PAGE.habits.primary[1] }}
                                value={endQuestDateToggle}
                                onValueChange={(val) => {
                                    setEndQuestDateToggle(val);
                                    setShowCalendar(val);
                                }}
                            />
                        </View>

                        {endQuestDateToggle && (
                            <View style={{ marginBottom: 15, gap: 10, }}>
                                {endQuestDate && (
                                    <Pressable onPress={() => setShowCalendar(!showCalendar)}>
                                        <ShadowBox contentBackgroundColor="#fff" contentBorderRadius={10}>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 5,
                                                paddingHorizontal: 15,
                                            }}>
                                                <Image source={SYSTEM_ICONS.calendar} style={{ width: 17, height: 17 }} />
                                                <Text style={globalStyles.body1}>{getDateLabel(endQuestDate)}</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                )}

                                {showCalendar && (
                                    <View style={{ marginVertical: 5 }}>
                                        <ShadowBox>
                                            <SimpleCalendar
                                                selectedDate={endQuestDate}
                                                onSelectDate={(date) => {
                                                    setEndQuestDate(date);
                                                    setShowCalendar(false);
                                                }}
                                                selectedDateColor={PAGE.quest.primary[0]}
                                            />
                                        </ShadowBox>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* phases toggle */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={globalStyles.body}>Phases?</Text>
                            <Switch
                                trackColor={{ true: PAGE.habits.primary[1] }}
                                value={phaseCountToggle}
                                onValueChange={(val) => {
                                    setPhaseCountToggle(val);
                                    if (val) resetPhases();
                                }}
                            />
                        </View>

                        {phaseCountToggle && (
                            <View style={{ gap: 15 }}>
                                {/* week ends on */}
                                <View>
                                    <Text style={globalStyles.label}>WEEK STARTS ON</Text>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginTop: 8,
                                    }}>
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                            <Pressable key={i} onPress={() => setWeekStartDay(i)}>
                                                <ShadowBox
                                                    contentBackgroundColor={weekStartDay === i ? PAGE.quest.primary[0] : '#fff'}
                                                    shadowColor={PAGE.quest.primary[0]}
                                                >
                                                    <View style={{ width: 38, height: 25, justifyContent: 'center', alignItems: 'center' }}>
                                                        <Text style={[globalStyles.body2, { fontSize: 12 }]}>{day}</Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* edit phases button */}
                                <Pressable onPress={() => router.push('/(tabs)/quests/EditPhases')}>
                                    <ShadowBox
                                        shadowColor={PAGE.quest.primary[0]}
                                        contentBackgroundColor="#fff"
                                    >
                                        <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
                                            <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                                Edit Phases
                                            </Text>
                                            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.5, marginTop: 2 }]}>
                                                {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'} · {totalGoals} {totalGoals === 1 ? 'goal' : 'goals'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={() => router.back()} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={PAGE.assignments.background[1]} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            onPress={handleSave}
                            disabled={!name.trim() || saving}
                            style={{ flex: 1 }}
                        >
                            <ShadowBox
                                contentBackgroundColor={!name.trim() || saving ? '#ccc' : BUTTON_COLORS.Save}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </KeyboardAwareScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}
