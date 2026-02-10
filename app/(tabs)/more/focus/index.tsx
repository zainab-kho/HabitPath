import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import PomodoroSettingsModal from '@/modals/PomodoroSettingsModal';
import TagPickerModal from '@/modals/TagPickerModal';

type SessionType = 'work' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
    mode: 'pomodoro' | 'stopwatch';
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsUntilLongBreak: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
}

interface Course {
    id: string;
    name: string;
    color: string;
}

export default function PomodoroTimer() {
    const { user } = useAuth();

    // Session info
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // Modals
    const [showSettings, setShowSettings] = useState(false);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [showCoursePicker, setShowCoursePicker] = useState(false);

    // Settings
    const [settings, setSettings] = useState<PomodoroSettings>({
        mode: 'pomodoro',
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        sessionsUntilLongBreak: 4,
        autoStartBreaks: true,
        autoStartWork: false,
    });

    // Timer state
    const [currentSessionType, setCurrentSessionType] = useState<SessionType>('work');
    const [timeRemaining, setTimeRemaining] = useState(settings.workDuration * 60);
    const [stopwatchTime, setStopwatchTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [showStartButton, setShowStartButton] = useState(true);
    const [completedSessions, setCompletedSessions] = useState(0);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Load settings on mount
    useEffect(() => {
        loadSettings();
    }, [user]);

    const loadSettings = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_settings')
                .select('pomodoro_settings')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error loading settings:', error);
                return;
            }

            if (data?.pomodoro_settings) {
                const loadedSettings = {
                    mode: data.pomodoro_settings.mode || 'pomodoro',
                    workDuration: data.pomodoro_settings.workDuration || 25,
                    shortBreakDuration: data.pomodoro_settings.shortBreakDuration || 5,
                    longBreakDuration: data.pomodoro_settings.longBreakDuration || 15,
                    sessionsUntilLongBreak: data.pomodoro_settings.sessionsUntilLongBreak || 4,
                    autoStartBreaks: data.pomodoro_settings.autoStartBreaks ?? true,
                    autoStartWork: data.pomodoro_settings.autoStartWork ?? false,
                };
                setSettings(loadedSettings);
                setTimeRemaining(loadedSettings.workDuration * 60);
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    const saveSettings = async (newSettings: PomodoroSettings) => {
        if (!user) return;

        try {
            const { error } = await supabase
                .from('user_settings')
                .update({ pomodoro_settings: newSettings })
                .eq('user_id', user.id);

            if (error) throw error;

            setSettings(newSettings);

            // Reset timer with new settings
            if (!isRunning) {
                if (newSettings.mode === 'stopwatch') {
                    setStopwatchTime(0);
                } else {
                    const duration = currentSessionType === 'work'
                        ? newSettings.workDuration
                        : currentSessionType === 'shortBreak'
                            ? newSettings.shortBreakDuration
                            : newSettings.longBreakDuration;
                    setTimeRemaining(duration * 60);
                }
            }
        } catch (err) {
            console.error('Error saving settings:', err);
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    // Timer logic
    useEffect(() => {
        if (isRunning) {
            if (settings.mode === 'stopwatch') {
                // Stopwatch counts UP
                intervalRef.current = setInterval(() => {
                    setStopwatchTime(prev => prev + 1);
                }, 1000);
            } else if (timeRemaining > 0) {
                // Pomodoro counts DOWN
                intervalRef.current = setInterval(() => {
                    setTimeRemaining(prev => {
                        if (prev <= 1) {
                            handleSessionComplete();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeRemaining, stopwatchTime, settings.mode]);

    const handleSessionComplete = async () => {
        setIsRunning(false);

        // Save work session to database
        if (settings.mode === 'stopwatch' || currentSessionType === 'work') {
            await saveWorkSession();
        }

        if (settings.mode === 'pomodoro') {
            if (currentSessionType === 'work') {
                const newCompletedSessions = completedSessions + 1;
                setCompletedSessions(newCompletedSessions);

                // Determine next session type
                const isLongBreak = newCompletedSessions % settings.sessionsUntilLongBreak === 0;
                startSession(isLongBreak ? 'longBreak' : 'shortBreak');

                // Auto-start break if enabled
                if (settings.autoStartBreaks) {
                    setShowStartButton(false);
                    setIsRunning(true);
                }
            } else {
                // After break, start work session
                startSession('work');

                // Auto-start work if enabled
                if (settings.autoStartWork) {
                    setShowStartButton(false);
                    setIsRunning(true);
                }
            }
        } else {
            // Stopwatch mode - just reset
            setShowStartButton(true);
        }
    };

    const saveWorkSession = async () => {
        if (!user) return;

        try {
            const duration = settings.mode === 'stopwatch'
                ? Math.floor(stopwatchTime / 60)
                : settings.workDuration;

            await supabase.from('focus_sessions').insert({
                user_id: user.id,
                duration_minutes: duration,
                tag: selectedTag || null,
                course_id: selectedCourse?.id || null,
                course_name: selectedCourse?.name || null,
                completed_at: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Error saving session:', err);
        }
    };

    const startSession = (type: SessionType) => {
        setCurrentSessionType(type);
        const duration = type === 'work'
            ? settings.workDuration
            : type === 'shortBreak'
                ? settings.shortBreakDuration
                : settings.longBreakDuration;

        setTimeRemaining(duration * 60);
        setShowStartButton(true);
    };

    const handleStart = () => {
        setShowStartButton(false);
        setIsRunning(true);

        if (settings.mode === 'stopwatch') {
            setStopwatchTime(0);
        }
    };

    const handleTimerPress = () => {
        setIsRunning(!isRunning);
    };

    const handleSkip = () => {
        if (settings.mode === 'stopwatch') {
            handleSessionComplete();
            return;
        }

        if (currentSessionType === 'work') {
            const newCompletedSessions = completedSessions + 1;
            setCompletedSessions(newCompletedSessions);

            if (newCompletedSessions % settings.sessionsUntilLongBreak === 0) {
                startSession('longBreak');
            } else {
                startSession('shortBreak');
            }
        } else {
            startSession('work');
        }
    };

    const handleReset = () => {
        setIsRunning(false);
        setShowStartButton(true);

        if (settings.mode === 'stopwatch') {
            setStopwatchTime(0);
        } else {
            const duration = currentSessionType === 'work'
                ? settings.workDuration
                : currentSessionType === 'shortBreak'
                    ? settings.shortBreakDuration
                    : settings.longBreakDuration;
            setTimeRemaining(duration * 60);
        }
    };

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const totalDuration = currentSessionType === 'work'
        ? settings.workDuration * 60
        : currentSessionType === 'shortBreak'
            ? settings.shortBreakDuration * 60
            : settings.longBreakDuration * 60;

    const progressPercentage = settings.mode === 'stopwatch'
        ? 0
        : Math.round(((totalDuration - timeRemaining) / totalDuration) * 100);

    const isBreak = currentSessionType !== 'work' && settings.mode === 'pomodoro';
    const sessionLabel = settings.mode === 'stopwatch'
        ? 'Stopwatch'
        : currentSessionType === 'work'
            ? 'Focus'
            : currentSessionType === 'shortBreak'
                ? 'Short Break'
                : 'Long Break';

    const displayTime = settings.mode === 'stopwatch'
        ? formatTime(stopwatchTime)
        : formatTime(timeRemaining);

    return (
        <AppLinearGradient variant={isBreak ? "focus.backgroundBreak" : "focus.backgroundMain"}>
            <PageContainer>
                <PageHeader
                    title={sessionLabel}
                    showBackButton
                    navigateIcon={SYSTEM_ICONS.settings}
                    onNavigatePress={() => setShowSettings(true)}
                />

                <View style={{ position: 'absolute', top: 60, right: 20, zIndex: 10 }}>
                    <Pressable onPress={() => setShowSettings(true)}>
                        <ShadowBox
                            contentBackgroundColor={BUTTON_COLORS.Edit}
                            contentBorderRadius={10}
                            shadowBorderRadius={10}
                        >
                            <View style={{ padding: 8 }}>
                                <Image source={SYSTEM_ICONS.settings} style={{ width: 20, height: 20 }} />
                            </View>
                        </ShadowBox>
                    </Pressable>
                </View>

                <ScrollView contentContainerStyle={{ flex: 1 }}>
                    {/* Session counter - only in pomodoro mode */}
                    {settings.mode === 'pomodoro' && currentSessionType === 'work' && (
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            <Text style={[globalStyles.body, { opacity: 0.7 }]}>
                                Session {completedSessions + 1} of {settings.sessionsUntilLongBreak}
                            </Text>
                        </View>
                    )}

                    {/* Timer display */}
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Pressable
                            onPress={handleTimerPress}
                            disabled={showStartButton}
                            style={{ alignItems: 'center' }}
                        >
                            <Text style={{
                                fontFamily: 'p1',
                                fontSize: 70,
                                color: isBreak ? PAGE.focus.break[0] : PAGE.focus.primary[0]
                            }}>
                                {displayTime}
                            </Text>

                            {!showStartButton && (
                                <Text style={[globalStyles.label, { marginTop: 10, opacity: 0.6 }]}>
                                    {isRunning ? 'Tap to pause' : 'Tap to resume'}
                                </Text>
                            )}
                        </Pressable>

                        {/* Tag and Course selection */}
                        {showStartButton && (
                            <View style={{ marginTop: 30, gap: 10, alignItems: 'center' }}>
                                {/* Course picker */}
                                <Pressable onPress={() => setShowCoursePicker(true)}>
                                    <ShadowBox contentBorderRadius={15} shadowBorderRadius={15}>
                                        <View style={{ paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {selectedCourse && (
                                                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedCourse.color, borderWidth: 1, borderColor: '#000' }} />
                                            )}
                                            <Text style={globalStyles.body2}>
                                                {selectedCourse ? selectedCourse.name : 'Select course...'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {/* Tag input */}
                                <Pressable onPress={() => setShowTagPicker(true)}>
                                    <ShadowBox contentBorderRadius={15} shadowBorderRadius={15}>
                                        <View style={{ paddingHorizontal: 15, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Image source={SYSTEM_ICONS.tag} style={{ width: 15, height: 15 }} />
                                            <Text style={globalStyles.body2}>
                                                {selectedTag || 'Add tag...'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {/* Start button */}
                                <Pressable
                                    style={{ width: 100, marginTop: 10 }}
                                    onPress={handleStart}
                                >
                                    <ShadowBox
                                        contentBorderRadius={20}
                                        shadowBorderRadius={20}
                                        contentBackgroundColor={BUTTON_COLORS.Done}
                                    >
                                        <Text style={[globalStyles.body2, {
                                            textAlign: 'center',
                                            paddingVertical: 8,
                                        }]}>
                                            Start
                                        </Text>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        )}

                        {/* Skip/Reset buttons when running */}
                        {!showStartButton && (
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 30 }}>
                                <Pressable onPress={handleReset} style={{ flex: 1 }}>
                                    <ShadowBox contentBorderRadius={15} shadowBorderRadius={15}>
                                        <Text style={[globalStyles.body2, { textAlign: 'center', paddingVertical: 6, paddingHorizontal: 15 }]}>
                                            Reset
                                        </Text>
                                    </ShadowBox>
                                </Pressable>

                                <Pressable onPress={handleSkip} style={{ flex: 1 }}>
                                    <ShadowBox contentBorderRadius={15} shadowBorderRadius={15}>
                                        <Text style={[globalStyles.body2, { textAlign: 'center', paddingVertical: 6, paddingHorizontal: 15 }]}>
                                            {settings.mode === 'stopwatch' ? 'Finish' : 'Skip'}
                                        </Text>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* Progress bar - only in pomodoro mode */}
                    {settings.mode === 'pomodoro' && (
                        <View style={{ width: '80%', alignSelf: 'center', marginBottom: 100 }}>
                            <ShadowBox
                                contentBorderWidth={1.5}
                                contentBorderRadius={50}
                                shadowBorderRadius={50}
                                contentBackgroundColor={isBreak ? PAGE.focus.background[1] : PAGE.focus.background[0]}
                                shadowOffset={{ x: 3, y: 3 }}
                                shadowBorderWidth={1.5}
                                shadowColor={isBreak ? PAGE.focus.break[1] : PAGE.focus.primary[1]}
                            >
                                <View style={{
                                    height: 30,
                                    position: 'relative',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    borderRadius: 48,
                                }}>
                                    <View style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${progressPercentage}%`,
                                        backgroundColor: isBreak ? PAGE.focus.break[0] : PAGE.focus.primary[0],
                                        borderRadius: 0,
                                    }} />

                                    <Text style={[globalStyles.label, {
                                        textAlign: 'center',
                                        zIndex: 1,
                                    }]}>
                                        {progressPercentage}%
                                    </Text>
                                </View>
                            </ShadowBox>
                        </View>
                    )}

                    {/* Stopwatch elapsed time */}
                    {settings.mode === 'stopwatch' && !showStartButton && (
                        <View style={{ alignItems: 'center', marginBottom: 100 }}>
                            <Text style={[globalStyles.body, { opacity: 0.6 }]}>
                                Elapsed time
                            </Text>
                        </View>
                    )}
                </ScrollView>
            </PageContainer>

            {/* Modals */}
            <PomodoroSettingsModal
                visible={showSettings}
                settings={settings}
                onClose={() => setShowSettings(false)}
                onSave={saveSettings}
            />

            <TagPickerModal
                visible={showTagPicker}
                selectedTag={selectedTag}
                onClose={() => setShowTagPicker(false)}
                onSelect={(tag: string) => {
                    setSelectedTag(tag);
                    setShowTagPicker(false);
                }}
            />

            <CoursePickerModal
                visible={showCoursePicker}
                selectedCourse={selectedCourse}
                onClose={() => setShowCoursePicker(false)}
                onSelect={(course: Course | null) => {
                    setSelectedCourse(course);
                    setShowCoursePicker(false);
                }}
            />
        </AppLinearGradient>
    );
}

// Course Picker Modal Component
function CoursePickerModal({ visible, selectedCourse, onClose, onSelect }: {
    visible: boolean;
    selectedCourse: Course | null;
    onClose: () => void;
    onSelect: (course: Course | null) => void;
}) {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);

    useEffect(() => {
        if (visible) {
            loadCourses();
        }
    }, [visible]);

    const loadCourses = async () => {
        if (!user) return;

        try {
            // First, let's see what columns exist by fetching one row
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .eq('user_id', user.id)
                .limit(1);

            if (error) {
                console.error('Error loading courses:', error);
                return;
            }

            if (data && data.length > 0) {
                // Check which column names exist
                const firstRow = data[0];
                console.log('Assignment columns:', Object.keys(firstRow));

                // Now fetch all assignments with the correct columns
                const { data: allData, error: allError } = await supabase
                    .from('assignments')
                    .select('*')
                    .eq('user_id', user.id);

                if (allError) throw allError;

                // Extract unique courses - adjust property names based on your schema
                const uniqueCourses = Array.from(
                    new Map(
                        allData?.map((item: any) => {
                            // Try different possible column name combinations
                            const courseName = item.class_name || item.course || item.subject || 'Unknown';
                            const courseColor = item.color || '#9576FF';

                            return [
                                courseName,
                                { id: courseName, name: courseName, color: courseColor }
                            ];
                        })
                    ).values()
                );

                setCourses(uniqueCourses as Course[]);
            }
        } catch (err) {
            console.error('Error loading courses:', err);
        }
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
                        maxHeight: '70%',
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        padding: 20,
                        borderWidth: 1.5,
                        borderColor: PAGE.focus.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[globalStyles.h3, { marginBottom: 20, textAlign: 'center' }]}>
                        Select Course
                    </Text>

                    <ScrollView style={{ maxHeight: 300 }}>
                        <Pressable
                            onPress={() => onSelect(null)}
                            style={{ marginBottom: 10 }}
                        >
                            <ShadowBox
                                contentBackgroundColor={!selectedCourse ? PAGE.focus.primary[0] : '#fff'}
                            >
                                <Text style={[globalStyles.body, { padding: 12, textAlign: 'center' }]}>
                                    None
                                </Text>
                            </ShadowBox>
                        </Pressable>

                        {courses.map((course) => (
                            <Pressable
                                key={course.id}
                                onPress={() => onSelect(course)}
                                style={{ marginBottom: 10 }}
                            >
                                <ShadowBox
                                    contentBackgroundColor={selectedCourse?.id === course.id ? course.color : '#fff'}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
                                        <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: course.color, borderWidth: 1, borderColor: '#000' }} />
                                        <Text style={globalStyles.body}>{course.name}</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        ))}

                        {courses.length === 0 && (
                            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, paddingVertical: 20 }]}>
                                No courses found. Add some assignments first!
                            </Text>
                        )}
                    </ScrollView>

                    <View style={{ marginTop: 15 }}>
                        <Pressable onPress={onClose}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                                    Close
                                </Text>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}