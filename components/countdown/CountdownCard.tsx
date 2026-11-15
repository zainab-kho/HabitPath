// @/components/countdown/CountdownCard.tsx
import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { getCountdownParts, getDaysLeft, getProgressPct } from '@/lib/countdown/countdownMath';
import { globalStyles } from '@/styles';
import { Countdown } from '@/types/Countdown';
import ShadowBox from '@/ui/ShadowBox';

interface CountdownCardProps {
    countdown: Countdown;
    now: Date;
    onPress?: () => void;
}

function TimeBox({ value, label }: { value: number; label: string }) {
    return (
        <View style={styles.unit}>
            <View style={styles.box}>
                <Text style={globalStyles.body}>{value}</Text>
            </View>
            <Text style={globalStyles.label}>{label}</Text>
        </View>
    );
}

function CountdownCardBase({ countdown, now, onPress }: CountdownCardProps) {
    const target = new Date(countdown.targetAt);
    const parts = getCountdownParts(target, now);

    const showMonths = parts.months > 0;
    const showDaysRow = showMonths || parts.days > 0;
    const showHours = showDaysRow || parts.hours > 0;

    const progressPct = getProgressPct(new Date(countdown.createdAt), target, now);

    // total calendar days left, for the badge
    const daysLeft = getDaysLeft(target, now);
    const daysLeftLabel = daysLeft === 0 ? 'Today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;

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
                contentBorderRadius={25}
                shadowBorderRadius={30}
            >
                <View style={{ padding: 20, alignItems: 'center', }}>
                    {/* days-left badge — same style as the habit rewards badge.
                        absolutely positioned so the title stays centered */}
                    {!parts.isDone && (
                        <View style={styles.daysBadge}>
                            <Image
                                source={SYSTEM_ICONS.calendar}
                                style={[styles.badgeIcon, { tintColor: COLORS.Rewards }]}
                            />
                            <Text style={styles.badgeText}>{daysLeftLabel}</Text>
                        </View>
                    )}

                    {/* side padding keeps long titles from running under the badge */}
                    <Text style={[globalStyles.h4, { marginBottom: 2, paddingHorizontal: 70, textAlign: 'center' }]}>
                        {countdown.title}
                    </Text>
                    <Text style={[globalStyles.label, { marginBottom: 10 }]}>{dateLabel}</Text>

                    {parts.isDone ? (
                        <Text style={globalStyles.body}>YOU DID IT!</Text>
                    ) : (
                        <>
                            {/* leading zeros are hidden: 0 months → no MONTHS box,
                                0 months + 0 days → no top row, and then 0 hours → no HOURS box.
                                minutes + seconds always show */}
                            {showDaysRow && (
                                <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                    {showMonths && <TimeBox value={parts.months} label="MONTHS" />}
                                    <TimeBox value={parts.days} label="DAYS" />
                                </View>
                            )}

                            <View style={{ flexDirection: 'row' }}>
                                {showHours && <TimeBox value={parts.hours} label="HOURS" />}
                                <TimeBox value={parts.minutes} label="MINUTES" />
                                <TimeBox value={parts.seconds} label="SECONDS" />
                            </View>
                        </>
                    )}

                    {/* progress since the countdown was created — same look as the habits bar */}
                    {countdown.showProgress && (
                        <View style={styles.progressOuter}>
                            <View style={styles.progressBar}>
                                {progressPct > 0 && (
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${progressPct}%`,
                                                backgroundColor: parts.isDone ? COLORS.PrimaryLight : COLORS.Primary,
                                            },
                                        ]}
                                    />
                                )}
                                <View style={styles.progressTextContainer}>
                                    {/* floor so it never says 100% before it's actually here */}
                                    <Text style={styles.progressText}>
                                        {parts.isDone ? 100 : Math.floor(progressPct)}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ShadowBox>
        </Pressable>
    );
}

export const CountdownCard = memo(CountdownCardBase);

const styles = StyleSheet.create({
    // matches badge + pointsBadge in components/habits/HabitItem.tsx
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
        backgroundColor: COLORS.RewardsBackground,
        borderColor: COLORS.RewardsAccent,
    },
    // progress bar — matches components/habits/ProgressBar.tsx
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
    badgeIcon: {
        width: 12,
        height: 12,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'label',
    },
    unit: {
        flexDirection: 'column',
        marginHorizontal: 5,
        alignItems: 'center',
    },
    box: {
        padding: 10,
        marginBottom: 5,
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        width: 50,
        backgroundColor: '#fff',
    },
});
