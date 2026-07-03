// @/modals/AddHabitsToPathModal.tsx
import { isHabitActiveToday } from '@/utils/habitUtils';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { HABIT_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate, formatDisplayDateString } from '@/utils/dateUtils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';


const isRecurringHabit = (h: Habit) =>
    h.frequency === 'Daily' || h.frequency === 'Weekly' || h.frequency === 'Weekly Goal' || h.frequency === 'Monthly';

const getNextDueLabel = (h: Habit, todayStr: string): string | null => {
    const snoozeDay = h.snoozedUntil?.slice(0, 10);
    if (snoozeDay && snoozeDay > todayStr) return 'Snoozed';
    if (h.keepUntil) return 'Until completed';
    if (!isRecurringHabit(h)) {
        if (h.startDate > todayStr) return formatDisplayDateString(h.startDate);
        return 'Today';
    }
    return null;
};

interface HabitCardProps {
    habit: Habit;
    isChecked: boolean;
    inPath: boolean;
    pathColor: string;
    todayStr: string;
    onToggle: (id: string) => void;
}

const HabitCard = React.memo(function HabitCard({ habit, isChecked, inPath, pathColor, todayStr, onToggle }: HabitCardProps) {
    const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
    const dueLabel = getNextDueLabel(habit, todayStr);
    return (
        <Pressable onPress={() => onToggle(habit.id)} style={{ marginBottom: 12 }}>
            <ShadowBox
                contentBackgroundColor={isChecked ? (inPath ? '#fff' : COLORS.Primary) : '#fff'}
                contentBorderColor="#000"
                contentBorderWidth={1}
                shadowBorderRadius={15}
                shadowColor={inPath ? pathColor : '#000'}
            >
                <View style={s.habitRow}>
                    <View style={s.habitIconWrap}>
                        {iconFile
                            ? <Image source={iconFile} style={s.habitIcon} />
                            : <Text style={{ fontSize: 24 }}>✦</Text>
                        }
                    </View>

                    <View style={{ flex: 1, gap: 6 }}>
                        <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>{habit.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.path.primary[0], borderColor: COLORS.Primary }]}>
                                <Text style={globalStyles.label}>
                                    {isRecurringHabit(habit) ? `↻ ${habit.frequency}` : '1×'}
                                </Text>
                            </View>
                            {dueLabel && (
                                <View style={[globalStyles.bubbleLabel, { backgroundColor: '#97AFB9', borderColor: COLORS.Primary }]}>
                                    <Text style={globalStyles.label}>{dueLabel}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: isChecked ? BUTTON_COLORS.Save : 'transparent',
                        borderWidth: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        {isChecked && <Text style={{ fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
                    </View>
                </View>
            </ShadowBox>
        </Pressable>
    );
});

interface AddHabitsToPathModalProps {
    visible: boolean;
    allHabits: Habit[];
    pathHabitIds: string[];
    pathColor: string;
    pathName: string;
    resetHour: number;
    resetMin: number;
    onClose: () => void;
    onSave: (habitIds: string[]) => void;
}

export default function AddHabitsToPathModal({
    visible,
    allHabits,
    pathHabitIds,
    pathColor,
    pathName,
    resetHour,
    resetMin,
    onClose,
    onSave,
}: AddHabitsToPathModalProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set(pathHabitIds));

    const TODAY = useMemo(() => new Date(), []);
    const TODAY_STR = useMemo(() => getHabitDate(TODAY, resetHour, resetMin), [TODAY, resetHour, resetMin]);

    useEffect(() => {
        if (visible) setSelected(new Set(pathHabitIds));
    }, [visible, pathHabitIds]);

    const isActiveToday = (h: Habit) =>
        isHabitActiveToday(h, TODAY, resetHour, resetMin);

    const availableHabits = allHabits.filter(h => {
        if (h.path === pathName) return true;
        if (h.path && h.path !== pathName) return false;
        const recurring = isRecurringHabit(h);
        if (recurring) return true;
        const snoozeDay = h.snoozedUntil?.slice(0, 10);
        if (snoozeDay && snoozeDay > TODAY_STR) return true;
        const everCompleted = (h.completionHistory?.length ?? 0) > 0;
        if (h.keepUntil === true) return !everCompleted;
        if (h.startDate < TODAY_STR) return false;
        if (h.startDate === TODAY_STR && h.completionHistory?.includes(TODAY_STR)) return false;
        return true;
    });

    const isSnoozed = (h: Habit) => {
        const sd = h.snoozedUntil?.slice(0, 10);
        return !!(sd && sd > TODAY_STR);
    };

    const snoozedHabits = availableHabits.filter(isSnoozed);
    const oneTimeToday = availableHabits.filter(
        h => !isSnoozed(h) && !isRecurringHabit(h) && isActiveToday(h)
    );
    const recurring = availableHabits.filter(h => !isSnoozed(h) && isRecurringHabit(h));
    const oneTimeFuture = availableHabits.filter(
        h => !isSnoozed(h) && !isRecurringHabit(h) && h.startDate > TODAY_STR
    );

    const toggle = useCallback((id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const handleSave = () => onSave(Array.from(selected));

    const handleCancel = () => {
        setSelected(new Set(pathHabitIds));
        onClose();
    };

    const changedCount = useMemo(() => {
        const orig = new Set(pathHabitIds);
        let n = 0;
        selected.forEach(id => { if (!orig.has(id)) n++; });
        orig.forEach(id => { if (!selected.has(id)) n++; });
        return n;
    }, [selected, pathHabitIds]);

    const pathHabitIdSet = useMemo(() => new Set(pathHabitIds), [pathHabitIds]);

    const renderSection = (title: string, habits: Habit[]) => {
        if (habits.length === 0) return null;
        return (
            <View key={title} style={{ marginBottom: 16 }}>
                <Text style={[globalStyles.body, { marginBottom: 10, opacity: 0.7, fontWeight: 'bold' }]}>
                    {title} ({habits.length})
                </Text>
                {habits.map(h => (
                    <HabitCard
                        key={h.id}
                        habit={h}
                        isChecked={selected.has(h.id)}
                        inPath={pathHabitIdSet.has(h.id)}
                        pathColor={pathColor}
                        todayStr={TODAY_STR}
                        onToggle={toggle}
                    />
                ))}
            </View>
        );
    };

    const hasAny = snoozedHabits.length + oneTimeToday.length + recurring.length + oneTimeFuture.length > 0;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
            <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
                onPress={handleCancel}
            >
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: COLORS.Primary,
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={e => e.stopPropagation()}
                >
                    <View style={{ marginTop: 20, marginBottom: 10 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>
                            Add Habits
                        </Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            {selected.size > 0 ? `${selected.size} selected` : 'Select habits for this path'}
                        </Text>
                    </View>

                    <GHScrollView style={{ paddingHorizontal: 3 }}>
                        <View style={{ padding: 20, paddingTop: 10 }}>
                            {renderSection('Snoozed', snoozedHabits)}
                            {renderSection('One-time (today)', oneTimeToday)}
                            {renderSection('Recurring', recurring)}
                            {renderSection('One-time (upcoming)', oneTimeFuture)}

                            {!hasAny && (
                                <Text style={[globalStyles.body, { textAlign: 'center', opacity: 0.5, marginTop: 20 }]}>
                                    No habits available to add
                                </Text>
                            )}
                        </View>
                    </GHScrollView>

                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={changedCount === 0 ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {changedCount > 0 ? `Save (${changedCount} change${changedCount > 1 ? 's' : ''})` : 'Save'}
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

const s = StyleSheet.create({
    habitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        padding: 12,
    },
    habitIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    habitIcon: {
        width: 40,
        height: 40,
        resizeMode: 'contain' as const,
    },
});
