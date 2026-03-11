// components/habits/HabitsList.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';

import HabitItem from '@/components/habits/HabitItem';
import HabitSectionHeader from '@/components/habits/HabitSectionHeader';
import { isHabitActiveToday } from '@/utils/habitUtils';
import HabitDetailModal from '@/modals/HabitDetailModal';
import { COLORS, PAGE } from '@/constants/colors';
import { TIME_OPTIONS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { STORAGE_KEYS } from '@/storage/keys';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import EmptyStateView from '@/ui/EmptyStateView';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate } from '@/utils/dateUtils';

import { HabitWithStatus } from '@/hooks/useHabits';

interface HabitsListProps {
  habits: HabitWithStatus[];
  viewingDate: Date | null;
  resetTime: { hour: number; minute: number };
  onToggleHabit: (habitId: string) => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
  onSkipHabit?: (habitId: string) => void;
  onSnoozeHabit?: (habitId: string) => void;
}

type TimeOfDay = typeof TIME_OPTIONS[number];

const DEBUG = false;

export default function HabitsList({
  habits,
  viewingDate,
  resetTime,
  onToggleHabit,
  onIncrementUpdate,
  onSkipHabit,
  onSnoozeHabit,
}: HabitsListProps) {
  const router = useRouter();
  const currentDate = viewingDate || new Date();
  const dateStr = getHabitDate(currentDate, resetTime.hour, resetTime.minute);

  const [showCompleted, setShowCompleted] = useState(true);
  const [orderedHabits, setOrderedHabits] = useState<HabitWithStatus[]>([]);
  
  // Modal state
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const ORDER_STORAGE_KEY = `@habit_order_${dateStr}`;

  const activeHabits = habits.filter(habit =>
    isHabitActiveToday(habit, currentDate, resetTime.hour, resetTime.minute)
  );
  const incompleteCount = activeHabits.filter(h => h.status !== 'completed').length;
  const scheduledHabits = habits.filter(habit =>
    isHabitActiveToday(habit, currentDate, resetTime.hour, resetTime.minute)
  );
  const allDoneToday = scheduledHabits.length > 0 && incompleteCount === 0;

  const saveToggleState = async () => {
    const nextValue = !showCompleted;
    setShowCompleted(nextValue);
    await AsyncStorage.setItem(
      STORAGE_KEYS.TOGGLE_STATE,
      nextValue ? '1' : '0'
    );
    console.log(nextValue ? 'showing completed' : 'hiding completed');
  };

  useEffect(() => {
    if (DEBUG) {
      console.log('\n📋 ========== HABITS LIST DEBUG ==========');
      console.log('Viewing date:', currentDate.toISOString());
      console.log('Habit date string:', dateStr);
      console.log('Reset time:', `${resetTime.hour}:${resetTime.minute}`);
      console.log('Total habits from hook:', habits.length);
      console.log('Active habits after filter:', activeHabits.length);
      console.log('\n🔍 Checking each habit:');

      habits.forEach((habit, index) => {
        const isActive = isHabitActiveToday(habit, currentDate, resetTime.hour, resetTime.minute);

        console.log(`\n   ${index + 1}. ${habit.name}`);
        console.log(`      Frequency: ${habit.frequency}`);
        console.log(`      Start Date: ${habit.startDate}`);
        console.log(`      Today (habit date): ${dateStr}`);
        console.log(`      Is Active: ${isActive ? '✅ YES' : '❌ NO'}`);

        if (!isActive) {
          console.log(`      ❓ Why not active?`);

          if (habit.startDate > dateStr) {
            console.log(`         - Start date (${habit.startDate}) is AFTER today (${dateStr})`);
          }

          if (habit.snoozedUntil && dateStr < habit.snoozedUntil) {
            console.log(`         - Habit is snoozed until ${habit.snoozedUntil}`);
          }

          if (habit.frequency === 'No Repeat' && habit.startDate !== dateStr) {
            console.log(`         - No Repeat habit, start (${habit.startDate}) ≠ today (${dateStr})`);
          }

          if (habit.frequency === 'Weekly' && habit.startDate < dateStr) {
            console.log(`         - Weekly habit, check selected days:`, habit.selectedDays);
          }
        }

        if (habit.status === 'completed') {
          console.log(`      ✓ Completed: YES`);
        }
      });

      console.log('\n========================================\n');
    }
  }, [habits, activeHabits, dateStr, currentDate, resetTime]);

  useEffect(() => {
    loadDailyOrder();

    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOGGLE_STATE);
      if (stored !== null) {
        setShowCompleted(stored === '1');
      }
    })();
  }, [habits, dateStr]);

  const loadDailyOrder = async () => {
    try {
      const savedOrder = await AsyncStorage.getItem(ORDER_STORAGE_KEY);

      if (savedOrder) {
        const orderIds = JSON.parse(savedOrder);
        const sorted = [...activeHabits].sort((a, b) => {
          const indexA = orderIds.indexOf(a.id);
          const indexB = orderIds.indexOf(b.id);

          const safeA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
          const safeB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

          if (safeA === Number.MAX_SAFE_INTEGER && safeB === Number.MAX_SAFE_INTEGER) {
            return (a.startDate ?? '').localeCompare(b.startDate ?? '');
          }

          return safeA - safeB;
        });
        setOrderedHabits(sorted);
      } else {
        const defaultSorted = [...activeHabits].sort((a, b) =>
          (a.startDate ?? '').localeCompare(b.startDate ?? '')
        );
        setOrderedHabits(defaultSorted);
      }

    } catch (error) {
      console.error('Error loading habit order:', error);
      const fallbackSorted = [...activeHabits].sort((a, b) =>
        (a.startDate ?? '').localeCompare(b.startDate ?? '')
      );
      setOrderedHabits(fallbackSorted);
    }
  };

  const saveDailyOrder = async (newOrder: HabitWithStatus[]) => {
    try {
      const orderIds = newOrder.map(h => h.id);
      await AsyncStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderIds));
    } catch (error) {
      console.error('Error saving habit order:', error);
    }
  };

  const groupByTimeOfDay = (habitsList: HabitWithStatus[]) => {
    const grouped: Record<TimeOfDay, HabitWithStatus[]> = {
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
        grouped['Anytime'].push(habit);
      }
    });

    return grouped;
  };

  const visibleHabits = showCompleted
    ? orderedHabits
    : orderedHabits.filter(h => h.status !== 'completed' && h.status !== 'skipped');

  const groupedHabits = groupByTimeOfDay(visibleHabits);

  const handleDragEnd = (timeOfDay: TimeOfDay, newOrder: HabitWithStatus[]) => {
    const otherHabits = orderedHabits.filter(
      h => (h.selectedTimeOfDay || 'Anytime') !== timeOfDay
    );

    const updatedOrder = [...otherHabits];

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

  const handleHabitPress = (habit: HabitWithStatus) => {
    setSelectedHabit(habit);
    setModalVisible(true);
  };

  const handleModalUpdate = () => {
    loadDailyOrder();
  };

  if (!habits || habits.length === 0) {
    if (DEBUG) console.log('📭 No habits found in database');
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

  if (scheduledHabits.length === 0) {
    return (
      <View style={{ marginTop: 20, alignItems: 'center', gap: 20 }}>
        <Text style={[globalStyles.body, { opacity: 0.7 }]}>You have no habits today! Add a habit?</Text>

        <ShadowBox
          shadowBorderRadius={20}
          contentBorderRadius={20}
          contentBackgroundColor={PAGE.habits.button[0]}
        >
          <Pressable
            onPress={() => router.push('/(tabs)/habits/NewHabitPage')}
            style={{
              paddingVertical: 5,
              paddingHorizontal: 25,
            }}>
            <Text style={[globalStyles.body1]}>New Habit</Text>
          </Pressable>
        </ShadowBox>
      </View>
    );
  }

  const renderHabitsList = () => (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
        <View>
          <Text style={globalStyles.body}>You have {incompleteCount} goals left today!</Text>
        </View>
        <View style={styles.toggleContainer}>
          <Pressable onPress={() => saveToggleState()}>
            <Image
              source={showCompleted ? SYSTEM_ICONS.show : SYSTEM_ICONS.hide}
              style={styles.toggleIcon}
            />
          </Pressable>
        </View>
      </View>

      {allDoneToday && (
        <View style={{ marginTop: 12, alignItems: 'center', gap: 10 }}>
          <Text style={[globalStyles.body, { opacity: 0.7, textAlign: 'center' }]}>
            🎉 Good job — you finished everything for today!
          </Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        {TIME_OPTIONS.map(timeOfDay => {
          const habitsInTime = groupedHabits[timeOfDay];
          if (habitsInTime.length === 0) return null;

          return (
            <View key={timeOfDay}>
              <HabitSectionHeader title={timeOfDay} count={habitsInTime.length} />
              <FlatList
                data={habitsInTime}
                renderItem={({ item }) => (
                  <HabitItem
                    habit={item}
                    dateStr={dateStr}
                    onToggle={() => onToggleHabit(item.id)}
                    onPress={() => handleHabitPress(item)}
                    onIncrementUpdate={onIncrementUpdate}
                    onSkip={() => onSkipHabit?.(item.id)}
                    onSnooze={() => onSnoozeHabit?.(item.id)}
                  />
                )}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          );
        })}
      </ScrollView>

      <HabitDetailModal
        visible={modalVisible}
        habit={selectedHabit}
        onClose={() => setModalVisible(false)}
        onUpdate={handleModalUpdate}
      />
    </>
  );

  return (
    <GestureHandlerRootView style={styles.container}>
      {renderHabitsList()}
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
    paddingBottom: 50,
  },
});