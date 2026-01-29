// @/components/habits/HabitItem.tsx
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import ShadowBox from '@/ui/ShadowBox';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

interface HabitItemProps {
  habit: Habit & { completed?: boolean };
  onToggle: () => void;
  onPress?: () => void;
}

export default function HabitItem({ habit, onToggle, onPress }: HabitItemProps) {
  const habitColor = habit.pathColor || COLORS.Primary;
  const isCompleted = habit.completed || false;
  const showStreak = (habit.streak ?? 0) >= 3;

  return (
    <ShadowBox
      style={styles.container}
      contentBackgroundColor={isCompleted ? habitColor : '#fff'}
      contentBorderColor="#000"
      borderRadius={12}
      shadowOffset={{ x: 2, y: 2 }}
      shadowColor={isCompleted ? '#000' : habitColor}
    >
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.leftSection}>
          {/* icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{habit.icon || '📝'}</Text>
          </View>

          {/* name and badges */}
          <View style={styles.textSection}>
            <Text
              style={[
                globalStyles.body,
                styles.habitName,
                isCompleted && styles.habitNameCompleted,
              ]}
              numberOfLines={1}
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
            </View>
          </View>
        </View>

        {/* checkbox */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ShadowBox
            borderRadius={8}
            contentBackgroundColor="#fff"
            shadowColor="#000"
            shadowOffset={{ x: 1, y: 1 }}
          >
            <View style={styles.checkbox}>
              {isCompleted && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </ShadowBox>
        </Pressable>
      </Pressable>
    </ShadowBox>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    overflow: 'visible',
    marginRight: 3,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
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
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },

  pointsBadge: {
    backgroundColor: COLORS.RewardsBackground,
    borderWidth: 1.5,
    borderColor: COLORS.Rewards,
  },

  streakBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: '#FF6B35',
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
});