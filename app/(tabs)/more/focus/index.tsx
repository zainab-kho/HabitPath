import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { PAGE, TAG_COLORS } from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { layoutStyles } from '@/styles';
import { SYSTEM_ICONS } from '@/constants/icons';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import PomodoroSettingsModal from '@/modals/PomodoroSettingsModal';
import TagPickerModal from '@/modals/TagPickerModal';
import CoursePickerModal from '@/modals/focus/CoursePickerModal';

type SessionType = 'work' | 'shortBreak' | 'longBreak';
type SessionState = 'pending' | 'active' | 'completed' | 'skipped';

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

// ─── color helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex: string) {
    // Handle rgb(...) format
    const rgbMatch = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
        return { r: parseInt(rgbMatch[1]), g: parseInt(rgbMatch[2]), b: parseInt(rgbMatch[3]) };
    }
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.substring(0, 2), 16),
        g: parseInt(h.substring(2, 4), 16),
        b: parseInt(h.substring(4, 6), 16),
    };
}

function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number) {
    let r: number, g: number, b: number;

    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
}

function rgbToHex(r: number, g: number, b: number) {
    const to = (c: number) => c.toString(16).padStart(2, '0');
    return `#${to(r)}${to(g)}${to(b)}`;
}

function clamp01(n: number) {
    return Math.max(0, Math.min(1, n));
}

