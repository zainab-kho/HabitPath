import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
import AddQuestGoalModal from '@/modals/quests/AddQuestGoalModal';
import AddQuestWeekModal from '@/modals/quests/AddQuestWeekModal';

export default function EditPhases() {
    const {
        phases,
        phaseCount,
        currentPhaseIndex,
        setCurrentPhaseIndex,
        updatePhaseCount,
        updatePhaseName,
        updatePhaseEndDate,
        addGoalToPhase,
        addWeekToPhase,
        weekEndDay,
        setWeekEndDay,
        getWeekStartDay,
    } = useQuestCreation();

    const [endDateModalIndex, setEndDateModalIndex] = useState<number | null>(null);
    const [showAddGoalModal, setShowAddGoalModal] = useState(false);
    const [showAddWeekModal, setShowAddWeekModal] = useState(false);
    const [addGoalTargetWeekId, setAddGoalTargetWeekId] = useState<string | null>(null);

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

                        {/* phase-level goals */}
                        {(phase?.goals ?? []).length > 0 && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={[globalStyles.label, { marginBottom: 5 }]}>GOALS</Text>
                                {phase.goals.map((goal) => (
                                    <View key={goal.id} style={{ marginBottom: 8 }}>
                                        <ShadowBox>
                                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                <Text style={globalStyles.body2}>{goal.name}</Text>
                                                {goal.subtasks.length > 0 && (
                                                    <View style={{ marginTop: 4, paddingLeft: 10 }}>
                                                        {goal.subtasks.map((st) => (
                                                            <Text key={st.id} style={[globalStyles.body2, { fontSize: 11, opacity: 0.6 }]}>
                                                                • {st.name}
                                                            </Text>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </ShadowBox>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* weeks */}
                        {(phase?.weeks ?? []).length > 0 && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={[globalStyles.label, { marginBottom: 5 }]}>WEEKS</Text>
                                {phase.weeks.map((week) => (
                                    <View key={week.id} style={{ marginBottom: 10 }}>
                                        <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                            <View style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                                                <Text style={[globalStyles.body, { marginBottom: 4 }]}>{week.label}</Text>
                                                {week.goals.map((goal) => (
                                                    <View key={goal.id} style={{ marginBottom: 4, paddingLeft: 8 }}>
                                                        <Text style={globalStyles.body2}>{goal.name}</Text>
                                                        {goal.subtasks.length > 0 && (
                                                            <View style={{ paddingLeft: 10 }}>
                                                                {goal.subtasks.map((st) => (
                                                                    <Text key={st.id} style={[globalStyles.body2, { fontSize: 11, opacity: 0.6 }]}>
                                                                        • {st.name}
                                                                    </Text>
                                                                ))}
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                                <Pressable
                                                    onPress={() => {
                                                        setAddGoalTargetWeekId(week.id);
                                                        setShowAddGoalModal(true);
                                                    }}
                                                    style={{ marginTop: 4 }}
                                                >
                                                    <Text style={[globalStyles.body2, { color: PAGE.quest.primary[0] }]}>+ Add Goal</Text>
                                                </Pressable>
                                            </View>
                                        </ShadowBox>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* action buttons */}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <Pressable
                                onPress={() => {
                                    setAddGoalTargetWeekId(null);
                                    setShowAddGoalModal(true);
                                }}
                                style={{ flex: 1 }}
                            >
                                <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body2, { textAlign: 'center' }]}>+ Add Goal</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            <Pressable onPress={() => setShowAddWeekModal(true)} style={{ flex: 1 }}>
                                <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body2, { textAlign: 'center' }]}>+ Add Week</Text>
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

            <AddQuestGoalModal
                visible={showAddGoalModal}
                onClose={() => setShowAddGoalModal(false)}
                onSave={({ name: goalName, subtasks }) => {
                    const goal: QuestGoal = {
                        id: genId(),
                        name: goalName,
                        subtasks: subtasks.map(s => ({ id: genId(), name: s })),
                    };
                    addGoalToPhase(currentPhaseIndex, goal, addGoalTargetWeekId);
                }}
            />

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
