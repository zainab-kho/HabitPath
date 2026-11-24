// @/components/countdown/CountdownCard.tsx
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, PAGE, REWARD_COLORS } from '@/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { getCountdownParts, getDaysLeft, getProgressPct } from '@/lib/countdown/countdownMath';
import { globalStyles } from '@/styles';
import { Countdown } from '@/types/Countdown';
import ShadowBox from '@/ui/ShadowBox';

interface CountdownCardProps {
    countdown: Countdown;
    // the current time, passed in so every card on the page ticks off the same clock
    now: Date;
    onPress?: () => void;
}

// one white number box with its label underneath
function TimeBox({ value, label }: { value: number; label: string }) {
    return (
        <View style={styles.timeUnit}>
            <View style={styles.timeBox}>
                <Text style={globalStyles.body}>{value}</Text>
            </View>
            <Text style={globalStyles.label}>{label}</Text>
        </View>
    );
}

// total days left, in the same style as the rewards badge on a habit
function DaysLeftBadge({ daysLeft }: { daysLeft: number }) {
    const label = daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;

    return (
        <View style={styles.daysBadge}>
            <Image source={SYSTEM_ICONS.calendar} style={[styles.badgeIcon, { tintColor: REWARD_COLORS.Points }]} />
            <Text style={styles.badgeText}>{label}</Text>
        </View>
    );
}

// how far along the countdown is, in the same style as the progress bar on the habits page
function CountdownProgressBar({ percent, isDone }: { percent: number; isDone: boolean }) {
    return (
        <View style={styles.progressOuter}>
            <View style={styles.progressBar}>
                {percent > 0 && (
                    <View
                        style={[
                            styles.progressFill,
                            {
                                width: `${percent}%`,
                                backgroundColor: isDone ? COLORS.Accent : COLORS.Primary,
                            },
                        ]}
                    />
                )}

                <View style={styles.progressTextContainer}>
                    {/* rounded down so it never says 100% before the day actually arrives */}
                    <Text style={styles.progressText}>{isDone ? 100 : Math.floor(percent)}%</Text>
                </View>
            </View>
        </View>
    );
}

function CountdownCardBase({ countdown, now, onPress }: CountdownCardProps) {
    const target = new Date(countdown.targetAt);
    const parts = getCountdownParts(target, now);

    // boxes that would only show a leading zero are hidden:
    // no months box at 0 months, no top row at 0 months and 0 days,
    // and after that no hours box at 0 hours. minutes and seconds always show
    const showMonths = parts.months > 0;
    const showDaysRow = showMonths || parts.days > 0;
    const showHours = showDaysRow || parts.hours > 0;

    const dateLabel = target.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(countdown.hasTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });

    return (
        <Pressable onPress={onPress} style={{ marginBottom: 15 }}>
            <ShadowBox
                contentBackgroundColor={countdown.color ?? PAGE.countdown.primary[0]}
                shadowOffset={{x: 0, y: 0}}
                contentBorderRadius={25}
                shadowBorderRadius={30}
            >
                <View style={styles.card}>
                    {/* the badge floats in the corner so it doesn't push the title off center */}
                    {!parts.isDone && <DaysLeftBadge daysLeft={getDaysLeft(target, now)} />}

                    <Text style={[globalStyles.h4, styles.title]}>{countdown.title}</Text>
                    <Text style={[globalStyles.label, { marginBottom: 10 }]}>{dateLabel}</Text>

                    {parts.isDone ? (
                        <Text style={globalStyles.body}>YOU DID IT!</Text>
                    ) : (
                        <>
                            {showDaysRow && (
                                <View style={[styles.timeRow, { marginBottom: 15 }]}>
                                    {showMonths && <TimeBox value={parts.months} label="MONTHS" />}
                                    <TimeBox value={parts.days} label="DAYS" />
                                </View>
                            )}

                            <View style={styles.timeRow}>
                                {showHours && <TimeBox value={parts.hours} label="HOURS" />}
                                <TimeBox value={parts.minutes} label="MINUTES" />
                                <TimeBox value={parts.seconds} label="SECONDS" />
                            </View>
                        </>
                    )}

                    {countdown.showProgress && (
                        <CountdownProgressBar
                            percent={getProgressPct(new Date(countdown.createdAt), target, now)}
                            isDone={parts.isDone}
                        />
                    )}
                </View>
            </ShadowBox>
        </Pressable>
    );
}

// memo so a card only re-renders when its own countdown or the clock changes
export const CountdownCard = memo(CountdownCardBase);

const styles = StyleSheet.create({
    card: {
        padding: 20,
        alignItems: 'center',
    },
    // the side padding keeps a long title from running under the badge
    title: {
        marginBottom: 2,
        paddingHorizontal: 70,
        textAlign: 'center',
    },

    // time boxes
    timeRow: {
        flexDirection: 'row',
    },
    timeUnit: {
        flexDirection: 'column',
        marginHorizontal: 5,
        alignItems: 'center',
    },
    timeBox: {
        padding: 10,
        marginBottom: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        width: 50,
        backgroundColor: '#fff',
    },

    // days-left badge (copied from badge + pointsBadge in components/habits/HabitItem.tsx)
    daysBadge: {
        position: 'absolute',
        top: 15,
        right: 15,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: REWARD_COLORS.Background,
        borderColor: REWARD_COLORS.Accent,
    },
    badgeIcon: {
        width: 12,
        height: 12,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'label',
    },

    // progress bar (copied from components/habits/ProgressBar.tsx)
    progressOuter: {
        alignSelf: 'stretch',
        marginTop: 20,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
    },
    progressBar: {
        height: 30,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#fff',
        position: 'relative',
    },
    progressFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
    },
    progressTextContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3,
    },
    progressText: {
        fontSize: 12,
        fontFamily: 'label',
        color: '#000',
        fontWeight: '600',
    },
});
