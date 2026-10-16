// @/modals/habits/ReminderModal.tsx
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { formatReminderTime, REMINDER_PRESETS } from '@/lib/notifications';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { pickerStyles, TimeWheel } from '@/ui/TimeWheel';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

// "HH:MM" (24h) -> wheel values
function splitTime(time: string) {
    const [h, m] = time.split(':').map(Number);
    return {
        hour: String(h % 12 === 0 ? 12 : h % 12),
        minute: String(m).padStart(2, '0'),
        meridiem: h >= 12 ? 'PM' : 'AM',
    };
}

// wheel values -> "HH:MM" (24h)
function joinTime(hour: string, minute: string, meridiem: string) {
    const hour24 = (Number(hour) % 12) + (meridiem === 'PM' ? 12 : 0);
    return `${String(hour24).padStart(2, '0')}:${minute}`;
}

interface ReminderModalProps {
    visible: boolean;
    initialTime: string; // "HH:MM" 24h
    onClose: () => void;
    onSave: (time: string) => void;
}

export default function ReminderModal({ visible, initialTime, onClose, onSave }: ReminderModalProps) {
    const [hour, setHour] = useState(() => splitTime(initialTime).hour);
    const [minute, setMinute] = useState(() => splitTime(initialTime).minute);
    const [meridiem, setMeridiem] = useState(() => splitTime(initialTime).meridiem);

    // reset the wheels to the habit's current reminder each time the modal opens
    useEffect(() => {
        if (!visible) return;
        const parts = splitTime(initialTime);
        setHour(parts.hour);
        setMinute(parts.minute);
        setMeridiem(parts.meridiem);
    }, [visible, initialTime]);

    const time = joinTime(hour, minute, meridiem);

    const applyPreset = (preset: string) => {
        const parts = splitTime(preset);
        setHour(parts.hour);
        setMinute(parts.minute);
        setMeridiem(parts.meridiem);
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
                {/* backdrop sits behind the card, not around it — a Pressable parent would
                    claim the touch on press-down and the time wheels could never scroll */}
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

                <View
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: PAGE.habits.primary[0],
                        width: '90%',
                        alignSelf: 'center',
                        overflow: 'hidden',
                    }}
                >
                    <View style={{ marginTop: 20, marginBottom: 15 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>Remind me</Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            {formatReminderTime(time)} on the days this habit is due
                        </Text>
                    </View>

                    <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 15 }}>
                        {/* time wheel */}
                        <View style={pickerStyles.container}>
                            <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                <TimeWheel data={HOURS} selected={hour} onSelect={setHour} />
                                <TimeWheel data={MINUTES} selected={minute} onSelect={setMinute} />
                                <TimeWheel data={MERIDIEM} selected={meridiem} onSelect={setMeridiem} />
                            </View>
                        </View>

                        {/* quick presets */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {REMINDER_PRESETS.map((preset) => {
                                const selected = time === preset.time;
                                return (
                                    <Pressable
                                        key={preset.label}
                                        onPress={() => applyPreset(preset.time)}
                                        style={{ flex: 1 }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={selected ? PAGE.habits.primary[0] : '#fff'}
                                            contentBorderColor={selected ? '#000' : PAGE.habits.primary[0]}
                                            shadowBorderColor={selected ? '#000' : PAGE.habits.primary[0]}
                                            shadowColor={selected ? '#000' : PAGE.habits.primary[0]}
                                        >
                                            <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                                                <Text style={globalStyles.body1}>{preset.label}</Text>
                                                <Text style={[globalStyles.label, { opacity: 0.6 }]}>
                                                    {formatReminderTime(preset.time)}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={() => onSave(time)} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Save</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
