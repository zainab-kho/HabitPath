import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { globalStyles, uiStyles } from '@/styles';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { WEEK_DAYS } from '@/constants/habits';
import { getIconFile } from '@/components/habits/iconUtils';
import IconPickerModal from '@/modals/IconPickerModal';
import { useQuestCreation, genId, QuestGoal, QuestGoalSchedule } from '@/contexts/QuestCreationContext';
import { supabase } from '@/lib/supabase';


export default function AddGoal() {
    const router = useRouter();
    const scrollRef = useRef<KeyboardAwareScrollView>(null);
    const {
        currentPhaseIndex,
        addGoalToPhase,
        addGoalTargetWeekId,
        editingGoal,
        setEditingGoal,
        updateGoalInPhase,
        detailPhaseId,
        setDetailPhaseId,
        detailWeekId,
        setDetailWeekId,
        onDetailGoalSaved,
        setOnDetailGoalSaved,
    } = useQuestCreation();

    const isDetailMode = !!detailPhaseId;

    const isEditing = !!editingGoal;

    // basic
    const [goalName, setGoalName] = useState(editingGoal?.name ?? '');
    const [selectedIcon, setSelectedIcon] = useState(editingGoal?.icon ?? 'goal');
    const [showIconPicker, setShowIconPicker] = useState(false);

    // weekly goal
    const [increment, setIncrement] = useState(editingGoal?.type === 'increment');
    const [incrementGoal, setIncrementGoal] = useState(editingGoal?.targetCount ?? 0);

    // subtasks
    const [subtasks, setSubtasks] = useState<string[]>(editingGoal?.subtasks.map(s => s.name) ?? []);
    const [newSubtask, setNewSubtask] = useState('');

    // habits page
    const [showOnHabitsPage, setShowOnHabitsPage] = useState(editingGoal?.showOnHabitsPage ?? false);
    const [activeDays, setActiveDays] = useState<string[]>(editingGoal?.activeDays ?? [...WEEK_DAYS]);
    const [daySchedule, setDaySchedule] = useState<Record<string, string>>(
        editingGoal?.daySchedule.length
            ? Object.fromEntries(editingGoal.daySchedule.map(d => [d.day, d.maxCount > 0 ? String(d.maxCount) : '']))
            : Object.fromEntries(WEEK_DAYS.map(d => [d, '']))
    );

    const handleAddSubtask = () => {
        if (!newSubtask.trim()) return;
        setSubtasks(prev => [...prev, newSubtask.trim()]);
        setNewSubtask('');
    };

    const handleRemoveSubtask = (index: number) => {
        setSubtasks(prev => prev.filter((_, i) => i !== index));
    };

    const toggleDay = (day: string) => {
        setActiveDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const toggleAllDays = () => {
        if (activeDays.length === WEEK_DAYS.length) {
            setActiveDays([]);
        } else {
            setActiveDays([...WEEK_DAYS]);
        }
    };

    const handleSave = async () => {
        if (!goalName.trim()) return;

        if (isDetailMode) {
            // save directly to Supabase for existing quests
            try {
                const { data: goalRow, error } = await supabase
                    .from('quest_goals')
                    .insert({
                        phase_id: detailPhaseId,
                        week_id: detailWeekId,
                        name: goalName.trim(),
                        icon: selectedIcon,
                        type: increment ? 'increment' : 'checkbox',
                        target_count: increment && incrementGoal > 0 ? incrementGoal : null,
                        show_on_habits_page: showOnHabitsPage,
                        active_days: showOnHabitsPage ? activeDays : [],
                        sort_order: 0,
                    })
                    .select('id')
                    .single();

                if (error || !goalRow) throw error;

                // save day schedules
                if (increment && showOnHabitsPage) {
                    const schedules = activeDays.map(day => ({
                        goal_id: goalRow.id,
                        day,
                        max_count: parseInt(daySchedule[day]) || 0,
                    }));
                    await supabase.from('quest_goal_schedules').insert(schedules);
                }

                // save subtasks
                if (subtasks.length > 0) {
                    const rows = subtasks.map((s, i) => ({
                        goal_id: goalRow.id,
                        name: s,
                        sort_order: i,
                    }));
                    await supabase.from('quest_subtasks').insert(rows);
                }

                // cleanup & callback
                setDetailPhaseId(null);
                setDetailWeekId(null);
                if (onDetailGoalSaved) {
                    onDetailGoalSaved();
                    setOnDetailGoalSaved(null);
                }
            } catch (err) {
                console.error('Error saving goal to Supabase:', err);
            }

            router.back();
            return;
        }

        // creation mode: save to context
        const schedule: QuestGoalSchedule[] = increment && showOnHabitsPage
            ? activeDays.map(day => ({
                day,
                maxCount: parseInt(daySchedule[day]) || 0,
            }))
            : [];

        const goal: QuestGoal = {
            id: editingGoal?.id ?? genId(),
            name: goalName.trim(),
            icon: selectedIcon,
            type: increment ? 'increment' : 'checkbox',
            targetCount: increment && incrementGoal > 0 ? incrementGoal : null,
            showOnHabitsPage,
            activeDays: showOnHabitsPage ? activeDays : [],
            daySchedule: schedule,
            subtasks: subtasks.map((s, i) => ({
                id: editingGoal?.subtasks[i]?.name === s ? editingGoal.subtasks[i].id : genId(),
                name: s,
            })),
        };

        if (isEditing) {
            updateGoalInPhase(currentPhaseIndex, goal, addGoalTargetWeekId);
            setEditingGoal(null);
        } else {
            addGoalToPhase(currentPhaseIndex, goal, addGoalTargetWeekId);
        }
        router.back();
    };

    return (
        <>
            <AppLinearGradient variant="quest.background">
                <PageContainer>
                    <PageHeader title={isEditing ? "Edit Goal" : "Add Goal"} showBackButton />

                    <KeyboardAwareScrollView
                        ref={scrollRef}
                        enableOnAndroid
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        {/* main card */}
                        <View style={{
                            backgroundColor: '#fff',
                            borderWidth: 1,
                            borderRadius: 20,
                            padding: 25,
                            gap: 20,
                        }}>
                            {/* icon + name */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                <Pressable
                                    onPress={() => setShowIconPicker(true)}
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 25,
                                        borderWidth: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: PAGE.quest.primary[1]
                                    }}
                                >
                                    <Image source={getIconFile(selectedIcon)} style={{ width: 28, height: 28 }} />
                                </Pressable>

                                <TextInput
                                    style={[globalStyles.body, {
                                        flex: 1,
                                        borderBottomWidth: 1,
                                        borderBottomColor: PAGE.quest.primary[0],
                                        paddingVertical: 10,
                                    }]}
                                    placeholder="Enter goal name..."
                                    placeholderTextColor="rgba(0,0,0,0.4)"
                                    value={goalName}
                                    onChangeText={setGoalName}
                                    autoFocus
                                    cursorColor={PAGE.quest.primary[0]}
                                    selectionColor={PAGE.quest.primary[0]}
                                />
                            </View>

                            {/* weekly goal toggle */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <Text style={globalStyles.body}>Goal per week?</Text>
                                <Switch
                                    trackColor={{ true: PAGE.habits.primary[1] }}
                                    value={increment}
                                    onValueChange={setIncrement}
                                />
                            </View>

                            {/* weekly goal amount */}
                            {increment && (
                                <View style={{ gap: 8 }}>
                                    <Text style={globalStyles.label}>WEEKLY GOAL</Text>
                                    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                            <Pressable
                                                onPress={() => setIncrementGoal(prev => Math.max(0, prev - 1))}
                                                style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Text style={globalStyles.body}>-</Text>
                                            </Pressable>
                                        </ShadowBox>

                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                            <View style={{
                                                borderWidth: 2,
                                                borderColor: PAGE.quest.primary[0],
                                                width: 100,
                                                borderRadius: 20,
                                                justifyContent: 'center',
                                            }}>
                                                <TextInput
                                                    style={[globalStyles.body, { textAlign: 'center' }]}
                                                    keyboardType="numeric"
                                                    value={incrementGoal.toString()}
                                                    onChangeText={text => setIncrementGoal(Number(text) || 0)}
                                                />
                                            </View>
                                        </ShadowBox>

                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                            <Pressable
                                                onPress={() => setIncrementGoal(prev => prev + 1)}
                                                style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Text style={globalStyles.body}>+</Text>
                                            </Pressable>
                                        </ShadowBox>
                                    </View>
                                </View>
                            )}

                            {/* subtasks */}
                            <View style={{ gap: 8 }}>
                                <Text style={globalStyles.label}>SUBTASKS</Text>

                                {subtasks.map((task, i) => (
                                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <ShadowBox
                                            contentBorderRadius={0}
                                            shadowBorderRadius={0}

                                            shadowColor={PAGE.quest.primary[1]}
                                            shadowOffset={{ x: 2, y: 2 }}
                                        >
                                            <View style={{ height: 10, width: 10 }}>

                                            </View>
                                        </ShadowBox>
                                        <View style={{ flex: 1, marginLeft: 5 }}>
                                            <Text style={globalStyles.body2}>{task}</Text>
                                        </View>
                                        <Pressable
                                            onPress={() => handleRemoveSubtask(i)}
                                            style={{
                                                backgroundColor: BUTTON_COLORS.Delete,
                                                borderWidth: 1,
                                                borderRadius: 12,
                                                width: 25,
                                                height: 25,
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Image
                                                source={SYSTEM_ICONS.delete}
                                                style={{ width: 12, height: 12 }}
                                            />
                                        </Pressable>
                                    </View>
                                ))}

                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    <TextInput
                                        style={[{ flex: 1, borderColor: PAGE.quest.primary[1], borderBottomWidth: 2, paddingVertical: 10 }]}
                                        placeholder="Add a subtask..."
                                        value={newSubtask}
                                        onChangeText={setNewSubtask}
                                        onSubmitEditing={handleAddSubtask}
                                        returnKeyType="done"
                                        cursorColor={PAGE.quest.primary[0]}
                                        selectionColor={PAGE.quest.primary[0]}
                                    />
                                    <Pressable
                                        onPress={handleAddSubtask}
                                        style={{
                                            backgroundColor: PAGE.quest.primary[1],
                                            borderWidth: 1,
                                            borderRadius: 12,
                                            width: 25,
                                            height: 25,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Image
                                            source={SYSTEM_ICONS.plus}
                                            style={{ width: 12, height: 12 }}
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* show on habits page */}
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                <Text style={globalStyles.body}>Show on Habits page?</Text>
                                <Switch
                                    trackColor={{ true: PAGE.habits.primary[1] }}
                                    value={showOnHabitsPage}
                                    onValueChange={setShowOnHabitsPage}
                                />
                            </View>

                            {/* day schedule */}
                            {showOnHabitsPage && (
                                <View style={{ gap: 12 }}>
                                    <Text style={globalStyles.label}>ACTIVE DAYS</Text>

                                    {/* compact row when no increment, column with max inputs when increment */}
                                    {!increment ? (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            {WEEK_DAYS.map((day) => {
                                                const isActive = activeDays.includes(day);
                                                return (
                                                    <Pressable key={day} onPress={() => toggleDay(day)}>
                                                        <ShadowBox
                                                            contentBackgroundColor={isActive ? PAGE.quest.primary[0] : '#fff'}
                                                            shadowColor={PAGE.quest.primary[0]}
                                                        >
                                                            <View style={{ width: 38, height: 25, justifyContent: 'center', alignItems: 'center' }}>
                                                                <Text style={[globalStyles.body2, { fontSize: 12 }]}>
                                                                    {day.substring(0, 3)}
                                                                </Text>
                                                            </View>
                                                        </ShadowBox>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <>
                                    {/* select all */}
                                    <Pressable onPress={toggleAllDays}>
                                        <ShadowBox
                                            contentBackgroundColor={activeDays.length === WEEK_DAYS.length ? PAGE.quest.primary[0] : '#fff'}
                                            shadowColor={PAGE.quest.primary[0]}
                                        >
                                            <View style={{ paddingVertical: 5 }}>
                                                <Text style={[globalStyles.body2, { textAlign: 'center' }]}>
                                                    {activeDays.length === WEEK_DAYS.length ? 'Deselect All' : 'Select All'}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>

                                    {/* day rows with max */}
                                    {WEEK_DAYS.map((day) => {
                                        const isActive = activeDays.includes(day);
                                        return (
                                            <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <Pressable onPress={() => toggleDay(day)} style={{ width: 70 }}>
                                                    <ShadowBox
                                                        contentBackgroundColor={isActive ? PAGE.quest.primary[0] : '#fff'}
                                                        shadowColor={PAGE.quest.primary[0]}
                                                    >
                                                        <View style={{ paddingVertical: 5 }}>
                                                            <Text style={[globalStyles.body2, { textAlign: 'center', fontSize: 12 }]}>
                                                                {day.substring(0, 3)}
                                                            </Text>
                                                        </View>
                                                    </ShadowBox>
                                                </Pressable>

                                                {increment && isActive && (
                                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                        <Text style={[globalStyles.body2, { opacity: 0.5 }]}>Max</Text>

                                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                                            <Pressable
                                                                onPress={() => {
                                                                    const cur = parseInt(daySchedule[day]) || 0;
                                                                    setDaySchedule(prev => ({ ...prev, [day]: String(Math.max(0, cur - 1)) }));
                                                                }}
                                                                style={{ paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Text style={globalStyles.body2}>-</Text>
                                                            </Pressable>
                                                        </ShadowBox>

                                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                                            <View style={{
                                                                borderWidth: 1.5,
                                                                borderColor: PAGE.quest.primary[0],
                                                                width: 50,
                                                                borderRadius: 15,
                                                                justifyContent: 'center',
                                                            }}>
                                                                <TextInput
                                                                    style={[globalStyles.body2, { textAlign: 'center', paddingVertical: 2 }]}
                                                                    keyboardType="numeric"
                                                                    value={daySchedule[day] || '0'}
                                                                    onChangeText={(val) =>
                                                                        setDaySchedule(prev => ({ ...prev, [day]: val }))
                                                                    }
                                                                    cursorColor={PAGE.quest.primary[0]}
                                                                    selectionColor={PAGE.quest.primary[0]}
                                                                />
                                                            </View>
                                                        </ShadowBox>

                                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                                            <Pressable
                                                                onPress={() => {
                                                                    const cur = parseInt(daySchedule[day]) || 0;
                                                                    setDaySchedule(prev => ({ ...prev, [day]: String(cur + 1) }));
                                                                }}
                                                                style={{ paddingVertical: 2, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Text style={globalStyles.body2}>+</Text>
                                                            </Pressable>
                                                        </ShadowBox>
                                                    </View>
                                                )}

                                                {!isActive && (
                                                    <Text style={[globalStyles.body2, { opacity: 0.3, fontSize: 12 }]}>Off</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                    </>
                                    )}
                                </View>
                            )}
                        </View>
                    </KeyboardAwareScrollView>

                    {/* action buttons */}
                    <View style={{
                        flexDirection: 'row',
                        gap: 10,
                        paddingVertical: 10,
                    }}>
                        <Pressable onPress={() => router.back()} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={PAGE.assignments.background[1]} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 8 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            onPress={handleSave}
                            style={{ flex: 1 }}
                            disabled={!goalName.trim()}
                        >
                            <ShadowBox
                                contentBackgroundColor={goalName.trim() ? BUTTON_COLORS.Save : '#ccc'}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 8 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>{isEditing ? 'Save' : 'Add Goal'}</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </PageContainer>
            </AppLinearGradient>

            <IconPickerModal
                visible={showIconPicker}
                selectedIcon={selectedIcon}
                onClose={() => setShowIconPicker(false)}
                onSelectIcon={(iconName) => setSelectedIcon(iconName)}
            />
        </>
    );
}
