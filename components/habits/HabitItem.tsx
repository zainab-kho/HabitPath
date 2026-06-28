// @/components/habits/HabitItem.tsx
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { COLORS, PAGE } from '@/constants/colors';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles, uiStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import { HabitWithStatus } from '@/hooks/useHabits';
import { formatMinutesAsTime } from '@/utils/dateUtils';
import { getHabitCycleStart, isTimeTrackingHabit, getWeeklyTimeTotal } from '@/utils/habitUtils';
import UnskipHabitModal from '@/modals/habits/UnskipHabit';

interface HabitItemProps {
  habit: HabitWithStatus;
  dateStr: string;
  currentDate: Date;
  resetTime: { hour: number; minute: number };
  onToggle: () => void;
  onPress?: () => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
  onSkip?: () => void;
  onUnskip?: () => void;
  onUnskipAndComplete?: () => void;
  onSnooze?: () => void;
  onToggleSubtask?: (subtaskId: string, completed: boolean) => void;
  questExpanded?: boolean;
  onToggleQuestExpand?: () => void;
  onNavigateToQuest?: (questId: string) => void;
  onOpenTimeLog?: (habit: HabitWithStatus) => void;
}

const AUTO_COMPLETE_ON_GOAL = false;

export default function HabitItem({
  habit,
  dateStr,
  currentDate,
  resetTime,
  onToggle,
  onPress,
  onIncrementUpdate,
  onSkip,
  onUnskip,
  onUnskipAndComplete,
  onSnooze,
  onToggleSubtask,
  questExpanded,
  onToggleQuestExpand,
  onNavigateToQuest,
  onOpenTimeLog,
}: HabitItemProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const habitIconFile = HABIT_ICONS[habit.icon];
  const habitColor = habit.isQuestGoal ? PAGE.quest.primary[0] : (habit.pathColor || COLORS.Primary);

  const isCompleted = habit.status === 'completed';
  const isSkipped = habit.status === 'skipped';
  const [unskipModalVisible, setUnskipModalVisible] = useState(false);
  const showStreak = (habit.streak ?? 0) >= 3;

  const isIncrement = !!habit.increment;
  const isTimeTracking = isTimeTrackingHabit(habit);

  // keepUntil / Weekly Goal: use cycle start (walks back to find stored data)
  // snoozed: use snoozedFrom only while snooze is active
  const isSnoozedNow = habit.snoozedFrom && habit.snoozedUntil && dateStr <= habit.snoozedUntil.slice(0, 10);
  const effectiveDateStr = (habit.keepUntil || habit.frequency === 'Weekly Goal')
    ? getHabitCycleStart(habit, currentDate, resetTime.hour, resetTime.minute)
    : isSnoozedNow
      ? habit.snoozedFrom!
      : dateStr;

  // source of truth for today's increment progress
  const currentAmount = habit.incrementHistory?.[effectiveDateStr] ?? 0;

  // weekly total for time-tracking habits
  const weeklyTimeTotal = isTimeTracking
    ? getWeeklyTimeTotal(habit.incrementHistory, dateStr)
    : 0;

  // step size from increment_step
  const step = habit.incrementStep && habit.incrementStep > 0 ? habit.incrementStep : 1;

  // normalize goal: if increment is true, ensure goal is at least 1
  const goalAmount = useMemo(() => {
    if (!isIncrement) return 0;

    // for keepUntil increments, goal MUST exist (default to 1)
    if (habit.keepUntil) {
      return habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1;
    }

    // for non-keepUntil increments, goal is optional
    return habit.incrementGoal ?? 0;
  }, [isIncrement, habit.keepUntil, habit.incrementGoal]);

  const hasGoal = goalAmount > 0;
  const incrementType = habit.incrementType;

  // For time-tracking habits, use weekly total for goal comparison
  const effectiveAmount = isTimeTracking ? weeklyTimeTotal : currentAmount;
  const isGoalReached = isIncrement && hasGoal && effectiveAmount >= goalAmount;
  const effectivelyCompleted = isCompleted || isGoalReached;

  const progressPercentage = useMemo(() => {
    if (!isIncrement || !hasGoal || goalAmount <= 0) return 0;
    return Math.min((effectiveAmount / goalAmount) * 100, 100);
  }, [isIncrement, hasGoal, goalAmount, effectiveAmount]);

  /**
   * right-side label behavior:
   * - normal habits: ✓ if completed else empty
   * - increment habits:
   *    - ✓ if goal reached
   *    - number if currentAmount > 0
   *    - + if 0
   */
  const rightLabel = useMemo(() => {
    if (!isIncrement) return effectivelyCompleted ? '✓' : '';
    if (isGoalReached) return '✓';
    if (isTimeTracking) return '+';  // always show + for time tracking (opens modal)
    if (currentAmount > 0) return String(currentAmount);
    return '+';
  }, [isIncrement, effectivelyCompleted, isGoalReached, isTimeTracking, currentAmount]);

  const handleRightAction = (e: any) => {
    e.stopPropagation();

    // normal habits behave like checkbox toggle
    if (!isIncrement) {
      onToggle();
      return;
    }

    // time-tracking habits: open the time log modal
    if (isTimeTracking) {
      onOpenTimeLog?.(habit);
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

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateSkip = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [120, 0],
    });

    const translateSnooze = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [60, 0],
    });

    return (
      <View style={swipeStyles.actionsContainer}>
        <Animated.View
          style={[
            { transform: [{ translateX: translateSnooze }] },
          ]}
        >
          <Pressable
            onPress={() => {
              swipeableRef.current?.close();
              if (onSnooze) onSnooze();
            }}
            style={swipeStyles.actionButtonInner}
          >
            <Image source={SYSTEM_ICONS.snooze} style={swipeStyles.actionIcon} />
          </Pressable>
        </Animated.View>

        <Animated.View
          style={[
            swipeStyles.actionButton,
            { transform: [{ translateX: translateSkip }] },
          ]}
        >
          <Pressable
            onPress={() => {
              swipeableRef.current?.close();
              if (onSkip) onSkip();
            }}
            style={swipeStyles.actionButtonInner}
          >
            <Image source={SYSTEM_ICONS.skip} style={swipeStyles.actionIcon} />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  // skipped habits: muted style, no swipe actions, no checkbox
  if (isSkipped) {
    return (
      <>
        <ShadowBox
          style={styles.container}
          contentBackgroundColor="#fff"
          contentBorderColor="#000"
          contentBorderWidth={1}
          shadowBorderRadius={15}
          shadowOffset={{ x: 0, y: 5 }}
          shadowColor={habitColor}
        >
          <View style={styles.content}>
            <View style={styles.mainRow}>
              <View style={styles.leftSection}>
                <View style={styles.iconContainer}>
                  {habitIconFile ? (
                    <Image source={habitIconFile} style={styles.iconImage} />
                  ) : (
                    <Text style={styles.icon} />
                  )}
                </View>
                <View style={styles.textSection}>
                  <Text style={[globalStyles.body, styles.habitName]}>
                    {habit.name}
                  </Text>
                  <View style={styles.badgesRow}>
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
              </View>

              {/* red X to unskip */}
              <Pressable onPress={() => setUnskipModalVisible(true)}>
                <ShadowBox
                  shadowBorderRadius={8}
                  contentBorderRadius={8}
                  contentBorderColor="#000"
                  contentBackgroundColor='#54d697'
                  shadowOffset={{ x: -1, y: 1 }}
                >
                  <View style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={SYSTEM_ICONS.undo}
                      style={{ width: 20, height: 20, tintColor: 'white' }}
                    />
                  </View>
                </ShadowBox>
              </Pressable>
            </View>
          </View>
        </ShadowBox>

        <UnskipHabitModal
          visible={unskipModalVisible}
          onClose={() => setUnskipModalVisible(false)}
          habit={habit}
          onUnskip={() => {
            setUnskipModalVisible(false);
            onUnskip?.();
          }}
          onMarkCompleted={() => {
            setUnskipModalVisible(false);
            onUnskipAndComplete?.();
          }}
        />
      </>
    );
  }

  // Quest goals: swipeable for snooze/skip, "worked on it" checkbox,
  // tapping navigates to quest page. Subtasks expandable.
  if (habit.isQuestGoal) {
    const subtasks = habit.questSubtasks ?? [];
    const hasSubtasks = subtasks.length > 0;
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const subtaskProgress = hasSubtasks ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;
    const workedOnToday = habit.completionHistory?.includes(dateStr) ?? false;

    // Skipped quest goal: muted style
    if (isSkipped) {
      return (
        <View style={{ opacity: 0.45 }}>
          <ShadowBox
            style={styles.container}
            contentBackgroundColor="#f0f0f0"
            contentBorderColor="#ccc"
            contentBorderWidth={1}
            shadowBorderRadius={15}
            shadowOffset={{ x: 0, y: 0 }}
            shadowColor="#ccc"
          >
            <Pressable onPress={() => habit.questId && onNavigateToQuest?.(habit.questId)} style={styles.content}>
              <View style={styles.mainRow}>
                <View style={styles.leftSection}>
                  <View style={styles.iconContainer}>
                    {habitIconFile ? (
                      <Image source={habitIconFile} style={styles.iconImage} />
                    ) : (
                      <Text style={styles.icon} />
                    )}
                  </View>
                  <View style={styles.textSection}>
                    <Text style={[globalStyles.body, styles.habitName, { textDecorationLine: 'line-through' }]}>
                      {habit.name}
                    </Text>
                    <View style={styles.badgesRow}>
                      <View style={[styles.badge, {
                        backgroundColor: PAGE.quest.primary[1],
                        borderColor: PAGE.quest.primary[0],
                      }]}>
                        <Image source={SYSTEM_ICONS.quest} style={[styles.badgeIcon, { tintColor: PAGE.quest.primary[0] }]} />
                        <Text style={[styles.badgeText]} numberOfLines={1}>{habit.questName}</Text>
                      </View>
                      <Text style={[globalStyles.label, { fontSize: 11, opacity: 0.6 }]}>Skipped</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </ShadowBox>
        </View>
      );
    }

    return (
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <ShadowBox
          style={styles.container}
          contentBackgroundColor={workedOnToday ? PAGE.quest.primary[0] : '#fff'}
          contentBorderColor="#000"
          contentBorderWidth={1}
          shadowBorderRadius={15}
          shadowOffset={workedOnToday ? { x: 0, y: 0 } : { x: 0, y: 5 }}
          shadowColor={workedOnToday ? '#000' : PAGE.quest.primary[0]}
        >
          <View style={styles.content}>
            <Pressable
              onPress={() => habit.questId && onNavigateToQuest?.(habit.questId)}
              style={styles.mainRow}
            >
              <View style={styles.leftSection}>
                <View style={styles.iconContainer}>
                  {habitIconFile ? (
                    <Image source={habitIconFile} style={styles.iconImage} />
                  ) : (
                    <Text style={styles.icon} />
                  )}
                </View>
                <View style={styles.textSection}>
                  <Text style={[globalStyles.body, styles.habitName]}>
                    {habit.name}
                  </Text>
                  <View style={styles.badgesRow}>
                    <View style={[styles.badge, {
                      backgroundColor: PAGE.quest.primary[1],
                      borderColor: PAGE.quest.primary[0],
                    }]}>
                      <Image source={SYSTEM_ICONS.quest} style={[styles.badgeIcon, { tintColor: PAGE.quest.primary[0] }]} />
                      <Text style={[styles.badgeText]} numberOfLines={1}>
                        {habit.questName}
                      </Text>
                    </View>
                    {hasSubtasks && (
                      <Text style={[styles.badgeText, { opacity: 0.5 }]}>
                        {completedSubtasks}/{subtasks.length} subtasks
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* expand arrow for subtasks */}
              {hasSubtasks && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onToggleQuestExpand?.();
                  }}
                  style={{ padding: 4 }}
                >
                  <Image
                    source={questExpanded ? SYSTEM_ICONS.sort : SYSTEM_ICONS.sortRight}
                    style={{ width: 16, height: 16, opacity: 0.4 }}
                  />
                </Pressable>
              )}

              {/* "worked on it today" checkbox */}
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
              >
                <ShadowBox
                  shadowBorderRadius={8}
                  contentBorderRadius={8}
                  contentBorderColor="#000"
                  shadowColor={workedOnToday ? '#000' : PAGE.quest.primary[0]}
                  shadowOffset={{ x: 2, y: 2 }}
                  contentBackgroundColor={workedOnToday ? PAGE.quest.primary[0] : '#fff'}
                >
                  <View style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }}>
                    {workedOnToday && (
                      <Text style={{ fontSize: 14, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                </ShadowBox>
              </Pressable>
            </Pressable>

            {/* subtask progress bar */}
            {hasSubtasks && (
              <View style={{ marginTop: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1 }}>
                <View style={{
                  height: 20,
                  borderRadius: 20,
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  position: 'relative',
                }}>
                  {subtaskProgress > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: 0, left: 0, bottom: 0,
                      width: `${subtaskProgress}%`,
                      backgroundColor: subtaskProgress >= 100 ? '#54d697' : PAGE.quest.primary[0],
                      zIndex: 2,
                    }} />
                  )}
                  <View style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 3,
                  }}>
                    <Text style={{ fontSize: 10, fontFamily: 'label', fontWeight: '600' }}>
                      {completedSubtasks}/{subtasks.length} subtasks
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* expanded subtasks */}
            {hasSubtasks && questExpanded && (
              <View style={{ marginTop: 10, paddingLeft: 55, gap: 8 }}>
                {subtasks.map(st => (
                  <Pressable
                    key={st.id}
                    onPress={() => onToggleSubtask?.(st.id, !st.completed)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <ShadowBox
                        contentBorderRadius={0}
                        shadowBorderRadius={0}
                        shadowColor={st.completed ? '#000' : PAGE.quest.primary[1]}
                        shadowOffset={{ x: 2, y: 2 }}
                        contentBackgroundColor={st.completed ? PAGE.quest.primary[0] : '#fff'}
                        contentBorderColor="#000"
                        contentBorderWidth={1}
                      >
                        <View style={{ height: 14, width: 14, justifyContent: 'center', alignItems: 'center' }}>
                          {st.completed && (
                            <Text style={{ fontSize: 9, fontWeight: 'bold' }}>✓</Text>
                          )}
                        </View>
                      </ShadowBox>
                      <Text
                        style={[
                          globalStyles.body2,
                          { fontSize: 13 },
                          st.completed && { textDecorationLine: 'line-through', opacity: 0.5 },
                        ]}
                      >
                        {st.name}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ShadowBox>
      </Swipeable>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
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
                    <View style={styles.streak}>
                      <Image source={SYSTEM_ICONS.fire} style={styles.streakIcon} />
                      <Text style={[styles.badgeText]}>
                        {habit.streak}d
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
                            backgroundColor: isGoalReached ? COLORS.PrimaryLight : COLORS.ProgressColor,
                          },
                        ]}
                      />
                      <View style={styles.progressOverlay} pointerEvents="none">
                        <Image
                          source={SYSTEM_ICONS.star}
                          style={[styles.badgeIcon, { tintColor: COLORS.Star }]}
                        />

                        <Text style={styles.incrementBadgeText}>
                          {isTimeTracking
                            ? `${formatMinutesAsTime(effectiveAmount)} / ${formatMinutesAsTime(goalAmount)}`
                            : incrementType && incrementType !== 'None'
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
              onLongPress={undefined}
              delayLongPress={600}
              hitSlop={{ top: 15, bottom: 15, left: 10, right: 20 }}
              style={{ paddingLeft: 10 }}
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
    </Swipeable>
  );
}

// your original styles - untouched!
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
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakIcon: {
    width: 16,
    height: 16
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

// New styles only for swipe actions
const swipeStyles = StyleSheet.create({
  actionsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
    paddingLeft: 10,
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: '100%',
  },
  actionButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    borderRadius: 15,
    gap: 4,
  },
  actionIcon: {
    width: 30,
    height: 30,
    tintColor: '#54d697'
  },
  actionText: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'label',
    fontWeight: '600',
  },
});