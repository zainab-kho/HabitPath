// VERY VERY MESSY PAGE - JUST FOR SANITY

import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Habit } from '@/types/Habit';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS, HABIT_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { HabitWithStatus } from '@/hooks/useHabits';

interface Path {
    id: string;
    name: string;
    color: string;
    user_id: string;
}

interface HabitDetailModalProps {
    visible: boolean;
    habit: HabitWithStatus | null;
    onClose: () => void;
    onUpdate: () => void;
}

const REWARD_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50];
const FREQUENCIES = ['Daily', 'Weekly', 'No Repeat'];
const TIMES_OF_DAY = ['Wake Up', 'Morning', 'Anytime', 'Afternoon', 'Evening', 'Bed Time'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HabitDetailModal({ visible, habit, onClose, onUpdate }: HabitDetailModalProps) {
    const { user } = useAuth();
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedHabit, setEditedHabit] = useState<HabitWithStatus | null>(null);
    const [paths, setPaths] = useState<Path[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (habit && visible) {
            setEditedHabit({ ...habit });
            setIsEditMode(false);
        }
    }, [visible, habit]);

    useEffect(() => {
        if (visible) {
            loadPaths();
        }
    }, [visible]);

    const loadPaths = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('paths')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading paths:', error);
                return;
            }

            setPaths(data || []);
        } catch (err) {
            console.error('Error loading paths:', err);
        }
    };

    if (!habit || !editedHabit) return null;

    const handleFrequencyChange = (freq: string) => {
        setEditedHabit(prev => {
            if (!prev) return null;

            if (freq === 'Weekly') {
                const dayIndex = new Date(prev.startDate).getDay();
                return { ...prev, frequency: freq, selectedDays: [WEEK_DAYS[dayIndex]] };
            }

            return { ...prev, frequency: freq, selectedDays: [] };
        });
    };

    const toggleDay = (day: string) => {
        setEditedHabit(prev => {
            if (!prev) return null;

            const currentDays = prev.selectedDays || [];
            const newDays = currentDays.includes(day)
                ? currentDays.filter(d => d !== day)
                : [...currentDays, day];

            return { ...prev, selectedDays: newDays };
        });
    };

    const handleSave = async () => {
        if (!editedHabit || !user) return;

        setIsSaving(true);

        try {
            // Update cache
            const cachedHabits = await AsyncStorage.getItem('@habits');
            if (cachedHabits) {
                const habits: Habit[] = JSON.parse(cachedHabits);
                const updatedHabits = habits.map(h =>
                    h.id === editedHabit.id ? editedHabit : h
                );
                await AsyncStorage.setItem('@habits', JSON.stringify(updatedHabits));
            }

            // Update Supabase
            const { error } = await supabase
                .from('habits')
                .update({
                    name: editedHabit.name,
                    icon: editedHabit.icon,
                    frequency: editedHabit.frequency,
                    selected_days: editedHabit.selectedDays,
                    selected_time_of_day: editedHabit.selectedTimeOfDay,
                    path: editedHabit.path,
                    path_color: editedHabit.pathColor,
                    reward_points: editedHabit.rewardPoints,
                    start_date: editedHabit.startDate,
                })
                .eq('id', editedHabit.id)
                .eq('user_id', user.id);

            if (error) throw error;

            setIsEditMode(false);
            onUpdate();
            Alert.alert('Success', 'Habit updated!');
        } catch (error) {
            console.error('Error updating habit:', error);
            Alert.alert('Error', 'Failed to update habit');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure you want to delete this habit? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Delete from cache
                            const cachedHabits = await AsyncStorage.getItem('@habits');
                            if (cachedHabits) {
                                const habits: Habit[] = JSON.parse(cachedHabits);
                                const filtered = habits.filter(h => h.id !== habit.id);
                                await AsyncStorage.setItem('@habits', JSON.stringify(filtered));
                            }

                            // Delete from Supabase
                            await supabase
                                .from('habits')
                                .delete()
                                .eq('id', habit.id)
                                .eq('user_id', user?.id);

                            onUpdate();
                            onClose();
                        } catch (error) {
                            console.error('Error deleting habit:', error);
                            Alert.alert('Error', 'Failed to delete habit');
                        }
                    },
                },
            ]
        );
    };

    const handleCancel = () => {
        setIsEditMode(false);
        setEditedHabit({ ...habit });
        onClose();
    };

    const totalEarned = editedHabit.completionEntries?.reduce((sum, entry) => sum + (entry.pointsEarned || 0), 0) || 0;

    const habitIconFile = editedHabit.icon ? HABIT_ICONS[editedHabit.icon] : null;

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
                        borderColor: PAGE.habits.primary[0],
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Header Buttons */}
                    <View style={styles.headerButtons}>
                        <ShadowBox
                            contentBackgroundColor={BUTTON_COLORS.Edit}
                            style={{}}
                        >
                            <Pressable
                                style={{ padding: 6 }}
                                onPress={() => setIsEditMode(!isEditMode)}
                            >
                                <Image source={SYSTEM_ICONS.settings} style={styles.headerButtonIcon} />
                            </Pressable>
                        </ShadowBox>

                        <ShadowBox
                            contentBackgroundColor={BUTTON_COLORS.Cancel}
                        >
                            <Pressable
                                style={{ padding: 6 }}
                                onPress={handleCancel}
                            >
                                <Image source={SYSTEM_ICONS.back} style={styles.headerButtonIcon} />
                            </Pressable>
                        </ShadowBox>
                    </View>

                    {/* Header with Icon and Name */}
                    <View style={styles.header}>
                        <View style={styles.iconNameRow}>
                            <View style={{
                                backgroundColor: editedHabit.pathColor || COLORS.Primary,
                                borderWidth: 1,
                                borderRadius: 50
                            }}>
                                {habitIconFile ? (
                                    <Image source={habitIconFile} style={{ width: 40, height: 40, margin: 5 }} />
                                ) : (
                                    <Text style={styles.habitIconEmoji}>{editedHabit.icon}</Text>
                                )}
                            </View>

                            {isEditMode ? (
                                <TextInput
                                    style={[globalStyles.h4, styles.nameInput]}
                                    value={editedHabit.name}
                                    onChangeText={(text) => setEditedHabit(prev => prev ? { ...prev, name: text } : null)}
                                    placeholder="Habit name"
                                />
                            ) : (
                                <Text style={[globalStyles.h4, { flex: 1 }]}>{editedHabit.name}</Text>
                            )}
                        </View>
                    </View>

                    {/* Scrollable Content */}
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Stats Bubbles */}
                        {!isEditMode && (
                            <View style={styles.statsRow}>
                                <StatBubble
                                    icon={SYSTEM_ICONS.reward}
                                    value={`${totalEarned}`}
                                    label="Total Earned"
                                    backgroundColor="#fff4e6"
                                />
                                <StatBubble
                                    icon={SYSTEM_ICONS.fire}
                                    value={editedHabit.streak || 0}
                                    label="Current Streak"
                                    backgroundColor="#ffe6e6"
                                />
                                <StatBubble
                                    icon={SYSTEM_ICONS.fire}
                                    value={editedHabit.bestStreak || 0}
                                    label="Best Streak"
                                    backgroundColor="#e6f3ff"
                                />
                                <StatBubble
                                    value={editedHabit.completionHistory?.length || 0}
                                    label="Completed"
                                    backgroundColor="#e6ffe6"
                                />
                            </View>
                        )}

                        {/* View or Edit Mode */}
                        {!isEditMode ? (
                            <>
                                <ViewMode habit={editedHabit} />
                                <Last7Days habit={editedHabit} />
                            </>
                        ) : (
                            <EditMode
                                editedHabit={editedHabit}
                                setEditedHabit={setEditedHabit}
                                paths={paths}
                                handleFrequencyChange={handleFrequencyChange}
                                toggleDay={toggleDay}
                                handleDelete={handleDelete}
                            />
                        )}
                    </ScrollView>

                    {/* Sticky Save Button (only in edit mode) */}
                    {isEditMode && (
                        <View style={{ marginTop: 10 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Done}
                                contentBorderRadius={20}
                                shadowBorderRadius={20}
                            >
                                <Pressable
                                    onPress={handleSave}
                                    disabled={isSaving}
                                    style={{ paddingVertical: 5, paddingHorizontal: 15, }}
                                >
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Text>
                                </Pressable>
                            </ShadowBox>
                        </View>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ============================================================================
// STAT BUBBLE
// ============================================================================

const StatBubble = ({ icon, value, label, backgroundColor }: any) => (
    <View style={styles.statBubbleContainer}>
        <View style={[globalStyles.bubbleLabel, { backgroundColor, padding: 5 }]}>
            {icon && <Image source={icon} style={styles.statIcon} />}
            <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

// ============================================================================
// VIEW MODE
// ============================================================================

const ViewMode = ({ habit }: { habit: Habit }) => {
    const localLastCompleted = habit.lastCompletedDate ? new Date(habit.lastCompletedDate) : null;

    if (localLastCompleted) {
        localLastCompleted.setMinutes(localLastCompleted.getMinutes() + localLastCompleted.getTimezoneOffset());
    }

    return (
        <View style={styles.infoCard}>
            <View style={styles.infoRow}>
                <Image source={SYSTEM_ICONS.repeat} style={styles.infoIcon} />
                <Text style={styles.infoText}>
                    {habit.frequency || 'No Repeat'} • {habit.selectedTimeOfDay || 'Anytime'}
                </Text>
            </View>

            {habit.path && habit.path !== 'None' && (
                <View style={styles.infoRow}>
                    <View style={[styles.pathDot, { backgroundColor: habit.pathColor || COLORS.Primary }]} />
                    <Text style={styles.infoText}>Path: {habit.path}</Text>
                </View>
            )}

            {localLastCompleted && (
                <View style={styles.infoRow}>
                    <Image source={SYSTEM_ICONS.calendar} style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        Last: {localLastCompleted.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                </View>
            )}

            <View style={styles.infoRow}>
                <Image source={SYSTEM_ICONS.reward} style={styles.infoIcon} />
                <Text style={styles.infoText}>{habit.rewardPoints || 0} pts per completion</Text>
            </View>
        </View>
    );
};

// ============================================================================
// EDIT MODE
// ============================================================================

const EditMode = ({ editedHabit, setEditedHabit, paths, handleFrequencyChange, toggleDay, handleDelete }: any) => (
    <View style={{ paddingVertical: 20, gap: 15 }}>
        {/* Points */}
        <OptionPicker
            label="POINTS PER COMPLETION"
            options={REWARD_OPTIONS.map(p => ({ value: p, label: `${p} pts` }))}
            selected={editedHabit.rewardPoints}
            onSelect={(points: number) => setEditedHabit((prev: any) => prev ? { ...prev, rewardPoints: points } : null)}
            color="#ffd700"
        />

        {/* Time of Day */}
        <OptionPicker
            label="TIME OF DAY"
            options={TIMES_OF_DAY.map(t => ({ value: t, label: t }))}
            selected={editedHabit.selectedTimeOfDay}
            onSelect={(time: string) => setEditedHabit((prev: any) => prev ? { ...prev, selectedTimeOfDay: time } : null)}
            color="#6dddff"
        />

        {/* Frequency */}
        <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>FREQUENCY</Text>
            <View style={styles.pickerContainer}>
                {FREQUENCIES.map(freq => (
                    <Pressable
                        key={freq}
                        onPress={() => handleFrequencyChange(freq)}
                        style={[
                            styles.pickerButton,
                            {
                                borderColor: editedHabit.frequency === freq ? '#000' : '#b66dff',
                                shadowColor: editedHabit.frequency === freq ? '#000' : '#b66dff',
                                backgroundColor: editedHabit.frequency === freq ? '#b66dff' : '#fff',
                            }
                        ]}
                    >
                        <Text style={styles.pickerButtonText}>{freq}</Text>
                    </Pressable>
                ))}

                {editedHabit.frequency === 'Weekly' && (
                    <View style={{ width: '100%', marginTop: 10 }}>
                        <Text style={[styles.pickerLabel, { marginBottom: 8 }]}>Select Days:</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {WEEK_DAYS.map(day => (
                                <Pressable
                                    key={day}
                                    onPress={() => toggleDay(day)}
                                    style={[
                                        styles.pickerButton,
                                        {
                                            borderColor: editedHabit.selectedDays?.includes(day) ? '#000' : '#b66dff',
                                            shadowColor: editedHabit.selectedDays?.includes(day) ? '#000' : '#b66dff',
                                            backgroundColor: editedHabit.selectedDays?.includes(day) ? '#b66dff' : '#fff',
                                        }
                                    ]}
                                >
                                    <Text style={styles.pickerButtonText}>{day}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        </View>

        {/* Path */}
        <View style={styles.pickerSection}>
            <Text style={styles.pickerLabel}>PATH</Text>
            <View style={styles.pickerContainer}>
                {paths.length === 0 ? (
                    <Text style={styles.emptyText}>No paths created yet. Create one in the Paths tab!</Text>
                ) : (
                    <>
                        <Pressable
                            onPress={() => setEditedHabit((prev: any) => prev ? { ...prev, path: 'None', pathColor: undefined } : null)}
                            style={[
                                styles.pickerButton,
                                {
                                    backgroundColor: (!editedHabit.path || editedHabit.path === 'None') ? '#ff9752' : '#fff',
                                    borderColor: '#000',
                                    shadowColor: '#000',
                                }
                            ]}
                        >
                            <Text style={styles.pickerButtonText}>None</Text>
                        </Pressable>

                        {paths.map((path: any) => (
                            <Pressable
                                key={path.id}
                                onPress={() => setEditedHabit((prev: any) => prev ? { ...prev, path: path.name, pathColor: path.color } : null)}
                                style={[
                                    styles.pickerButton,
                                    {
                                        backgroundColor: editedHabit.path === path.name ? path.color : '#fff',
                                        borderColor: editedHabit.path === path.name ? '#000' : path.color,
                                        shadowColor: editedHabit.path === path.name ? '#000' : path.color,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                    }
                                ]}
                            >
                                <View style={[styles.pathDot, { backgroundColor: path.color, width: 12, height: 12 }]} />
                                <Text style={styles.pickerButtonText}>{path.name}</Text>
                            </Pressable>
                        ))}
                    </>
                )}
            </View>
        </View>

        {/* Delete Button - At the bottom of ScrollView */}
        <View style={{ marginTop: 20, marginBottom: 10 }}>
            <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Delete}
                contentBorderRadius={20}
                shadowBorderRadius={20}
            >
                <Pressable
                    onPress={handleDelete}
                    style={{ paddingVertical: 5, paddingHorizontal: 15, }}
                >
                    <Text style={[globalStyles.body, { color: '#fff', textAlign: 'center' }]}>
                        Delete Habit
                    </Text>
                </Pressable>
            </ShadowBox>
        </View>
    </View>
);

// ============================================================================
// OPTION PICKER
// ============================================================================

const OptionPicker = ({ label, options, selected, onSelect, color }: any) => (
    <View style={styles.pickerSection}>
        <Text style={styles.pickerLabel}>{label}</Text>
        <View style={styles.pickerContainer}>
            {options.map((option: any) => (
                <Pressable
                    key={option.value}
                    onPress={() => onSelect(option.value)}
                    style={[
                        styles.pickerButton,
                        {
                            borderColor: selected === option.value ? '#000' : color,
                            shadowColor: selected === option.value ? '#000' : color,
                            backgroundColor: selected === option.value ? color : '#fff',
                        }
                    ]}
                >
                    <Text style={styles.pickerButtonText}>{option.label}</Text>
                </Pressable>
            ))}
        </View>
    </View>
);

// ============================================================================
// LAST 7 DAYS
// ============================================================================

const Last7Days = ({ habit }: { habit: Habit }) => (
    <View style={styles.last7DaysCard}>
        <Text style={styles.last7DaysTitle}>Last 7 Days</Text>
        <View style={styles.last7DaysRow}>
            {Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const dateStr = date.toISOString().split('T')[0];
                const isCompleted = habit.completionHistory?.includes(dateStr);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })[0];

                return (
                    <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                        <View style={[
                            styles.dayCircle,
                            { backgroundColor: isCompleted ? (habit.pathColor || COLORS.Primary) : '#fff' }
                        ]} />
                        <Text style={styles.dayLabel}>{dayName}</Text>
                    </View>
                );
            })}
        </View>
        <Text style={styles.completionRate}>
            {(() => {
                const last30 = Array.from({ length: 30 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    return d.toISOString().split('T')[0];
                });
                const completed = last30.filter(d => habit.completionHistory?.includes(d)).length;
                return `${completed}/30 days (${Math.round((completed / 30) * 100)}%)`;
            })()}
        </Text>
    </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
    headerButtons: {
        flexDirection: 'row',
        gap: 10,
        alignSelf: 'flex-end',
        right: 0,
        zIndex: 10,
        marginBottom: 10,
    },
    headerButtonIcon: {
        width: 17,
        height: 17,
    },
    header: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        marginBottom: 10,
    },
    iconNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    habitIconEmoji: {
        fontSize: 35,
    },
    nameInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fff',
    },
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingVertical: 15,
        justifyContent: 'center',
    },
    statBubbleContainer: {
        alignItems: 'center',
        gap: 5,
    },
    statIcon: {
        width: 15,
        height: 15,
    },
    statValue: {
        fontFamily: 'p2',
        fontSize: 12,
    },
    statLabel: {
        fontFamily: 'label',
        fontSize: 10,
    },
    infoCard: {
        marginTop: 15,
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    infoIcon: {
        width: 15,
        height: 15,
    },
    infoText: {
        fontFamily: 'label',
        fontSize: 14,
    },
    pathDot: {
        width: 15,
        height: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#000',
    },
    pickerSection: {
        marginBottom: 15,
    },
    pickerLabel: {
        fontFamily: 'label',
        fontSize: 11,
        color: 'rgba(0,0,0,0.7)',
        marginBottom: 8,
    },
    pickerContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pickerButton: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    pickerButtonText: {
        fontSize: 11,
        fontFamily: 'label',
    },
    emptyText: {
        fontFamily: 'label',
        fontSize: 12,
        color: 'rgba(0,0,0,0.6)',
        textAlign: 'center',
        padding: 10,
    },
    last7DaysCard: {
        marginTop: 15,
        marginBottom: 20,
        padding: 20,
        backgroundColor: '#9576FF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    last7DaysTitle: {
        fontFamily: 'p2',
        fontSize: 13,
        marginBottom: 10,
    },
    last7DaysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayCircle: {
        width: 20,
        height: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    dayLabel: {
        fontSize: 10,
        fontFamily: 'label',
    },
    completionRate: {
        fontSize: 12,
        fontFamily: 'p2',
        textAlign: 'center',
        marginTop: 10,
    },
});