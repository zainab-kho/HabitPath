// @/modals/AddHabitsToPathModal.tsx
import { isHabitActiveToday } from '@/components/habits/habitUtils';
import { BUTTON_COLORS } from '@/constants/colors';
import { HABIT_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate } from '@/utils/dateUtils';
import React, { useEffect, useState } from 'react';
import {
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

const RESET_HOUR = 4;
const RESET_MINUTE = 0;
const TODAY = new Date();
// use getHabitDate so it respects the app's reset time — same as everywhere else
const TODAY_STR = getHabitDate(TODAY, RESET_HOUR, RESET_MINUTE);

interface AddHabitsToPathModalProps {
    visible: boolean;
    allHabits: Habit[];
    pathHabitIds: string[];   // habit ids currently in this path
    pathColor: string;
    pathName: string;
    onClose: () => void;
    /** called with final set of habit ids to be in path after save */
    onSave: (habitIds: string[]) => void;
}

export default function AddHabitsToPathModal({
    visible,
    allHabits,
    pathHabitIds,
    pathColor,
    pathName,
    onClose,
    onSave,
}: AddHabitsToPathModalProps) {
    // local selection state — initialised from pathHabitIds when modal opens
    const [selected, setSelected] = useState<Set<string>>(new Set(pathHabitIds));

    useEffect(() => {
        if (visible) setSelected(new Set(pathHabitIds));
    }, [visible, pathHabitIds]);

    // ── helpers ──────────────────────────────────────────────────────────────
    const isRecurring = (h: Habit) =>
        h.frequency === 'Daily' || h.frequency === 'Weekly' || h.frequency === 'Monthly';

    const isActiveToday = (h: Habit) =>
        isHabitActiveToday(h, TODAY, RESET_HOUR, RESET_MINUTE);

    // ── filtering ────────────────────────────────────────────────────────────
    // Rules:
    //   1. already in THIS path → always show (so user can uncheck)
    //   2. belongs to a DIFFERENT path → hide
    //   3. non-recurring: only show if startDate === today (not past, not future)
    //      also hide if already completed today
    //   4. recurring: show normally
    const availableHabits = allHabits.filter(h => {
        // 1) always show habits already in this path (so user can uncheck)
        if (h.path === pathName) return true;

        // 2) belongs to a DIFFERENT path → hide
        if (h.path && h.path !== pathName) return false;

        const recurring = isRecurring(h);

        // 3) recurring habits: show normally (use your existing scheduling + completion logic elsewhere)
        if (recurring) return true;

        // ---- non-recurring habits below ----

        const everCompleted = (h.completionHistory?.length ?? 0) > 0;

        // 4) keepUntil (boolean): keep showing until EVER completed, then disappear forever
        if (h.keepUntil === true) {
            return !everCompleted;
        }

        // 5) normal one-time: only show on the start date (today), and hide if completed today
        if (h.startDate !== TODAY_STR) return false;
        if (h.completionHistory?.includes(TODAY_STR)) return false;

        return true;
    });

    // ── sorting ──────────────────────────────────────────────────────────────
    // 1. one-time habits active today (most urgent — show at top)
    const oneTimeToday = availableHabits.filter(
        h => !isRecurring(h) && isActiveToday(h)
    );
    // 2. recurring habits
    const recurring = availableHabits.filter(isRecurring);

    // ── handlers ─────────────────────────────────────────────────────────────
    const toggle = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = () => {
        onSave(Array.from(selected));
    };

    const handleCancel = () => {
        setSelected(new Set(pathHabitIds));
        onClose();
    };

    const changedCount = (() => {
        const orig = new Set(pathHabitIds);
        let n = 0;
        selected.forEach(id => { if (!orig.has(id)) n++; });
        orig.forEach(id => { if (!selected.has(id)) n++; });
        return n;
    })();

    // ── render ────────────────────────────────────────────────────────────────
    const renderHabit = (habit: Habit) => {
        const isChecked = selected.has(habit.id);
        const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
        const activeToday = isActiveToday(habit);

        return (
            <Pressable key={habit.id} onPress={() => toggle(habit.id)} style={{ marginBottom: 8, marginHorizontal: 2 }}>
                <ShadowBox
                    contentBackgroundColor={isChecked ? pathColor + '28' : '#fff'}
                    contentBorderColor={isChecked ? pathColor : 'rgba(0,0,0,0.08)'}
                    shadowBorderRadius={12}
                    shadowOffset={{ x: isChecked ? 2 : 1, y: isChecked ? 2 : 1 }}
                    shadowColor={isChecked ? pathColor : '#000'}
                >
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                    }}>
                        {/* icon */}
                        <View style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            backgroundColor: isChecked ? pathColor + '44' : 'rgba(0,0,0,0.05)',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {iconFile
                                ? <Image source={iconFile} style={{ width: 22, height: 22 }} />
                                : <Text style={{ fontSize: 14 }}>✦</Text>
                            }
                        </View>

                        {/* name + meta */}
                        <View style={{ flex: 1, gap: 3 }}>
                            <Text style={globalStyles.body} numberOfLines={1}>{habit.name}</Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                {/* frequency bubble */}
                                <View style={[globalStyles.bubbleLabel, { backgroundColor: '#f0f0f0', borderColor: 'transparent' }]}>
                                    <Text style={globalStyles.label}>{habit.frequency || 'One-time'}</Text>
                                </View>
                                {/* "today" badge */}
                                {activeToday && (
                                    <View style={[globalStyles.bubbleLabel, { backgroundColor: pathColor + '33', borderColor: pathColor + '66' }]}>
                                        <Text style={[globalStyles.label, { color: '#444' }]}>today</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* checkbox */}
                        <View style={{
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            borderWidth: 1.5,
                            borderColor: isChecked ? pathColor : 'rgba(0,0,0,0.2)',
                            backgroundColor: isChecked ? pathColor : 'transparent',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {isChecked && <Text style={{ color: '#fff', fontSize: 13, lineHeight: 16 }}>✓</Text>}
                        </View>
                    </View>
                </ShadowBox>
            </Pressable>
        );
    };

    const Section = ({ title, habits }: { title: string; habits: Habit[] }) => {
        if (habits.length === 0) return null;
        return (
            <View style={{ marginBottom: 16 }}>
                <Text style={[globalStyles.body, { fontWeight: 'bold', marginBottom: 10, opacity: 0.7 }]}>
                    {title} ({habits.length})
                </Text>
                {habits.map(renderHabit)}
            </View>
        );
    };

    const hasAny = oneTimeToday.length + recurring.length > 0;

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
                        borderColor: pathColor,
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={e => e.stopPropagation()}
                >
                    {/* header */}
                    <View style={{ marginTop: 20, marginBottom: 10, paddingHorizontal: 20 }}>
                        <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>
                            Add Habits
                        </Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            {selected.size > 0 ? `${selected.size} selected` : 'Select habits for this path'}
                        </Text>
                    </View>

                    {/* list */}
                    <ScrollView style={{ paddingHorizontal: 3 }}>
                        <View style={{ padding: 20 }}>
                            <Section title="One-time (today only)" habits={oneTimeToday} />
                            <Section title="Recurring" habits={recurring} />

                            {!hasAny && (
                                <Text style={[globalStyles.body, { textAlign: 'center', opacity: 0.5, marginTop: 20 }]}>
                                    No habits available to add
                                </Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* action buttons — same pattern as AddAssignmentToDaySheet */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)', padding: 10, gap: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={changedCount === 0 ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Done}
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