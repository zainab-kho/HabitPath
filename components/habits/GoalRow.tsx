// @/components/habits/GoalRow.tsx
// A read-only habit card for the All Goals list. Same shape as HabitItem, but
// without the checkbox, swipe actions or any notion of "today" — this list spans
// every habit, so it describes a habit rather than tracking it. Tapping opens the
// detail modal, where Edit / Duplicate / Archive / Delete live.
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import { formatDisplayDateString, formatLocalDate, parseLocalDate } from '@/utils/dateUtils';
import { getDateLabel } from '@/utils/dateUtils';
import { getNextOccurrence } from '@/utils/habitUtils';

interface GoalRowProps {
    habit: Habit;
    onPress: () => void;
    /** next scheduled day as YYYY-MM-DD; null when it never comes up again */
    nextDate?: string | null;
    /** today, for reading nextDate as Today / Tomorrow */
    todayStr?: string;
}

// "Daily", "Mon, Wed", "Every 3 weeks", "Once"...
function frequencyLabel(habit: Habit): string {
    const { frequency, selectedDays, customType, customInterval } = habit;

    if (frequency === 'Weekly' && selectedDays?.length) {
        return selectedDays.map(d => d.slice(0, 3)).join(', ');
    }
    if (frequency === 'Custom') {
        const unit = customType === 'weekly' ? 'week' : customType === 'monthly' ? 'month' : 'day';
        const n = customInterval ?? 2;
        return `Every ${n === 1 ? unit : `${n} ${unit}s`}`;
    }
    if (!frequency || frequency === 'None') return 'Once';
    return frequency;
}

// "Today" / "Tomorrow" / "Mon, Oct 20"
function nextLabel(nextDate: string | null | undefined, todayStr: string | undefined): string | null {
    if (!nextDate) return null;
    if (!todayStr) return formatDisplayDateString(nextDate);
    if (nextDate === todayStr) return 'Today';

    const tomorrow = parseLocalDate(todayStr);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (nextDate === formatLocalDate(tomorrow)) return 'Tomorrow';

    return formatDisplayDateString(nextDate);
}

export default function GoalRow({ habit, onPress, nextDate, todayStr }: GoalRowProps) {
    const habitIconFile = HABIT_ICONS[habit.icon];
    const habitColor = habit.pathColor || COLORS.Primary;
    const isInbox = !habit.startDate;
    const nextUp = nextLabel(nextDate, todayStr);

    return (
        <ShadowBox
            style={styles.container}
            contentBorderColor="#000"
            contentBorderWidth={1}
            shadowBorderRadius={15}
            shadowOffset={{ x: 0, y: 5 }}
            shadowColor={habitColor}
        >
            <Pressable onPress={onPress} style={styles.content}>
                <View style={styles.mainRow}>
                    <View style={styles.iconContainer}>
                        {habitIconFile && <Image source={habitIconFile} style={styles.iconImage} />}
                    </View>

                    <View style={styles.textSection}>
                        <Text style={[globalStyles.body, { fontSize: 15 }]}>{habit.name}</Text>

                        <View style={styles.badgesRow}>
                            {/* unscheduled habits live on the inbox page */}
                            {isInbox && (
                                <View style={[styles.badge, { backgroundColor: COLORS.PrimaryLight, borderColor: COLORS.Primary }]}>
                                    <Text style={styles.badgeText}>Inbox</Text>
                                </View>
                            )}

                            {habit.lastCompletedDate &&
                                <View style={[styles.badge, { backgroundColor: COLORS.ProgressColor, borderColor: '#000', }]}>
                                    <Image
                                        source={SYSTEM_ICONS.stats}
                                        style={[styles.badgeIcon, { tintColor: COLORS.PrimaryLight }]}
                                    />
                                    <Text style={styles.badgeText}>{getDateLabel(parseLocalDate(habit.lastCompletedDate))}</Text>
                                </View>
                            }

                            {nextDate &&
                                <View style={[styles.badge, { backgroundColor: COLORS.PrimaryLight, borderColor: '#000' }]}>
                                    <Image
                                        source={SYSTEM_ICONS.calendar}
                                        style={[styles.badgeIcon, { tintColor: COLORS.Primary }]}
                                    />
                                    <Text style={styles.badgeText}>{getDateLabel(parseLocalDate(nextDate))}</Text>
                                </View>
                            }

                            {/* points */}
                            {!!habit.rewardPoints && habit.rewardPoints > 0 && (
                                <View style={[styles.badge, styles.pointsBadge]}>
                                    <Image
                                        source={SYSTEM_ICONS.reward}
                                        style={[styles.badgeIcon, { tintColor: COLORS.Rewards }]}
                                    />
                                    <Text style={styles.badgeText}>{habit.rewardPoints}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <Image
                        source={SYSTEM_ICONS.sortRight}
                        style={styles.chevron}
                    />
                </View>
            </Pressable>
        </ShadowBox>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        overflow: 'visible',
    },
    content: {
        padding: 12,
    },
    mainRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    iconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconImage: {
        width: 40,
        height: 40,
        resizeMode: 'contain',
    },
    textSection: {
        flex: 1,
        gap: 6,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeIcon: {
        width: 12,
        height: 12,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'label',
    },
    pointsBadge: {
        backgroundColor: COLORS.RewardsBackground,
        borderColor: COLORS.RewardsAccent,
    },
    chevron: {
        width: 14,
        height: 14,
        tintColor: 'rgba(0,0,0,0.3)',
    },
});
