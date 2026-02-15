import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

export interface PomodoroSettings {
    mode: 'pomodoro' | 'stopwatch';
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsUntilLongBreak: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
}

interface PomodoroSettingsModalProps {
    visible: boolean;
    settings?: PomodoroSettings;
    onClose: () => void;
    onSave?: (settings: PomodoroSettings) => void;
    title?: string;
    content?: React.ReactNode;
}

export default function PomodoroSettingsModal({ 
    visible, 
    settings, 
    onClose, 
    onSave,
    title = "Focus Settings",
    content 
}: PomodoroSettingsModalProps) {
    const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>(settings?.mode || 'pomodoro');
    const [workDuration, setWorkDuration] = useState(settings?.workDuration?.toString() || '25');
    const [shortBreak, setShortBreak] = useState(settings?.shortBreakDuration?.toString() || '5');
    const [longBreak, setLongBreak] = useState(settings?.longBreakDuration?.toString() || '15');
    const [sessionsUntilLong, setSessionsUntilLong] = useState(settings?.sessionsUntilLongBreak?.toString() || '4');
    const [autoStartBreaks, setAutoStartBreaks] = useState(settings?.autoStartBreaks ?? true);
    const [autoStartWork, setAutoStartWork] = useState(settings?.autoStartWork ?? false);

    const handleSave = () => {
        if (!onSave) {
            onClose();
            return;
        }

        const newSettings: PomodoroSettings = {
            mode,
            workDuration: parseInt(workDuration) || 25,
            shortBreakDuration: parseInt(shortBreak) || 5,
            longBreakDuration: parseInt(longBreak) || 15,
            sessionsUntilLongBreak: parseInt(sessionsUntilLong) || 4,
            autoStartBreaks,
            autoStartWork,
        };

        onSave(newSettings);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onPress={onClose}
            >
                <Pressable
                    style={{
                        width: '85%',
                        maxHeight: '80%',
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        padding: 20,
                        borderWidth: 1.5,
                        borderColor: PAGE.focus.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[globalStyles.h3, { marginBottom: 20, textAlign: 'center' }]}>
                        {title}
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {content ? (
                            content
                        ) : (
                            <>
                                {/* Mode Selection */}
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                        MODE
                                    </Text>
                                    <View style={{ flexDirection: 'row', gap: 10 }}>
                                        <Pressable 
                                            onPress={() => setMode('pomodoro')}
                                            style={{ flex: 1 }}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={mode === 'pomodoro' ? PAGE.focus.primary[0] : '#fff'}
                                            >
                                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 10 }]}>
                                                    Pomodoro
                                                </Text>
                                            </ShadowBox>
                                        </Pressable>

                                        <Pressable 
                                            onPress={() => setMode('stopwatch')}
                                            style={{ flex: 1 }}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={mode === 'stopwatch' ? PAGE.focus.primary[0] : '#fff'}
                                            >
                                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 10 }]}>
                                                    Stopwatch
                                                </Text>
                                            </ShadowBox>
                                        </Pressable>
                                    </View>
                                </View>

                                {mode === 'pomodoro' && (
                                    <>
                                        {/* Work Duration */}
                                        <View style={{ marginBottom: 15 }}>
                                            <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                                WORK DURATION (MINUTES)
                                            </Text>
                                            <ShadowBox>
                                                <TextInput
                                                    style={[globalStyles.body, { padding: 12 }]}
                                                    value={workDuration}
                                                    onChangeText={setWorkDuration}
                                                    keyboardType="number-pad"
                                                    placeholder="25"
                                                />
                                            </ShadowBox>
                                        </View>

                                        {/* Short Break */}
                                        <View style={{ marginBottom: 15 }}>
                                            <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                                SHORT BREAK (MINUTES)
                                            </Text>
                                            <ShadowBox>
                                                <TextInput
                                                    style={[globalStyles.body, { padding: 12 }]}
                                                    value={shortBreak}
                                                    onChangeText={setShortBreak}
                                                    keyboardType="number-pad"
                                                    placeholder="5"
                                                />
                                            </ShadowBox>
                                        </View>

                                        {/* Long Break */}
                                        <View style={{ marginBottom: 15 }}>
                                            <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                                LONG BREAK (MINUTES)
                                            </Text>
                                            <ShadowBox>
                                                <TextInput
                                                    style={[globalStyles.body, { padding: 12 }]}
                                                    value={longBreak}
                                                    onChangeText={setLongBreak}
                                                    keyboardType="number-pad"
                                                    placeholder="15"
                                                />
                                            </ShadowBox>
                                        </View>

                                        {/* Sessions until long break */}
                                        <View style={{ marginBottom: 15 }}>
                                            <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                                WORK SESSIONS BEFORE LONG BREAK
                                            </Text>
                                            <ShadowBox>
                                                <TextInput
                                                    style={[globalStyles.body, { padding: 12 }]}
                                                    value={sessionsUntilLong}
                                                    onChangeText={setSessionsUntilLong}
                                                    keyboardType="number-pad"
                                                    placeholder="4"
                                                />
                                            </ShadowBox>
                                        </View>

                                        {/* Auto-start options */}
                                        <Pressable 
                                            onPress={() => setAutoStartBreaks(!autoStartBreaks)}
                                            style={{ marginBottom: 10 }}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={autoStartBreaks ? PAGE.focus.primary[0] : '#fff'}
                                            >
                                                <Text style={[globalStyles.body2, { padding: 12 }]}>
                                                    ✓ Auto-start breaks
                                                </Text>
                                            </ShadowBox>
                                        </Pressable>

                                        <Pressable 
                                            onPress={() => setAutoStartWork(!autoStartWork)}
                                            style={{ marginBottom: 20 }}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={autoStartWork ? PAGE.focus.primary[0] : '#fff'}
                                            >
                                                <Text style={[globalStyles.body2, { padding: 12 }]}>
                                                    ✓ Auto-start work after breaks
                                                </Text>
                                            </ShadowBox>
                                        </Pressable>
                                    </>
                                )}

                                {mode === 'stopwatch' && (
                                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center', opacity: 0.7 }]}>
                                            Stopwatch mode counts up indefinitely.{'\n'}
                                            Perfect for free-form focus sessions.
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Buttons */}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                                    Cancel
                                </Text>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Done}
                                shadowBorderRadius={15}
                            >
                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                                    {onSave ? 'Save' : 'Close'}
                                </Text>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}