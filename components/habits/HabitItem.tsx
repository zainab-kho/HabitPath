// @/components/habits/HabitItem.tsx
import { COLORS } from '@/constants/colors';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface HabitItemProps {
  habit: Habit & { completed?: boolean };
  dateStr: string;
  onToggle: () => void;
  onPress?: () => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
}

export default function HabitItem({ habit, dateStr, onToggle, onPress, onIncrementUpdate }: HabitItemProps) {
  const habitIconFile = HABIT_ICONS[habit.icon];
  const habitColor = habit.pathColor || COLORS.Primary;
  const isCompleted = habit.completed || false;
  const showStreak = (habit.streak ?? 0) >= 3;

  // increment state
  const [incrementInput, setIncrementInput] = useState('');
  const [showIncrementInput, setShowIncrementInput] = useState(false);

  const isIncrement = !!habit.increment;
  const currentAmount = habit.incrementHistory?.[dateStr] ?? 0;

  // Step size should be 1 by default, or use a dedicated step field if available
  const step = 1;

  // calculate if increment goal is reached
  const goalAmount = habit.incrementGoal || 0;
  const isGoalReached = habit.increment && habit.incrementGoal && currentAmount >= goalAmount;

  // For increment habits with goals:
  // - Show as "completed" visually when goal is reached
  // - But keep them visible (don't hide them)
  const effectivelyCompleted = isCompleted || isGoalReached;

  const progressPercentage = habit.incrementGoal
    ? Math.min((currentAmount / goalAmount) * 100, 100)
    : 0;

  const handleIncrementAdd = () => {
    const amount = parseFloat(incrementInput);
    if (isNaN(amount) || amount <= 0) return;

    const newTotal = currentAmount + amount;
    onIncrementUpdate?.(habit.id, newTotal);
    setIncrementInput('');
    setShowIncrementInput(false);
  };

  const rightLabel = (() => {
    if (!isIncrement) return effectivelyCompleted ? '✓' : '';

    // For increment habits with goals: show checkmark when goal reached
    if (isGoalReached) return '✓';

    // Otherwise show + to indicate it's tappable
    return '+';
  })();

  const handleRightAction = (e: any) => {
    e.stopPropagation();

    if (!isIncrement) {
      onToggle();
      return;
    }

    // If goal already reached, don't increment further
    if (isGoalReached) {
      return;
    }

    // For increment habits, increment by step
    const newTotal = currentAmount + step;
    onIncrementUpdate?.(habit.id, newTotal);

    // Don't auto-complete - just let the visual checkmark show when goal is reached
    // The user can manually complete it if they want by tapping the habit
  };

  const handleQuickIncrement = () => {
    // Quick +1 increment
    const newTotal = currentAmount + 1;
    onIncrementUpdate?.(habit.id, newTotal);
  };

  const handleLongPress = () => {
    // Undo last increment (decrement by step)
    if (!isIncrement || currentAmount <= 0) return;
    const newTotal = Math.max(0, currentAmount - step);
    onIncrementUpdate?.(habit.id, newTotal);
  };

  return (
    <ShadowBox
      style={styles.container}
      contentBackgroundColor={effectivelyCompleted ? habitColor : '#fff'}
      contentBorderColor='#000'
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
                <Text style={styles.icon}></Text>
              )}
            </View>

            {/* name and badges */}
            <View style={styles.textSection}>
              <Text
                style={[
                  globalStyles.body,
                  styles.habitName,
                  // effectivelyCompleted && styles.habitNameCompleted,
                ]}
              // numberOfLines={1}
              >
                {habit.name}
              </Text>

              {/* badges row */}
              <View style={styles.badgesRow}>
                {/* points badge */}
                {habit.rewardPoints && habit.rewardPoints > 0 && (
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

                {/* increment count badge - show for all increment habits */}
                {isIncrement && !habit.incrementGoal && (
                  <View style={[styles.badge, styles.incrementBadge]}>
                    <Image
                      source={SYSTEM_ICONS.star}
                      style={[styles.badgeIcon, { tintColor: COLORS.Star }]}
                    />
                    <Text style={styles.incrementBadgeText}>
                      {currentAmount}{habit.incrementGoal ? ` / ${goalAmount}` : ''}
                    </Text>
                  </View>
                )}

                {/* progress bar (if goal exists) */}
                {habit.incrementGoal && (
                  <View style={styles.progressBarContainer}>
                    {/* fill */}
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: isGoalReached ? '#54d697' : COLORS.ProgressColor,
                        },
                      ]}
                    />

                    {/* overlay */}
                    <View style={styles.progressOverlay} pointerEvents="none">
                      <Image
                        source={SYSTEM_ICONS.star}
                        style={[styles.badgeIcon, { tintColor: COLORS.Star }]}
                      />
                      <Text style={styles.incrementBadgeText}>
                        {currentAmount}{` / ${goalAmount}`}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Keep Until badge
                {habit.keepUntil && (
                  <View style={[styles.badge, styles.keepUntilBadge]}>
                    <Text style={styles.badgeText}>Keep</Text>
                  </View>
                )} */}
              </View>
            </View>
          </View>

          {/* checkbox - only show for non-increment or keep-until habits */}
          <Pressable
            onPress={handleRightAction}
            onLongPress={isIncrement ? handleLongPress : undefined}
            delayLongPress={500}
          >
            <ShadowBox
              shadowBorderRadius={8}
              contentBorderRadius={8}
              contentBorderColor={habit.keepUntil ? COLORS.Primary : "#000"}
              contentBackgroundColor="#fff"
              shadowColor={habit.keepUntil ? COLORS.Primary : "#000"}
              shadowBorderColor={habit.keepUntil ? COLORS.Primary : "#000"}

              shadowOffset={{ x: -1, y: 1 }}
            >
              <View style={styles.checkbox}>
                {/* increment: show amount; normal: show check */}
                {isIncrement ? (
                  <Text
                    style={[
                      styles.checkmark,
                      // isGoalReached && styles.incrementBadgeDone,
                    ]}
                    numberOfLines={1}
                  >
                    {rightLabel}
                  </Text>
                ) : (
                  effectivelyCompleted && <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </ShadowBox>
          </Pressable>
        </View>

        {/* Increment controls */}
        {/* {renderIncrementControls()} */}
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

  habitNameCompleted: {
    opacity: 0.7,
    textDecorationLine: 'line-through',
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

  incrementBadge: {
    backgroundColor: COLORS.ProgressColor,
    borderColor: COLORS.Secondary,
    borderWidth: 0
  },

  incrementBadgeText: {
    fontFamily: 'label',
    fontSize: 11,
    fontWeight: '600',
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

  keepUntilBadge: {
    backgroundColor: '#BAF299',
    borderColor: '#2bbaa7'
  },

  badgeIcon: {
    width: 12,
    height: 12,
  },

  badgeText: {
    fontSize: 10,
    fontFamily: 'label',
  },

  streakText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },

  checkbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#54d697',
  },

  // Increment styles
  incrementContainer: {
    marginTop: 12,
    gap: 8,
  },

  incrementDisplay: {
    alignItems: 'center',
  },

  incrementText: {
    fontFamily: 'p1',
    fontSize: 16,
  },

  progressBarContainer: {
    height: 20,
    width: 100,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E9E4F0',
    position: 'relative',
    // borderWidth: 1
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  incrementButtons: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },

  quickIncrementButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.ProgressColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },

  quickIncrementText: {
    fontFamily: 'p1',
    fontSize: 13,
  },

  customIncrementButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },

  customIncrementText: {
    fontFamily: 'p2',
    fontSize: 13,
  },

  incrementInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  incrementInputField: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontFamily: 'p2',
    fontSize: 14,
    backgroundColor: '#fff',
    width: 80,
    textAlign: 'center',
  },

  incrementAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.Primary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
  },

  incrementAddButtonText: {
    fontFamily: 'p1',
    fontSize: 13,
    color: '#fff',
  },

  incrementCancelButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  incrementCancelButtonText: {
    fontSize: 24,
    fontFamily: 'p1',
  },
  incrementBadgeDone: {
    color: '#54d697',
    fontWeight: '700',
  },
});