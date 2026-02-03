// @/components/habits/HabitItem.tsx
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';

interface HabitItemProps {
  habit: Habit & { completed?: boolean };
  dateStr: string;
  onToggle: () => void;
  onPress?: () => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
}

const AUTO_COMPLETE_ON_GOAL = false;

export default function HabitItem({
  habit,
  dateStr,
  onToggle,
  onPress,
  onIncrementUpdate,
}: HabitItemProps) {
  const habitIconFile = HABIT_ICONS[habit.icon];
  const habitColor = habit.pathColor || COLORS.Primary;

  const isCompleted = habit.completed ?? false;
  const showStreak = (habit.streak ?? 0) >= 3;

  const isIncrement = !!habit.increment;

  // ✅ source of truth for today's increment progress
  const currentAmount = habit.incrementHistory?.[dateStr] ?? 0;

  // ✅ step size from increment_step
  const step = habit.incrementStep && habit.incrementStep > 0 ? habit.incrementStep : 1;

  const goalAmount = habit.incrementGoal ?? 0;
  const hasGoal = !!habit.incrementGoal;
  const incrementType = habit.incrementType;

  const isGoalReached = isIncrement && hasGoal && currentAmount >= goalAmount;
  const effectivelyCompleted = isCompleted || isGoalReached;

  const progressPercentage = useMemo(() => {
    if (!isIncrement || !hasGoal || goalAmount <= 0) return 0;
    return Math.min((currentAmount / goalAmount) * 100, 100);
  }, [isIncrement, hasGoal, goalAmount, currentAmount]);

  /**
   * Right-side label behavior:
   * - Normal habits: ✓ if completed else empty
   * - Increment habits:
   *    - ✓ if goal reached
   *    - number if currentAmount > 0
   *    - + if 0
   */
  const rightLabel = useMemo(() => {
    if (!isIncrement) return effectivelyCompleted ? '✓' : '';
    if (isGoalReached) return '✓';
    if (currentAmount > 0) return String(currentAmount);
    return '+';
  }, [isIncrement, effectivelyCompleted, isGoalReached, currentAmount]);

  const handleRightAction = (e: any) => {
    e.stopPropagation();

    // normal habits behave like checkbox toggle
    if (!isIncrement) {
      onToggle();
      return;
    }

    // increment habits:
    // - don't do anything if goal already reached
    if (isGoalReached) return;

    const newTotal = currentAmount + step;
    onIncrementUpdate?.(habit.id, newTotal);

    if (AUTO_COMPLETE_ON_GOAL && hasGoal && newTotal >= goalAmount) {
      onToggle();
    }
  };

  const handleLongPress = (e: any) => {
    e.stopPropagation();

    // only for increment habits
    if (!isIncrement) return;
    if (currentAmount <= 0) return;

    const newTotal = Math.max(0, currentAmount - step);
    onIncrementUpdate?.(habit.id, newTotal);
  };

  return (
    <ShadowBox
      style={styles.container}
      contentBackgroundColor={effectivelyCompleted ? habitColor : '#fff'}
      contentBorderColor="#000"
      contentBorderWidth={1}
      shadowBorderRadius={15}
      shadowOffset={effectivelyCompleted ? { x: 0, y: 0 } : { x: 0, y: 5 }}
      shadowColor={effectivelyCompleted ? '#000' : habitColor}
    >
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.mainRow}>
          <View style={styles.leftSection}>
            {/* icon */}
            <View style={styles.iconContainer}>
              {habitIconFile ? (
                <Image source={habitIconFile} style={styles.iconImage} />
              ) : (
                <Text style={styles.icon} />
              )}
            </View>

            {/* name and badges */}
            <View style={styles.textSection}>
              <Text style={[globalStyles.body, styles.habitName]}>
                {habit.name}
              </Text>

              <View style={styles.badgesRow}>
                {/* points badge */}
                {!!habit.rewardPoints && habit.rewardPoints > 0 && (
                  <View style={[styles.badge, styles.pointsBadge]}>
                    <Image
                      source={SYSTEM_ICONS.reward}
                      style={[styles.badgeIcon, { tintColor: COLORS.Rewards }]}
                    />
                    <Text style={styles.badgeText}>{habit.rewardPoints}</Text>
                  </View>
                )}

                {/* streak badge */}
                {showStreak && (
                  <View style={[styles.badge, styles.streakBadge]}>
                    <Image source={SYSTEM_ICONS.fire} style={styles.badgeIcon} />
                    <Text style={[styles.badgeText, styles.streakText]}>
                      {habit.streak}
                    </Text>
                  </View>
                )}

                {/* increment badge (no goal) */}
                {isIncrement && !hasGoal && (
                  <View style={[styles.badge, styles.incrementBadge]}>
                    <Image
                      source={SYSTEM_ICONS.star}
                      style={[styles.badgeIcon, { tintColor: COLORS.Star }]}
                    />
                    <Text style={styles.incrementBadgeText}>{currentAmount}</Text>
                  </View>
                )}

                {/* progress bar (goal exists) */}
                {isIncrement && hasGoal && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: isGoalReached ? '#54d697' : COLORS.ProgressColor,
                        },
                      ]}
                    />
                    <View style={styles.progressOverlay} pointerEvents="none">
                      <Image
                        source={SYSTEM_ICONS.star}
                        style={[styles.badgeIcon, { tintColor: COLORS.Star }]}
                      />

                      <Text style={styles.incrementBadgeText}>
                        {incrementType && incrementType !== 'None'
                          ? `${goalAmount - currentAmount} ${incrementType.toLowerCase()} left`
                          : `${currentAmount} / ${goalAmount}`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* right-side action */}
          <Pressable
            onPress={handleRightAction}
            onLongPress={isIncrement ? handleLongPress : undefined}
            delayLongPress={600}
          >
            <ShadowBox
              shadowBorderRadius={8}
              contentBorderRadius={8}
              contentBorderColor={habit.keepUntil ? COLORS.Primary : '#000'}
              contentBackgroundColor="#fff"
              shadowColor={habit.keepUntil ? COLORS.Primary : '#000'}
              shadowBorderColor={habit.keepUntil ? COLORS.Primary : '#000'}
              shadowOffset={{ x: -1, y: 1 }}
            >
              <View style={styles.checkbox}>
                {isIncrement ? (
                  <Text
                    style={[
                      styles.rightTextDone,
                    ]}
                    numberOfLines={1}
                  >
                    {effectivelyCompleted ? '✓' : '+'}
                  </Text>
                ) : (
                  effectivelyCompleted && <Text style={styles.rightTextDone}>✓</Text>
                )}
              </View>
            </ShadowBox>
          </Pressable>
        </View>
      </Pressable>
    </ShadowBox>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    overflow: 'visible',
    marginLeft: 5,
  },
  content: {
    padding: 12,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
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
  habitName: {
    fontSize: 15,
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
    borderWidth: 1,
    borderColor: COLORS.RewardsAccent,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: '#FF6B35',
  },
  streakText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },

  incrementBadge: {
    backgroundColor: COLORS.ProgressColor,
    borderColor: COLORS.Secondary,
    borderWidth: 0,
  },
  incrementBadgeText: {
    fontFamily: 'label',
    fontSize: 11,
    fontWeight: '600',
  },

  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  rightTextDone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#54d697',
  },

  progressBarContainer: {
    height: 20,
    minWidth: 125,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E9E4F0',
    position: 'relative',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressOverlay: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 0,
    bottom: 0,
    gap: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
});