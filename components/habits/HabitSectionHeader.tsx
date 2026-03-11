// components/habits/HabitSectionHeader.tsx
import { COLORS } from '@/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface HabitSectionHeaderProps {
  title: string;
  count: number;
  color?: string;
  isCompleted?: boolean;
}

export default function HabitSectionHeader({
  title,
  count,
  color,
  isCompleted = false,
}: HabitSectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Color indicator dot */}
        {color && !isCompleted && (
          <View
            style={[
              styles.colorDot,
              { backgroundColor: color },
            ]}
          />
        )}
        
        {/* Title */}
        <Text style={styles.title}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    marginTop: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  title: {
    fontSize: 12,
    fontFamily: 'label',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },

  countBadge: {
    backgroundColor: COLORS.PrimaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#000',
  },

  completedBadge: {
    backgroundColor: '#54d697',
  },

  countText: {
    fontSize: 10,
    fontFamily: 'label',
    fontWeight: '600',
  },

  completedText: {
    color: '#fff',
  },
});