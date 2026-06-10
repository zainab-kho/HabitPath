import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import WeekCalendar from '@/ui/WeekCalendar';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface AddQuestWeekModalProps {
    visible: boolean;
    weekStartDay: number;
    existingWeekLabels: string[];
    onClose: () => void;
    onSave: (week: { startDate: Date; endDate: Date; label: string }) => void;
}

const getWeekStartForDay = (date: Date, weekStartDay: number) => {
    const day = date.getDay();
    const diff = ((day - weekStartDay) % 7 + 7) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
};

const formatWeekLabel = (start: Date, end: Date) => {
    const s = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const e = end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${s} - ${e}`;
};

export default function AddQuestWeekModal({
    visible,
    weekStartDay,
    existingWeekLabels,
    onClose,
    onSave,
}: AddQuestWeekModalProps) {
    const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
        getWeekStartForDay(new Date(), weekStartDay)
    );

    const selectedWeekEnd = new Date(selectedWeekStart);
    selectedWeekEnd.setDate(selectedWeekStart.getDate() + 6);

    const label = formatWeekLabel(selectedWeekStart, selectedWeekEnd);

    const handleSave = () => {
        if (existingWeekLabels.includes(label)) {
            Alert.alert('Week already added', 'This week is already in this phase.');
            return;
        }
        onSave({ startDate: selectedWeekStart, endDate: selectedWeekEnd, label });
        onClose();
    };

    const handleCancel = () => {
        setSelectedWeekStart(getWeekStartForDay(new Date(), weekStartDay));
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.45)',
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
                        borderWidth: 3,
                        borderColor: PAGE.quest.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ padding: 20 }}>
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 15 }]}>
                            Add Week
                        </Text>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>SELECT WEEK</Text>

                            <ShadowBox style={{ marginBottom: 15, marginHorizontal: 3 }}>
                                <WeekCalendar
                                    selectedWeekStart={selectedWeekStart}
                                    onSelectWeek={setSelectedWeekStart}
                                    weekStartDay={weekStartDay}
                                    highlightColor={PAGE.quest.primary[0]}
                                />
                            </ShadowBox>

                            <ShadowBox
                                contentBackgroundColor={PAGE.quest.primary[0]}
                                style={{ marginBottom: 15, marginHorizontal: 3 }}
                            >
                                <View style={{ paddingVertical: 8 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {label}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </ScrollView>
                    </View>

                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={PAGE.assignments.background[1]} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Add Week</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