/** Gradient second stop: small hue shift + saturation boost, stays bright and warm. */
function gradientShift(hex: string): string {
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    const rgb = hslToRgb((h + 0.12) % 1, clamp01(s * 3.35), clamp01(l + 0.04));
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** Accent color: complementary hue (180° flip). Boosts saturation if the source
 *  color is washed-out so the result is always visibly colourful. */
function complementaryColor(hex: string): string {
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    const newS = clamp01(Math.max(s, 0.45));   // guarantee enough saturation
    const newL = clamp01(l < 0.4 ? l + 0.15 : l > 0.75 ? l - 0.1 : l); // keep it readable
    const rgb = hslToRgb((h + 0.5) % 1, newS, newL);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ─── component ──────────────────────────────────────────────────────────────

export default function PomodoroTimer() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

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

    // Session dots: each slot = pending → active → completed | skipped
    const [sessionStates, setSessionStates] = useState<SessionState[]>(
        Array(settings.sessionsUntilLongBreak).fill('pending')
    );
    const [activeSessionIndex, setActiveSessionIndex] = useState(0);
    const [currentSessionSkipped, setCurrentSessionSkipped] = useState(false);

    // Stats: track session start time
    const sessionStartRef = useRef<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => { loadSettings(); }, [user]);

    useEffect(() => {
        setSessionStates(Array(settings.sessionsUntilLongBreak).fill('pending'));
        setActiveSessionIndex(0);
    }, [settings.sessionsUntilLongBreak]);

    const loadSettings = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('user_settings')
                .select('pomodoro_settings')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) { console.error('Error loading settings:', error); return; }

            if (data?.pomodoro_settings) {
                const s = data.pomodoro_settings;
                const loaded: PomodoroSettings = {
                    mode: s.mode || 'pomodoro',
                    workDuration: s.workDuration || 25,
                    shortBreakDuration: s.shortBreakDuration || 5,
                    longBreakDuration: s.longBreakDuration || 15,
                    sessionsUntilLongBreak: s.sessionsUntilLongBreak || 4,
                    autoStartBreaks: s.autoStartBreaks ?? true,
                    autoStartWork: s.autoStartWork ?? false,
                };
                setSettings(loaded);
                setTimeRemaining(loaded.workDuration * 60);
                setSessionStates(Array(loaded.sessionsUntilLongBreak).fill('pending'));
            }
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
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
            setSessionStates(Array(newSettings.sessionsUntilLongBreak).fill('pending'));
            setActiveSessionIndex(0);

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

    // Timer tick
    useEffect(() => {
        if (!isRunning) return;
        intervalRef.current = setInterval(() => {
            if (settings.mode === 'stopwatch') {
                setStopwatchTime(t => t + 1);
                return;
            }
            setTimeRemaining(t => {
                if (t <= 1) { setTimeout(handleSessionComplete, 0); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [isRunning, settings.mode, currentSessionType]);

    const handleSessionComplete = async (skipped = false) => {
        setIsRunning(false);

        if (settings.mode === 'stopwatch' || currentSessionType === 'work') {
            await saveWorkSession(skipped);
        }

        if (settings.mode === 'pomodoro') {
            if (currentSessionType === 'work') {
                setCurrentSessionSkipped(skipped);
                setSessionStates(prev => {
                    const next = [...prev];
                    next[activeSessionIndex] = skipped ? 'skipped' : 'completed';
                    return next;
                });

                const nextIdx = activeSessionIndex + 1;
                const isLongBreak = nextIdx % settings.sessionsUntilLongBreak === 0;
                startSession(isLongBreak ? 'longBreak' : 'shortBreak');

                if (settings.autoStartBreaks) { setShowStartButton(false); setIsRunning(true); }
            } else {
                // Break finished — advance to next work session
                const nextIdx = (activeSessionIndex + 1) % settings.sessionsUntilLongBreak;
                setActiveSessionIndex(nextIdx);
                setCurrentSessionSkipped(false);
                setSessionStates(prev => {
                    const next = [...prev];
                    if (nextIdx === 0) return Array(settings.sessionsUntilLongBreak).fill('pending');
                    next[nextIdx] = 'active';
                    return next;
                });

                startSession('work');
                if (settings.autoStartWork) { setShowStartButton(false); setIsRunning(true); }
            }
        } else {
            setShowStartButton(true);
        }
    };

    const saveWorkSession = async (skipped = false) => {
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
                started_at: sessionStartRef.current,
                skipped,
                session_index: activeSessionIndex,
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
        sessionStartRef.current = new Date().toISOString();
        setShowStartButton(false);
        setIsRunning(true);
        if (currentSessionType === 'work') {
            setSessionStates(prev => {
                const next = [...prev];
                next[activeSessionIndex] = 'active';
                return next;
            });
        }
        if (settings.mode === 'stopwatch') setStopwatchTime(0);
    };

    const handleTimerPress = () => setIsRunning(!isRunning);

    const handlePrevSession = () => {
        if (isBreak) {
            setCurrentSessionSkipped(false);
            setSessionStates(prev => {
                const next = [...prev];
                next[activeSessionIndex] = 'pending';
                return next;
            });
            setIsRunning(false);
            startSession('work');
        } else {
            const prevIdx = Math.max(0, activeSessionIndex - 1);
            setActiveSessionIndex(prevIdx);
            setSessionStates(prev => {
                const next = [...prev];
                next[activeSessionIndex] = 'pending';
                return next;
            });
            setIsRunning(false);
            startSession('work');
        }
    };

    const handleNextSession = () => handleSessionComplete(true);

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

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isBreak = currentSessionType !== 'work' && settings.mode === 'pomodoro';

    const totalDuration = currentSessionType === 'work'
        ? settings.workDuration * 60
        : currentSessionType === 'shortBreak'
            ? settings.shortBreakDuration * 60
            : settings.longBreakDuration * 60;

    const progressPercentage = settings.mode === 'stopwatch'
        ? 0
        : Math.round(((totalDuration - timeRemaining) / totalDuration) * 100);

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

    // ─── colors ─────────────────────────────────────────────────────────────

    // Background: course gradient when active, break or default otherwise
    const bgGradient: [string, string] = selectedCourse && !isBreak
        ? [selectedCourse.color, gradientShift(selectedCourse.color)]
        : isBreak
            ? [PAGE.focus.backgroundBreak[0], PAGE.focus.backgroundBreak[1]]
            : [PAGE.focus.backgroundMain[0], PAGE.focus.backgroundMain[1]];

    // Accent: complementary (spot) color of course, break pink, or default teal
    const accentColor = isBreak
        ? PAGE.focus.break[0]
        : selectedCourse
            ? complementaryColor(selectedCourse.color)
            : PAGE.focus.primary[0];

    const progressShadowColor = isBreak
        ? PAGE.focus.break[1]
        : (selectedCourse?.color ?? PAGE.focus.primary[1]);

    // ─── session dot helpers ─────────────────────────────────────────────────

    function dotColor(state: SessionState, idx: number): string {
        if (isBreak && idx === activeSessionIndex) {
            return currentSessionSkipped ? accentColor + '88' : accentColor;
        }
        switch (state) {
            case 'completed': return accentColor;
            case 'active':    return accentColor;
            case 'skipped':   return accentColor + '66';
            case 'pending':   return 'rgba(0,0,0,0.15)';
        }
    }

    function dotBorderColor(state: SessionState): string {
        return state === 'pending' ? 'rgba(0,0,0,0.2)' : accentColor;
    }

    const GradientWrapper = ({ children }: { children: React.ReactNode }) => (
        <LinearGradient
            colors={bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={layoutStyles.container}
        >
            {children}
        </LinearGradient>
    );

    // ────────────────────────────────────────────────────────────────────────

    return (
        <GradientWrapper>
            <PageContainer>
                <PageHeader
                    title={sessionLabel}
                    showBackButton
                    navigateIcon={SYSTEM_ICONS.settings}
                    onNavigatePress={() => setShowSettings(true)}
                    showPlusButton={true}
                    onPlusPress={() => setShowSettings(true)}
                />

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.focus.primary[0]} />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ flex: 1 }}>

                        {/* Session dot indicators */}
                        {settings.mode === 'pomodoro' && !showStartButton && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 10,
                                marginTop: 16,
                                marginBottom: 4,
                            }}>
                                <Pressable
                                    onPress={handlePrevSession}
                                    style={{ padding: 6, opacity: activeSessionIndex === 0 && !isBreak ? 0.25 : 1 }}
                                    disabled={activeSessionIndex === 0 && !isBreak}
                                >
                                    <Text style={{ fontSize: 18, color: accentColor, fontFamily: 'p2' }}>‹</Text>
                                </Pressable>

                                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                                    {sessionStates.map((state, idx) => {
                                        const isCurrent = idx === activeSessionIndex;
                                        const size = isCurrent ? 14 : 10;
                                        return (
                                            <View
                                                key={idx}
                                                style={{
                                                    width: size,
                                                    height: size,
                                                    borderRadius: size / 2,
                                                    backgroundColor: dotColor(state, idx),
                                                    borderWidth: isCurrent ? 2 : 1,
                                                    borderColor: dotBorderColor(state),
                                                }}
                                            />
                                        );
                                    })}
                                </View>

                                <Pressable onPress={handleNextSession} style={{ padding: 6 }}>
                                    <Text style={{ fontSize: 18, color: accentColor, fontFamily: 'p2' }}>›</Text>
                                </Pressable>
                            </View>
                        )}

                        {/* Timer */}
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Pressable
                                onPress={handleTimerPress}
                                disabled={showStartButton}
                                style={{ alignItems: 'center' }}
                            >
                                <Text style={{ fontFamily: 'p1', fontSize: 70, color: accentColor }}>
                                    {displayTime}
                                </Text>

                                {/* Course + tag chips (active only) */}
                                {!showStartButton && (selectedCourse || selectedTag) && (
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
                                        {selectedCourse && (
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 5,
                                                backgroundColor: 'rgba(0,0,0,0.12)',
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 20,
                                            }}>
                                                <View style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 4,
                                                    backgroundColor: selectedCourse.color,
                                                }} />
                                                <Text style={[globalStyles.label, { fontSize: 11, opacity: 1 }]}>
                                                    {selectedCourse.name}
                                                </Text>
                                            </View>
                                        )}
                                        {selectedTag && (
                                            <View style={{
                                                backgroundColor: TAG_COLORS[selectedTag] ?? '#e0e0e0',
                                                paddingHorizontal: 10,
                                                paddingVertical: 4,
                                                borderRadius: 20,
                                                borderWidth: 1,
                                                borderColor: 'rgba(0,0,0,0.15)',
                                            }}>
                                                <Text style={[globalStyles.label, { fontSize: 11, opacity: 1 }]}>
                                                    {selectedTag}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {!showStartButton && (
                                    <Text style={[globalStyles.label, { marginTop: 10, opacity: 0.4 }]}>
                                        {isRunning ? 'Tap to pause' : 'Tap to resume'}
                                    </Text>
                                )}
                            </Pressable>

                            {/* Pre-start: course + tag pickers + start button */}
                            {showStartButton && (
                                <View style={{ marginTop: 30, gap: 10, alignItems: 'center' }}>
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

                                    <Pressable onPress={() => setShowTagPicker(true)}>
                                        <ShadowBox contentBorderRadius={15} shadowBorderRadius={15}>
                                            <View style={{ paddingHorizontal: 15, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Image source={SYSTEM_ICONS.tag} style={{ width: 15, height: 15 }} />
                                                <Text style={globalStyles.body}>
                                                    {selectedTag || 'Add tag...'}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>

                                    <Pressable style={{ width: 100, marginTop: 10 }} onPress={handleStart}>
                                        <ShadowBox
                                            contentBorderRadius={20}
                                            shadowBorderRadius={20}
                                            contentBackgroundColor={accentColor}
                                        >
                                            <Text style={[globalStyles.body, { textAlign: 'center', paddingVertical: 6 }]}>
                                                Start
                                            </Text>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        {/* Progress bar */}
                        {settings.mode === 'pomodoro' && (
                            <View style={{ width: '80%', alignSelf: 'center', marginBottom: 100 }}>
                                <ShadowBox
                                    contentBackgroundColor={isBreak ? PAGE.focus.background[1] : '#fff'}
                                    shadowBorderWidth={1.5}
                                    shadowColor={progressShadowColor}
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
                                            left: 0, top: 0, bottom: 0,
                                            width: `${progressPercentage}%`,
                                            backgroundColor: accentColor,
                                            borderRadius: 0,
                                        }} />
                                        <Text style={[globalStyles.label, { textAlign: 'center', zIndex: 1 }]}>
                                            {progressPercentage}%
                                        </Text>
                                    </View>
                                </ShadowBox>
                            </View>
                        )}

                        {/* Stopwatch finish */}
                        {settings.mode === 'stopwatch' && !showStartButton && (
                            <>
                                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                                    <Text style={[globalStyles.body, { opacity: 0.6 }]}>Elapsed time</Text>
                                </View>
                                <Pressable
                                    onPress={() => handleSessionComplete(false)}
                                    style={{ alignItems: 'center', marginBottom: 100 }}
                                >
                                    <Text style={[globalStyles.body, { fontSize: 15, color: accentColor }]}>Finish</Text>
                                </Pressable>
                            </>
                        )}
                    </ScrollView>
                )}
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
                onSelect={(course) => {
                    setSelectedCourse(course);
                    if (course) {
                        setSelectedTag('Study');
                    } else if (selectedTag === 'Study') {
                        setSelectedTag('');
                    }
                    setShowCoursePicker(false);
                }}
            />
        </GradientWrapper>
    );
}
