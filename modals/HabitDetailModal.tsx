import React, { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    Text,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { globalStyles } from '@/styles';
import { HabitWithStatus } from '@/hooks/useHabits';
import { saveTempSelectedDays } from '@/hooks/useDailyHabitOverrides';
import { getWeekDatesForDate, getHabitDate } from '@/utils/dateUtils';

interface HabitDetailModalProps {
    visible: boolean;
    habit: HabitWithStatus | null;
    onClose: () => void;
    onUpdate: () => void;
    onUndoIncrement?: (habitId: string) => void;
}

const ICON_SIZE = 20;
const ICON_TINT = COLORS.PrimaryLight;

function formatLastCompleted(dateStr?: string): string {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

function formatSelectedDays(days?: string[]): string {
    if (!days || days.length === 0) return 'Every day';
    if (days.length === 7) return 'Every day';
    const abbrev: Record<string, string> = {
        Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
        Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
    };
    return days.map(d => abbrev[d] || d).join(', ');
}

function getFrequencyLabel(habit: HabitWithStatus): string {
    if (habit.frequency === 'Weekly Goal') return 'Weekly Goal';
    if (habit.frequency === 'Weekly') return 'Weekly';
    if (habit.frequency === 'Daily') return 'Daily';
    if (habit.frequency === 'Custom') return `Every ${habit.customInterval ?? 1} ${habit.customType ?? 'days'}`;
    return habit.frequency || 'One-time';
}

function getNextAssignedDate(habit: HabitWithStatus): string {
    if (!habit.selectedDays || habit.selectedDays.length === 0 || habit.selectedDays.length === 7) {
        return 'Tomorrow';
    }
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
        const next = new Date(today);
        next.setDate(today.getDate() + i);
        const dayName = dayNames[next.getDay()];
        if (habit.selectedDays.includes(dayName)) {
            return next.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
        }
    }
    return 'N/A';
}

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ABBREV: Record<string, string> = {
    Monday: 'M', Tuesday: 'T', Wednesday: 'W', Thursday: 'Th', Friday: 'F', Saturday: 'Sa', Sunday: 'Su',
};

export default function HabitDetailModal({ visible, habit, onClose, onUpdate, onUndoIncrement }: HabitDetailModalProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [showMore, setShowMore] = useState(false);
    const [movingDay, setMovingDay] = useState(false);

    if (!habit) return null;

    const handleEdit = () => {
        onClose();
        router.push({ pathname: '/(tabs)/habits/NewHabitPage', params: { editId: habit.id, editData: JSON.stringify(habit) } });
    };

    const handleDuplicate = () => {
        onClose();
        const { id, completionHistory, completionEntries, incrementHistory, incrementAmount, streak, bestStreak, lastCompletedDate, snoozedFrom, snoozedUntil, skippedDates, archivedAt, ...rest } = habit;
        router.push({ pathname: '/(tabs)/habits/NewHabitPage', params: { editData: JSON.stringify(rest) } });
    };

    const handleArchive = () => {
        Alert.alert(
            'Archive Habit',
            'This habit will be hidden. You can restore it later.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('habits')
                                .update({ archived_at: new Date().toISOString() })
                                .eq('id', habit.id)
                                .eq('user_id', user?.id);
                            await AsyncStorage.setItem('@habits_dirty', '1');
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('Error archiving habit:', err);
                            Alert.alert('Error', 'Failed to archive habit');
                        }
                    },
                },
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Habit',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await supabase
                                .from('habits')
                                .delete()
                                .eq('id', habit.id)
                                .eq('user_id', user?.id);
                            await AsyncStorage.setItem('@habits_dirty', '1');
                            onUpdate();
                            onClose();
                        } catch (err) {
                            console.error('Error deleting habit:', err);
                            Alert.alert('Error', 'Failed to delete habit');
                        }
                    },
                },
            ]
        );
    };

    const frequencyLabel = getFrequencyLabel(habit);
    const daysLabel = formatSelectedDays(habit.selectedDays);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }} onPress={onClose}>
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
                    {/* Header: name + frequency */}
                    <View style={{ paddingTop: 20, paddingBottom: 12, paddingHorizontal: 20 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 4 }]}>
                            {habit.name}
                        </Text>
                        <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.5, textTransform: 'uppercase' }]}>
                            {frequencyLabel}
                        </Text>
                    </View>

                    {/* Divider */}
                    <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginHorizontal: 20 }} />

                    {/* Stats row - only show for repeating habits */}
                    {habit.frequency !== 'None' && habit.frequency && (
                        <>
                            <View style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingVertical: 14,
                                paddingHorizontal: 20,
                                gap: 12,
                                marginHorizontal: 20,
                                marginVertical: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: '#000',
                                backgroundColor: COLORS.PrimaryLight,
                            }}>
                                {/* Streak */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <Image source={SYSTEM_ICONS.fire} style={{ width: 18, height: 18 }} />
                                    <Text style={{ fontSize: 12, fontFamily: 'label' }}>{habit.streak ?? 0}d</Text>
                                </View>
                                {/* Best streak */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                    <Image source={SYSTEM_ICONS.fireBlue} style={{ width: 18, height: 18 }} />
                                    <Text style={{ fontSize: 12, fontFamily: 'label' }}>{habit.bestStreak ?? 0}d</Text>
                                </View>
                                {/* Points */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    backgroundColor: COLORS.RewardsBackground,
                                    borderColor: COLORS.RewardsAccent,
                                }}>
                                    <Image source={SYSTEM_ICONS.reward} style={{ width: 14, height: 14, tintColor: COLORS.Rewards }} />
                                    <Text style={{ fontSize: 12, fontFamily: 'label' }}>{habit.rewardPoints ?? 0}</Text>
                                </View>
                                {/* Completed count */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 5,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    backgroundColor: COLORS.ProgressColor,
                                    borderColor: COLORS.Secondary,
                                }}>
                                    <Image source={SYSTEM_ICONS.star} style={{ width: 14, height: 14, tintColor: COLORS.Star }} />
                                    <Text style={{ fontSize: 12, fontFamily: 'label' }}>{habit.completionHistory?.length ?? 0}</Text>
                                </View>
                            </View>
                        </>
                    )}

                    {/* Info rows */}
                    <View style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>
                        {/* Last completed */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Image source={SYSTEM_ICONS.stats} style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: ICON_TINT }} />
                            <Text style={[globalStyles.body, { fontSize: 14, opacity: 0.7 }]}>
                                {formatLastCompleted(habit.completionHistory?.length ? [...habit.completionHistory].sort().at(-1) : undefined)}
                            </Text>
                        </View>
                        {/* Next assigned */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Image source={SYSTEM_ICONS.calendar} style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: ICON_TINT }} />
                            <Text style={[globalStyles.body, { fontSize: 14, opacity: 0.7 }]}>
                                {habit.keepUntil ? 'Keep until finished' : getNextAssignedDate(habit)}
                            </Text>
                        </View>
                        {/* Frequency + days */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Image source={SYSTEM_ICONS.repeat} style={{ width: ICON_SIZE, height: ICON_SIZE, tintColor: ICON_TINT }} />
                            <Text style={[globalStyles.body, { fontSize: 14, opacity: 0.7 }]}>
                                {frequencyLabel}
                                {habit.selectedDays && habit.selectedDays.length > 0 && habit.selectedDays.length < 7
                                    ? `  ·  ${daysLabel}`
                                    : ''}
                            </Text>
                        </View>
                    </View>

                    {/* Undo increment (if applicable) */}
                    {habit.increment && onUndoIncrement && (
                        <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                            <ShadowBox
                                contentBorderRadius={20}
                                shadowBorderRadius={20}
                                contentBackgroundColor={COLORS.ProgressColor}
                            >
                                <Pressable
                                    onPress={() => { onUndoIncrement(habit.id); onClose(); }}
                                    style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}
                                >
                                    <Text style={globalStyles.body}>Undo Increment</Text>
                                </Pressable>
                            </ShadowBox>
                        </View>
                    )}

                    {/* More options toggle */}
                    <Pressable
                        onPress={() => setShowMore(!showMore)}
                        style={{ alignSelf: 'center', paddingVertical: 8, marginBottom: showMore ? 15 : 0 }}
                    >
                        <Text style={[globalStyles.body2, { fontSize: 13, opacity: 0.5 }]}>
                            {showMore ? 'Less options' : 'More options'}
                        </Text>
                    </Pressable>

                    {/* Action icons row */}
                    {showMore && (
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 28,
                            paddingBottom: 8,
                            paddingHorizontal: 20,
                        }}>
                            <Pressable onPress={handleEdit} style={{ alignItems: 'center', gap: 6 }}>
                                <ShadowBox
                                    contentBackgroundColor={COLORS.PrimaryLight}
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 2, y: 2 }}
                                >
                                    <View style={{ padding: 10 }}>
                                        <Image source={SYSTEM_ICONS.write} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                                    </View>
                                </ShadowBox>
                                <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.6 }]}>Edit</Text>
                            </Pressable>
                            <Pressable onPress={handleDuplicate} style={{ alignItems: 'center', gap: 6 }}>
                                <ShadowBox
                                    contentBackgroundColor={COLORS.PrimaryLight}
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 2, y: 2 }}
                                >
                                    <View style={{ padding: 10 }}>
                                        <Image source={SYSTEM_ICONS.duplicate} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                                    </View>
                                </ShadowBox>
                                <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.6 }]}>Duplicate</Text>
                            </Pressable>
                            <Pressable onPress={handleArchive} style={{ alignItems: 'center', gap: 6 }}>
                                <ShadowBox
                                    contentBackgroundColor={'#D3D3D3'}
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 2, y: 2 }}
                                >
                                    <View style={{ padding: 10 }}>
                                        <Image source={SYSTEM_ICONS.archive} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                                    </View>
                                </ShadowBox>
                                <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.6 }]}>Archive</Text>
                            </Pressable>
                            <Pressable onPress={handleDelete} style={{ alignItems: 'center', gap: 6 }}>
                                <ShadowBox
                                    contentBackgroundColor={'#FFE0E0'}
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 2, y: 2 }}
                                >
                                    <View style={{ padding: 10 }}>
                                        <Image source={SYSTEM_ICONS.trash} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                                    </View>
                                </ShadowBox>
                                <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.6 }]}>Delete</Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Move this week — only for Weekly habits, inside more options */}
                    {showMore && habit.frequency === 'Weekly' && (
                        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
                            {!movingDay ? (
                                <Pressable onPress={() => setMovingDay(true)}>
                                    <ShadowBox
                                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                                    >
                                        <View style={{ paddingVertical: 5, paddingHorizontal: 10, alignItems: 'center' }}>
                                            <Text style={[globalStyles.body, { fontSize: 14 }]}>
                                                {habit.tempSelectedDays && habit.tempSelectedDaysWeek
                                                    ? `Moved to ${formatSelectedDays(habit.tempSelectedDays)} this week. Change date?`
                                                    : 'Move to a different day this week'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            ) : (
                                <View style={{ gap: 20, marginTop: 10 }}>
                                    <Text style={[globalStyles.label, { fontSize: 10, opacity: 0.5, textAlign: 'center', textTransform: 'uppercase' }]}>
                                        Do it this week on:
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 }}>
                                        {ALL_DAYS.map(day => {
                                            const isOriginal = habit.selectedDays?.includes(day);
                                            const todayStr = getHabitDate(new Date(), 4, 0);
                                            const currentMonday = getWeekDatesForDate(todayStr)[0];
                                            const isOverride = habit.tempSelectedDays?.includes(day) && habit.tempSelectedDaysWeek === currentMonday;
                                            const selected = isOverride || false;
                                            return (
                                                <Pressable
                                                    key={day}
                                                    onPress={async () => {
                                                        if (!user) return;
                                                        if (isOriginal) {
                                                            await saveTempSelectedDays(habit.id, user.id, [], '');
                                                        } else {
                                                            await saveTempSelectedDays(habit.id, user.id, [day], currentMonday);
                                                        }
                                                        await AsyncStorage.setItem('@habits_dirty', '1');
                                                        setMovingDay(false);
                                                        onUpdate();
                                                        onClose();
                                                    }}
                                                    style={{ width: 36, opacity: isOriginal ? 0.5 : 1 }}
                                                >
                                                    <ShadowBox
                                                        contentBackgroundColor={isOriginal || selected ? COLORS.PrimaryLight : '#fff'}
                                                        contentBorderColor={isOriginal || selected ? '#000' : COLORS.PrimaryLight}
                                                        shadowBorderColor={isOriginal || selected ? '#000' : COLORS.PrimaryLight}
                                                        shadowColor={isOriginal ? '#000' : COLORS.PrimaryLight}
                                                    >
                                                        <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                                            <Text style={[globalStyles.body1, { fontSize: 13 }]}>
                                                                {DAY_ABBREV[day]}
                                                            </Text>
                                                        </View>
                                                    </ShadowBox>
                                                </Pressable>
                                            );
                                        })}
                                    </View>
                                    <Pressable onPress={() => setMovingDay(false)} style={{ alignSelf: 'center' }}>
                                        <ShadowBox
                                            contentBackgroundColor={'#fff'}
                                                        contentBorderColor={COLORS.PrimaryLight}
                                                        shadowBorderColor={COLORS.PrimaryLight}
                                                        shadowColor={COLORS.PrimaryLight}
                                        >
                                            <View style={{ paddingVertical: 5, paddingHorizontal: 16, alignItems: 'center' }}>
                                                <Text style={[globalStyles.body, { fontSize: 13 }]}>Cancel</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Bottom padding */}
                    <View style={{ height: 12 }} />
                </Pressable>
            </Pressable>
        </Modal>
    );
}
