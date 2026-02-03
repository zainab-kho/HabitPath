// @/components/modals/AddWeekModal.tsx
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { WeekPlan } from '@/hooks/useAssignmentData';
import WeekCalendar from '@/ui/WeekCalendar';

interface AddWeekModalProps {
    visible: boolean;
    weekPlans: WeekPlan[];
    onClose: () => void;
    onSave: (
        weekRange: { start: Date; end: Date; label: string },
        selectedDays: string[]
    ) => void;
}

export default function AddWeekModal({ visible, weekPlans, onClose, onSave }: AddWeekModalProps) {
    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedWeekOffset, setSelectedWeekOffset] = useState(0); // 0 = current week, 1 = next week, etc.

    // generate week options (current week + next 15 weeks)
    const getWeekOptions = () => {
        const options = [];
        const today = new Date();

        for (let i = 0; i < 15; i++) {
            const weekStart = new Date(today);
            const dayOfWeek = today.getDay();
            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(today.getDate() + daysToMonday + (i * 7));

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const label = `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;

            options.push({
                offset: i,
                start: weekStart,
                end: weekEnd,
                label,
                isCurrent: i === 0
            });
        }

        return options;
    };

    const weekOptions = getWeekOptions();
    const selectedWeek = weekOptions[selectedWeekOffset];

    const toggleDay = (day: string) => {
        if (selectedDays.includes(day)) {
            setSelectedDays(selectedDays.filter(d => d !== day));
        } else {
            setSelectedDays([...selectedDays, day]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedDays.length === DAYS.length) {
            setSelectedDays([]);
        } else {
            setSelectedDays([...DAYS]);
        }
    };

    const handleSave = () => {
        if (!selectedWeek || selectedDays.length === 0) {
            return;
        }

        const alreadyExists = weekPlans.some(
            plan => plan.weekRange.label === selectedWeek.label
        );

        if (alreadyExists) {
            Alert.alert('Week already exists', 'Please select a week that is not already planned.');
            return;
        }

        onSave(
            {
                start: selectedWeek.start,
                end: selectedWeek.end,
                label: selectedWeek.label,
            },
            selectedDays
        );

        setSelectedDays([]);
        setSelectedWeekOffset(0);
        onClose();
    };

    const handleCancel = () => {
        setSelectedDays([]);
        setSelectedWeekOffset(0);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onPress={handleCancel}
            >
                <Pressable
                    style={{
                        width: '90%',
                        maxHeight: '75%',
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        padding: 20,
                        borderWidth: 1.5,
                        borderColor: PAGE.assignments.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[globalStyles.h2, { marginBottom: 20, textAlign: 'center' }]}>
                        Add Week Plan
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* select week */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            SELECT WEEK
                        </Text>

                        <ShadowBox style={{ marginBottom: 20, marginHorizontal: 3 }}>
                            <WeekCalendar
                                selectedWeekStart={selectedWeek.start}
                                onSelectWeek={(weekStart) => {
                                    const index = weekOptions.findIndex(
                                        w => w.start.toDateString() === weekStart.toDateString()
                                    );
                                    if (index !== -1) {
                                        setSelectedWeekOffset(index);
                                    }
                                }}
                            />
                        </ShadowBox>

                        {/* select days */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            SELECT DAYS
                        </Text>

                        {/* select all button */}
                        <Pressable onPress={toggleSelectAll} style={{ marginBottom: 10, marginHorizontal: 2 }}>
                            <ShadowBox
                                contentBackgroundColor={
                                    selectedDays.length === DAYS.length
                                        ? PAGE.assignments.primary[0]
                                        : PAGE.assignments.background[1]
                                }
                            >
                                <View style={{ paddingVertical: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {selectedDays.length === DAYS.length ? 'Deselect All' : 'Select All'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        {/* individual days */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20, marginHorizontal: 2 }}>
                            {DAYS.map(day => {
                                const selected = selectedDays.includes(day);

                                return (
                                    <Pressable
                                        key={day}
                                        onPress={() => toggleDay(day)}
                                        style={{ width: '20%' }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={
                                                selected ? PAGE.assignments.primary[0] : '#fff'
                                            }
                                        >
                                            <Text
                                                style={[
                                                    globalStyles.body2,
                                                    {
                                                        textAlign: 'center',
                                                        padding: 5,
                                                    },
                                                ]}
                                            >
                                                {day.substring(0, 3)}
                                            </Text>
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.background[1]}
                                shadowBorderRadius={15}
                            >
                                <View style={{ padding: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            onPress={handleSave}
                            style={{ flex: 1 }}
                            disabled={selectedDays.length === 0}
                        >
                            <ShadowBox
                                contentBackgroundColor={
                                    selectedDays.length === 0
                                        ? '#ccc'
                                        : BUTTON_COLORS.Done
                                }
                                shadowBorderRadius={15}
                            >
                                <View style={{ padding: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Add Week
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}