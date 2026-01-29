// components/habits/ProgressBar.tsx
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
    totalHabits: number;
    completedHabits: number;
    earnedPoints: number;
    totalPossiblePoints: number;
    appStreak: number;
}

export default function ProgressBar({
    totalHabits,
    completedHabits,
    earnedPoints,
    totalPossiblePoints,
    appStreak,
}: ProgressBarProps) {
    const router = useRouter();
    const progressPercentage =
        totalHabits > 0
            ? Math.min((completedHabits / totalHabits) * 100, 100)
            : 0;

    return (
        <View style={styles.container}>
            {/* points badge */}
            <Pressable>
                <ShadowBox
                    contentBorderColor={COLORS.RewardsAccent}
                    shadowColor={COLORS.RewardsAccent}
                    shadowBorderColor={COLORS.RewardsAccent}
                >
                    <View style={styles.badgeContent}>
                        <Image
                            source={SYSTEM_ICONS.reward}
                            style={[styles.badgeIcon, { tintColor: COLORS.Rewards }]}
                        />
                        <Text style={styles.badgeText}>
                            {earnedPoints ?? 0}/{totalPossiblePoints ?? 0}
                        </Text>
                    </View>
                </ShadowBox>
            </Pressable>

            {/* progress bar */}
            <View style={styles.progressBarContainer}>
                <ShadowBox borderRadius={20}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${progressPercentage}%` },
                            ]}
                        />
                        <View style={styles.progressTextContainer}>
                            <Text style={styles.progressText}>
                                {Math.round(progressPercentage)}% ({completedHabits ?? 0}/{totalHabits ?? 0})
                            </Text>
                        </View>
                    </View>
                </ShadowBox>
            </View>

            {/* app streak badge */}
            <ShadowBox
                contentBorderColor={COLORS.StreakAccent}
                shadowColor={COLORS.StreakAccent}
                shadowBorderColor={COLORS.StreakAccent}
            >
                <View style={styles.badgeContent}>
                    <Image source={SYSTEM_ICONS.fire} style={styles.badgeIcon} />
                    <Text style={styles.badgeText}>{appStreak ?? 0}d</Text>
                </View>
            </ShadowBox>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
        height: 35,
    },
    badgeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    badgeIcon: {
        width: 15,
        height: 15,
    },

    badgeText: {
        fontFamily: 'label',
        fontSize: 12,
        color: '#000',
    },

    progressBarContainer: {
        flex: 1,
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
        backgroundColor: COLORS.ProgressColor,
    },

    progressTextContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },

    progressText: {
        fontSize: 12,
        fontFamily: 'label',
        color: '#000',
        fontWeight: '600',
    },
});