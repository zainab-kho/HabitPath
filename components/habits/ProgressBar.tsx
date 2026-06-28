// components/habits/ProgressBar.tsx
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
  totalHabits: number;       // total habits for today (completed + active + skipped)
  completedHabits: number;   // how many completed (can be decimal for increments)
  skippedHabits: number;     // how many skipped/snoozed (subset of totalHabits)
  earnedPoints: number;
  totalPossiblePoints: number;
  appStreak: number;
}

export default function ProgressBar({
  totalHabits,
  completedHabits,
  skippedHabits,
  earnedPoints,
  totalPossiblePoints,
  appStreak,
}: ProgressBarProps) {
  const router = useRouter();

  // grandTotal includes skipped habits so the bar never hits 100% when habits are skipped
  const grandTotal = totalHabits + skippedHabits;
  const completedPct = grandTotal > 0 ? Math.min((completedHabits / grandTotal) * 100, 100) : 0;
  const skippedPct = grandTotal > 0 ? Math.min((skippedHabits / grandTotal) * 100, 100) : 0;

  // calculate non-completed, non-skipped habits (active + missed)
  const activeAndMissed = totalHabits - completedHabits - skippedHabits;
  const isAllDone = totalHabits > 0 && completedHabits >= totalHabits;

  return (
    <View style={styles.container}>
      {/* points badge */}
      <Pressable onPress={() => router.push('/(tabs)/more/rewards' as any)}>
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
        <View style={{ borderRadius: 20, backgroundColor: '#fff', borderWidth: 1 }}>
          <View style={styles.progressBar}>

            {/* completed fill (green / gold when 100%) */}
            {completedPct > 0 && (
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${completedPct}%`,
                    backgroundColor: isAllDone ? COLORS.PrimaryLight : COLORS.Primary,
                    zIndex: 2,
                  },
                ]}
              />
            )}

            {/* skipped habits stacks right after completed */}
            {skippedPct > 0 && (
              <View
                style={[
                  styles.progressFill,
                  {
                    left: `${completedPct}%`,
                    width: `${skippedPct}%`,
                    backgroundColor: '#D8E6DD',
                    opacity: 0.6,
                    zIndex: 1,
                  },
                ]}
              />
            )}

            {/* percentage label */}
            <View style={styles.progressTextContainer}>
              <Text style={styles.progressText}>
                {grandTotal > 0 ? `${Math.round((completedHabits / grandTotal) * 100)}%` : '0%'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* streak badge */}
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
    justifyContent: 'center',
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
    zIndex: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'label',
    color: '#000',
    fontWeight: '600',
  },
});