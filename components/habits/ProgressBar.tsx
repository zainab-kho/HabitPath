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
                    contentBorderColor='#000'
                    shadowColor={COLORS.RewardsAccent}
                    shadowBorderColor='#000'
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
                <ShadowBox
                    shadowBorderRadius={20}
                    contentBorderColor='#000'
                    shadowColor={COLORS.Completed}
                    shadowBorderColor='#000'
                    shadowOffset={{ x: 0, y: 0 }}
                >
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progressPercentage}%`,
                                    backgroundColor: progressPercentage === 100 ? COLORS.Completed : COLORS.ProgressColor,
                                },
                            ]}
                        />
                        <View style={styles.progressTextContainer}>
                            <Text style={styles.progressText}>
                                {Math.round(progressPercentage)}%
                            </Text>
                        </View>
                    </View>
                </ShadowBox>
            </View>

            {/* app streak badge */}
            <ShadowBox
                contentBorderColor='#000'
                shadowColor={COLORS.StreakAccent}
                shadowBorderColor='#000'
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
        width: 70,
        justifyContent: 'center'
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
        justifyContent: 'center',
        marginTop: 3,
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