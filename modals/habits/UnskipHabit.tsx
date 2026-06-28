// @/modals/habits/UnskipHabit.tsx
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { HabitWithStatus } from '@/hooks/useHabits';

interface UnskipHabitProps {
    visible: boolean;
    onClose: () => void;
    habit: HabitWithStatus | null;
    onUnskip: () => void;
    onMarkCompleted: () => void;
}

export default function UnskipHabitModal({
    visible,
    onClose,
    habit,
    onUnskip,
    onMarkCompleted,
}: UnskipHabitProps) {
    if (!habit) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: PAGE.habits.primary[1],
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* header */}
                    <View style={{ marginTop: 20, marginBottom: 20, paddingHorizontal: 20 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 8 }]}>
                            {habit.name}
                        </Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            Are you sure you want to undo skipping this habit?
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
                        <Pressable onPress={onMarkCompleted}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Quiet}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Mark done
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                    {/* buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={onUnskip} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.habits.primary[0]}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 5 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Undo skip
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </View>
        </Modal>
    );
}