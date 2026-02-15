// @/modals/habits/SnoozeHabit.tsx.tsx
import { ASSIGNMENT_TYPE_COLORS, PROGRESS_COLORS } from '@/constants';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { parseLocalDate } from '@/utils/dateUtils';
import { HabitWithStatus } from '@/hooks/useHabits';

interface SnoozeHabitProps {
    visible: boolean;
    onClose: () => void;
    habit: HabitWithStatus | null;
    onSnooze: (habitId: string) => void;
}

export default function SnoozeHabitModal({
    visible,
    onClose,
    habit,
    onSnooze,
}: SnoozeHabitProps) {
    const [data, setData] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggleSelection = (assignmentId: string) => {
        setData(prev =>
            prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]
        );
    };

    const handleAdd = async () => {
        setIsSaving(true);
        try {
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setData([]);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }} onPress={handleCancel}>
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: PAGE.assignments.primary[1],
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ marginTop: 20, marginBottom: 10 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>Habit Name</Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            Snoozing
                        </Text>
                    </View>

                    <ScrollView style={{ paddingHorizontal: 3 }}>
                        <View style={{ padding: 20 }}>

                        </View>
                    </ScrollView>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.background[1]}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            onPress={handleAdd}
                            style={{ flex: 1 }}
                            disabled={data.length === 0 || isSaving}
                        >
                            <ShadowBox
                                contentBackgroundColor={
                                    data.length === 0 || isSaving
                                        ? '#ccc'
                                        : BUTTON_COLORS.Done
                                }
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving
                                            ? 'Saving...'
                                            : data.length > 0
                                                ? 'Save'
                                                : 'Save'}
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