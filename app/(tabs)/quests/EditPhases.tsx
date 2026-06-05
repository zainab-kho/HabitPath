import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { globalStyles, uiStyles } from '@/styles';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { getDateLabel } from '@/utils/dateUtils';

import { useQuestCreation, genId, QuestGoal } from '@/contexts/QuestCreationContext';
import { getIconFile } from '@/components/habits/iconUtils';
import AddQuestWeekModal from '@/modals/quests/AddQuestWeekModal';

export default function EditPhases() {
    const router = useRouter();
    const {
        phases,
        phaseCount,
        currentPhaseIndex,
        setCurrentPhaseIndex,
        updatePhaseCount,
        updatePhaseName,
        updatePhaseEndDate,
        addWeekToPhase,
        weekStartDay,
        setWeekStartDay,
        getWeekStartDay,
        setAddGoalTargetWeekId,
        setEditingGoal,
        removeGoalFromPhase,
        removeWeekFromPhase,
    } = useQuestCreation();

    const navigateToEditGoal = (goal: QuestGoal, weekId: string | null) => {
        setEditingGoal(goal);
        setAddGoalTargetWeekId(weekId);
        router.push('/(tabs)/quests/AddGoal');
    };

    const [endDateModalIndex, setEndDateModalIndex] = useState<number | null>(null);
    const [showAddWeekModal, setShowAddWeekModal] = useState(false);
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
    const [editMode, setEditMode] = useState(false);

    const toggleGoalExpanded = (goalId: string) => {
        setExpandedGoals(prev => {
            const next = new Set(prev);
            if (next.has(goalId)) next.delete(goalId);
            else next.add(goalId);
            return next;
        });
    };

    const phase = phases[currentPhaseIndex];

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer>
                <PageHeader title="Edit Phases" showBackButton />

                <ScrollView
                    contentContainerStyle={{ paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* increment controls */}
                    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10, marginBottom: 20 }}>
                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                            <Pressable
                                onPress={() => updatePhaseCount(phaseCount - 1)}
                                style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={globalStyles.body}>-</Text>
                            </Pressable>
                        </ShadowBox>

                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                            <View style={{ paddingVertical: 2, width: 100, borderRadius: 20, justifyContent: 'center' }}>
                                <TextInput
                                    style={[globalStyles.body, { textAlign: 'center' }]}
                                    keyboardType="numeric"
                                    value={phaseCount.toString()}
                                    onChangeText={text => {
                                        const num = parseInt(text) || 1;
                                        updatePhaseCount(Math.max(1, num));
                                    }}
                                />
                            </View>
                        </ShadowBox>

                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                            <Pressable
                                onPress={() => updatePhaseCount(phaseCount + 1)}
                                style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Text style={globalStyles.body}>+</Text>
                            </Pressable>
                        </ShadowBox>
                    </View>

                    {/* phase navigation */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, height: 22 }}>
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
                        </View>

                        <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                            {currentPhaseIndex < phaseCount - 1 && (
                                <Pressable onPress={() => setCurrentPhaseIndex(currentPhaseIndex + 1)}>
                                    <Image source={SYSTEM_ICONS.sortRight} style={{ width: 22, height: 22 }} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* phase content */}
                    <View style={{
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderRadius: 20,
                        padding: 20,
                    }}>
                        {/* phase name */}
                        <Text style={[globalStyles.label, { marginBottom: 5 }]}>PHASE NAME</Text>
                        <TextInput
                            style={[uiStyles.inputField, { borderColor: PAGE.quest.primary[0], marginBottom: 15 }]}
                            placeholder={`Phase ${currentPhaseIndex + 1} name`}
                            value={phase?.name ?? ''}
                            onChangeText={(text) => updatePhaseName(currentPhaseIndex, text)}
                            cursorColor={PAGE.quest.primary[0]}
                            selectionColor={PAGE.quest.primary[0]}
                        />

                        {/* end date */}
                        <Text style={[globalStyles.label, { marginBottom: 5 }]}>END DATE</Text>
                        <Pressable onPress={() => setEndDateModalIndex(currentPhaseIndex)} style={{ marginBottom: 20 }}>
                            <ShadowBox
                                contentBackgroundColor="#fff"
                                contentBorderRadius={15}
                                contentBorderColor={PAGE.quest.primary[0]}
                                shadowColor={PAGE.quest.primary[0]}
                                shadowBorderColor={PAGE.quest.primary[0]}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 15 }}>
                                    <Image source={SYSTEM_ICONS.calendar} tintColor={PAGE.quest.primary[0]} style={{ width: 17, height: 17 }} />
                                    <Text style={globalStyles.body1}>
                                        {phase?.endDate ? getDateLabel(phase.endDate) : 'No End Date'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        {/* edit mode toggle */}
                        {((phase?.goals ?? []).length > 0 || (phase?.weeks ?? []).length > 0) && (
                            <Pressable
                                onPress={() => setEditMode(!editMode)}
                                style={{ alignSelf: 'flex-end', marginBottom: 10 }}
                            >
                                <ShadowBox
                                    contentBackgroundColor={editMode ? BUTTON_COLORS.Delete : '#f0f0f0'}
                                    shadowBorderRadius={12}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
                                        <Text style={[globalStyles.label, { opacity: 1, fontSize: 11 }]}>
                                            {editMode ? 'Done' : 'Edit'}
                                        </Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        )}

                        {/* phase-level goals */}
                        {(phase?.goals ?? []).length > 0 && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>GOALS</Text>
                                {phase.goals.map((goal) => (
                                    <View key={goal.id} style={{ marginBottom: 12 }}>
                                        <ShadowBox
                                            contentBackgroundColor="#fff"
                                            contentBorderColor="#000"
                                            contentBorderWidth={1}
                                            shadowBorderRadius={15}
                                            shadowOffset={{ x: 0, y: 5 }}
                                            shadowColor={PAGE.quest.primary[0]}
                                        >
                                            <Pressable onPress={() => navigateToEditGoal(goal, null)} style={{ paddingHorizontal: 12, paddingVertical: 7 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                                    <View style={{ width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }}>
                                                        <Image source={getIconFile(goal.icon)} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[globalStyles.body, { fontSize: 15 }]}>{goal.name}</Text>
                                                    </View>
                                                    {goal.subtasks.length > 0 && !editMode && (
                                                        <Pressable onPress={(e) => { e.stopPropagation(); toggleGoalExpanded(goal.id); }}>
                                                            <Image
                                                                source={expandedGoals.has(goal.id) ? SYSTEM_ICONS.sortLeft : SYSTEM_ICONS.sortRight}
                                                                style={{ width: 16, height: 16, opacity: 0.4 }}
                                                            />
                                                        </Pressable>
                                                    )}
                                                    {editMode && (
                                                        <Pressable onPress={(e) => { e.stopPropagation(); removeGoalFromPhase(currentPhaseIndex, goal.id, null); }}>
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
                                                {goal.subtasks.length > 0 && expandedGoals.has(goal.id) && !editMode && (
                                                    <View style={{ marginBottom: 10, paddingLeft: 55, gap: 6 }}>
                                                        {goal.subtasks.map((st) => (
                                                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                <ShadowBox
                                                                    contentBorderRadius={0}
                                                                    shadowBorderRadius={0}
                                                                    shadowColor={PAGE.quest.primary[1]}
                                                                    shadowOffset={{ x: 2, y: 2 }}
                                                                >
                                                                    <View style={{ height: 10, width: 10 }} />
                                                                </ShadowBox>
                                                                <Text style={[globalStyles.body2, { fontSize: 12 }]}>{st.name}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </Pressable>
                                        </ShadowBox>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* weeks */}
                        {(phase?.weeks ?? []).length > 0 && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={[globalStyles.label, { marginBottom: 10 }]}>WEEKS</Text>
                                {phase.weeks.map((week) => (
                                    <View key={week.id} style={{ marginBottom: 10 }}>
                                            <View>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                                    <Text style={globalStyles.body}>{week.label}</Text>
                                                    {editMode && (
                                                        <Pressable onPress={() => removeWeekFromPhase(currentPhaseIndex, week.id)}>
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
                                                {week.goals.map((goal) => (
                                                    <View key={goal.id} style={{ marginBottom: 8 }}>
                                                        <ShadowBox
                                                            contentBackgroundColor="#fff"
                                                            contentBorderColor="#000"
                                                            contentBorderWidth={1}
                                                            shadowBorderRadius={15}
                                                            shadowOffset={{ x: 0, y: 5 }}
                                                            shadowColor={PAGE.quest.primary[0]}
                                                        >
                                                            <Pressable onPress={() => navigateToEditGoal(goal, week.id)} style={{ padding: 10 }}>
                                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                                    <View style={{ width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' }}>
                                                                        <Image source={getIconFile(goal.icon)} style={{ width: 34, height: 34, resizeMode: 'contain' }} />
                                                                    </View>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={[globalStyles.body, { fontSize: 14 }]}>{goal.name}</Text>
                                                                    </View>
                                                                    {goal.subtasks.length > 0 && !editMode && (
                                                                        <Pressable onPress={(e) => { e.stopPropagation(); toggleGoalExpanded(goal.id); }}>
                                                                            <Image
                                                                                source={expandedGoals.has(goal.id) ? SYSTEM_ICONS.sortLeft : SYSTEM_ICONS.sortRight}
                                                                                style={{ width: 14, height: 14, opacity: 0.4 }}
                                                                            />
                                                                        </Pressable>
                                                                    )}
                                                                    {editMode && (
                                                                        <Pressable onPress={(e) => { e.stopPropagation(); removeGoalFromPhase(currentPhaseIndex, goal.id, week.id); }}>
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
                                                                {goal.subtasks.length > 0 && expandedGoals.has(goal.id) && !editMode && (
                                                                    <View style={{ marginTop: 8, paddingLeft: 46, gap: 5 }}>
                                                                        {goal.subtasks.map((st) => (
                                                                            <View key={st.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                                <ShadowBox
                                                                                    contentBorderRadius={0}
                                                                                    shadowBorderRadius={0}
                                                                                    shadowColor={PAGE.quest.primary[1]}
                                                                                    shadowOffset={{ x: 2, y: 2 }}
                                                                                >
                                                                                    <View style={{ height: 10, width: 10 }} />
                                                                                </ShadowBox>
                                                                                <Text style={[globalStyles.body2, { fontSize: 12 }]}>{st.name}</Text>
                                                                            </View>
                                                                        ))}
                                                                    </View>
                                                                )}
                                                            </Pressable>
                                                        </ShadowBox>
                                                    </View>
                                                ))}
                                                <Pressable
                                                    onPress={() => {
                                                        setEditingGoal(null);
                                                        setAddGoalTargetWeekId(week.id);
                                                        router.push('/(tabs)/quests/AddGoal');
                                                    }}
                                                    style={{ marginTop: 4 }}
                                                >
                                                    <ShadowBox
                                                        contentBackgroundColor={'#fff'}
                                                        // shadowColor={PAGE.quest.primary[1]}
                                                        shadowBorderRadius={20}
                                                        style={{ width: '100%' }}
                                                    >
                                                        <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: 5 }}>
                                                            <Text style={globalStyles.body}>+</Text>
                                                        </View>
                                                    </ShadowBox>
                                                </Pressable>
                                            </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* action buttons */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable
                                onPress={() => {
                                    setEditingGoal(null);
                                    setAddGoalTargetWeekId(null);
                                    router.push('/(tabs)/quests/AddGoal');
                                }}
                                style={{ flex: 1 }}
                            >
                                <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>Add Goal</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            <Pressable onPress={() => setShowAddWeekModal(true)} style={{ flex: 1 }}>
                                <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>Add Week</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </PageContainer>

            {/* end date picker modal */}
            <Modal
                visible={endDateModalIndex !== null}
                transparent
                animationType="none"
                onRequestClose={() => setEndDateModalIndex(null)}
            >
                <Pressable style={styles.overlay} onPress={() => setEndDateModalIndex(null)}>
                    <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
                        <View style={{ padding: 20 }}>
                            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 15 }]}>
                                End Date
                            </Text>
                            <SimpleCalendar
                                selectedDate={endDateModalIndex !== null ? phases[endDateModalIndex]?.endDate ?? undefined : undefined}
                                onSelectDate={(date) => {
                                    if (endDateModalIndex !== null) {
                                        updatePhaseEndDate(endDateModalIndex, date);
                                        setEndDateModalIndex(null);
                                    }
                                }}
                                selectedDateColor={PAGE.quest.primary[0]}
                                minDate={endDateModalIndex !== null && endDateModalIndex > 0
                                    ? phases[endDateModalIndex - 1]?.endDate ?? undefined
                                    : undefined}
                            />
                            <Pressable
                                onPress={() => {
                                    if (endDateModalIndex !== null) {
                                        updatePhaseEndDate(endDateModalIndex, null);
                                        setEndDateModalIndex(null);
                                    }
                                }}
                                style={{ marginTop: 15 }}
                            >
                                <ShadowBox contentBackgroundColor="#fff">
                                    <View style={{ paddingVertical: 5 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>No End Date</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            <AddQuestWeekModal
                visible={showAddWeekModal}
                weekStartDay={getWeekStartDay()}
                existingWeekLabels={phase?.weeks.map(w => w.label) ?? []}
                onClose={() => setShowAddWeekModal(false)}
                onSave={({ startDate, endDate, label }) => {
                    addWeekToPhase(currentPhaseIndex, {
                        id: genId(),
                        startDate,
                        endDate,
                        label,
                        goals: [],
                    });
                }}
            />
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: PAGE.quest.primary[0],
        maxHeight: '75%',
        width: '90%',
        alignSelf: 'center',
    },
});
