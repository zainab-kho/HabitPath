// components/habits/HabitsList.tsx - DEBUG VERSION
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import HabitItem from '@/components/habits/HabitItem';
import HabitSectionHeader from '@/components/habits/HabitSectionHeader';
import { isHabitActiveToday } from '@/components/habits/habitUtils';
import { COLORS, PAGE } from '@/constants/colors';
import { TIME_OPTIONS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import EmptyStateView from '@/ui/EmptyStateView';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';

interface HabitsListProps {
  habits: (Habit & { completed: boolean })[];
  viewingDate: Date | null;
  resetTime: { hour: number; minute: number };
  onToggleHabit: (habitId: string) => void;
  onPressHabit?: (habit: Habit) => void;
}

type TimeOfDay = typeof TIME_OPTIONS[number];

// **TODO: add completion status to cache also!
// **TODO: add icon 
export default function HabitsList({
  habits,
  viewingDate,
  resetTime,
  onToggleHabit,
  onPressHabit,
}: HabitsListProps) {
  const router = useRouter();
  const currentDate = viewingDate || new Date();
  const dateStr = getHabitDate(currentDate, resetTime.hour, resetTime.minute);

  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [orderedHabits, setOrderedHabits] = useState<(Habit & { completed: boolean })[]>([]);
  const [showNewHabitModal, setShowNewHabitModal] = useState(false);


  // storage key for today's order
  const ORDER_STORAGE_KEY = `@habit_order_${dateStr}`;

  // filter habits active for the current viewing date
  const activeHabits = habits.filter(habit =>
    isHabitActiveToday(habit, currentDate, resetTime.hour, resetTime.minute)
  );

  // load saved order for today
  useEffect(() => {
    loadDailyOrder();
  }, [habits, dateStr]);

  const loadDailyOrder = async () => {
    try {
      const savedOrder = await AsyncStorage.getItem(ORDER_STORAGE_KEY);

      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        // sort habits based on saved order
        const sorted = [...activeHabits].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        setOrderedHabits(sorted);
      } else {
        setOrderedHabits(activeHabits);
      }

      setLoading(false)
    } catch (error) {
      console.error('Error loading habit order:', error);
      setOrderedHabits(activeHabits);
    }
  };

  const saveDailyOrder = async (newOrder: (Habit & { completed: boolean })[]) => {
    try {
      const orderIds = newOrder.map(h => h.id);
      await AsyncStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderIds));
    } catch (error) {
      console.error('Error saving habit order:', error);
    }
  };

  // Group habits by time of day
  const groupByTimeOfDay = (habitsList: (Habit & { completed: boolean })[]) => {
    const grouped: Record<TimeOfDay, (Habit & { completed: boolean })[]> = {
      'Wake Up': [],
      'Morning': [],
      'Anytime': [],
      'Afternoon': [],
      'Evening': [],
      'Bed Time': [],
    };

    habitsList.forEach(habit => {
      const timeOfDay = (habit.selectedTimeOfDay || 'Anytime') as TimeOfDay;
      if (grouped[timeOfDay]) {
        grouped[timeOfDay].push(habit);
      } else {
        // Fallback to Anytime if not a valid time option
        grouped['Anytime'].push(habit);
      }
    });

    return grouped;
  };

  // Filter based on showCompleted toggle
  const visibleHabits = showCompleted
    ? orderedHabits
    : orderedHabits.filter(h => !h.completed);

  const groupedHabits = groupByTimeOfDay(visibleHabits);

  // Handle drag end for a specific time section
  const handleDragEnd = (timeOfDay: TimeOfDay, newOrder: (Habit & { completed: boolean })[]) => {
    // Update the overall order by replacing this time section
    const otherHabits = orderedHabits.filter(
      h => (h.selectedTimeOfDay || 'Anytime') !== timeOfDay
    );

    const updatedOrder = [...otherHabits];

    // Insert the reordered section at the right position
    TIME_OPTIONS.forEach(time => {
      if (time === timeOfDay) {
        updatedOrder.push(...newOrder);
      } else {
        const habitsInTime = orderedHabits.filter(
          h => (h.selectedTimeOfDay || 'Anytime') === time
        );
        updatedOrder.push(...habitsInTime);
      }
    });

    setOrderedHabits(updatedOrder);
    saveDailyOrder(updatedOrder);
  };

  // loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.Primary} />
        <Text style={styles.loadingText}>Loading habits...</Text>
      </View>
    );
  }

  if ((!habits || habits.length === 0)) {
    return (
      <EmptyStateView
        icon={SYSTEM_ICONS.habit}
        title='No habits yet'
        description='Add a goal or a habit. A goal does not repeat.'
        buttonText='New habit'
        buttonAction={() => router.push('/(tabs)/habits/NewHabitPage')}
        buttonColor={COLORS.ProgressColor}
        containerStyle={{ marginBottom: 100 }}
      />
    );
  }

  // empty state
  if (activeHabits.length === 0) {
    return (
      <View style={{ marginTop: 20, alignItems: 'center', gap: 20, }}>
        <Text style={[globalStyles.body, { opacity: 0.7 }]}>You have no habits today! Add a habit?</Text>

        <ShadowBox
          borderRadius={20}
          contentBackgroundColor={PAGE.habits.button[0]}
        >
          <Pressable
            onPress={() => router.push('/(tabs)/habits/NewHabitPage')}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 15,
            }}>
            <Text style={[globalStyles.body]}>New Habit</Text>
          </Pressable>
        </ShadowBox>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Toggle Button */}
      <View style={styles.toggleContainer}>
        <Pressable
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Image
            source={showCompleted ? SYSTEM_ICONS.show : SYSTEM_ICONS.hide}
            style={styles.toggleIcon}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {TIME_OPTIONS.map(timeOfDay => {
          const habitsInTime = groupedHabits[timeOfDay];

          if (habitsInTime.length === 0) return null;

          return (
            <View key={timeOfDay} style={styles.section}>
              <HabitSectionHeader
                title={timeOfDay}
                count={habitsInTime.length}
              />

              <FlatList
                data={habitsInTime}
                renderItem={({ item }) => (
                  <HabitItem
                    habit={item}
                    onToggle={() => onToggleHabit(item.id)}
                    onPress={() => onPressHabit?.(item)}
                  />
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          );
        })}
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 100
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: 'p2',
    color: 'rgba(0, 0, 0, 0.6)',
  },

  toggleContainer: {
    alignItems: 'flex-end',
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  toggleIcon: {
    width: 18,
    height: 18,
    tintColor: 'rgba(0, 0, 0, 0.4)',
  },

  contentContainer: {
    paddingBottom: 20,
  },

  section: {
    marginBottom: 20,
  },
});