// components/habits/HabitsList.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
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
import {
  applyDailyOrder,
  effectiveTimeOfDay,
  loadDailyOrder,
  saveDailyOrder,
  saveTempTimeOfDay,
} from '@/hooks/useDailyHabitOverrides';

interface HabitsListProps {
  habits: HabitWithStatus[];
  viewingDate: Date | null;
  resetTime: { hour: number; minute: number };
  userId: string;
  onToggleHabit: (habitId: string) => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
  onSkipHabit?: (habitId: string) => void;
  onSnoozeHabit?: (habitId: string) => void;
}

type TimeOfDay = typeof TIME_OPTIONS[number];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function HabitsList({
  habits,
  viewingDate,
  resetTime,
  userId,
  onToggleHabit,
  onIncrementUpdate,
  onSkipHabit,
  onSnoozeHabit,
}: HabitsListProps) {
  const router = useRouter();
  const currentDate = viewingDate || new Date();
  const dateStr = getHabitDate(currentDate, resetTime.hour, resetTime.minute);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [showCompleted, setShowCompleted] = useState(true);
  const [orderedHabits, setOrderedHabits] = useState<HabitWithStatus[]>([]);

  // Track which item is currently being dragged (for cross-zone drops)
  const activeKeyRef = useRef<string | null>(null);

  // Modal state
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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
  };

  useEffect(() => {
    (async () => {
      const savedOrder = await loadDailyOrder(dateStr);
      const sorted = applyDailyOrder(activeHabits, savedOrder);
      setOrderedHabits(sorted);
    })();

    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOGGLE_STATE);
      if (stored !== null) {
        setShowCompleted(stored === '1');
      }
    })();
  }, [habits, dateStr]);

  const groupByTimeOfDay = useCallback((habitsList: HabitWithStatus[]) => {
    const grouped: Record<TimeOfDay, HabitWithStatus[]> = {
      'Wake Up': [],
      'Morning': [],
      'Anytime': [],
      'Afternoon': [],
      'Evening': [],
      'Bed Time': [],
    };

    habitsList.forEach(habit => {
      const timeOfDay = effectiveTimeOfDay(habit, dateStr) as TimeOfDay;
      if (grouped[timeOfDay]) {
        grouped[timeOfDay].push(habit);
      } else {
        grouped['Anytime'].push(habit);
      }
    });

    return grouped;
  }, [dateStr]);

  const visibleHabits = showCompleted
    ? orderedHabits
    : orderedHabits.filter(h => h.status !== 'completed' && h.status !== 'skipped');

  const groupedHabits = useMemo(() => groupByTimeOfDay(visibleHabits), [visibleHabits, groupByTimeOfDay]);

  const handleSectionDragEnd = useCallback((timeOfDay: TimeOfDay, params: { data: HabitWithStatus[] }) => {
    const reorderedSection = params.data;

    // rebuild the full ordered list preserving other sections
    const newOrdered: HabitWithStatus[] = [];
    TIME_OPTIONS.forEach(time => {
      if (time === timeOfDay) {
        newOrdered.push(...reorderedSection);
      } else {
        const habitsInTime = orderedHabits.filter(
          h => effectiveTimeOfDay(h, dateStr) === time
        );
        newOrdered.push(...habitsInTime);
      }
    });

    setOrderedHabits(newOrdered);
    saveDailyOrder(dateStr, newOrdered.map(h => h.id));
  }, [orderedHabits, dateStr]);

  const handleCrossZoneDrop = useCallback(async (
    habitId: string,
    targetTimeOfDay: TimeOfDay,
  ) => {
    const habit = orderedHabits.find(h => h.id === habitId);
    if (!habit) return;

    const currentTimeOfDay = effectiveTimeOfDay(habit, dateStr);
    if (currentTimeOfDay === targetTimeOfDay) return;

    // Save temp time-of-day to Supabase (day-only override)
    try {
      await saveTempTimeOfDay(habitId, userId, targetTimeOfDay, dateStr);
    } catch {
      return;
    }

    // Update local state: move the habit to the new section
    const updated = orderedHabits.map(h =>
      h.id === habitId
        ? { ...h, tempTimeOfDay: targetTimeOfDay, tempTimeOfDayDate: dateStr }
        : h
    );
    setOrderedHabits(updated);
    saveDailyOrder(dateStr, updated.map(h => h.id));
  }, [orderedHabits, dateStr, userId]);

  const handleHabitPress = (habit: HabitWithStatus) => {
    setSelectedHabit(habit);
    setModalVisible(true);
  };

  const handleModalUpdate = async () => {
    const savedOrder = await loadDailyOrder(dateStr);
    const sorted = applyDailyOrder(activeHabits, savedOrder);
    setOrderedHabits(sorted);
  };

  if (!habits || habits.length === 0) {
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

  const renderSection = (timeOfDay: TimeOfDay) => {
    const habitsInTime = groupedHabits[timeOfDay];
    if (habitsInTime.length === 0) return null;

    return (
      <Sortable.BaseZone
        key={timeOfDay}
        onItemDrop={() => {
          if (activeKeyRef.current) {
            handleCrossZoneDrop(activeKeyRef.current, timeOfDay);
          }
        }}
      >
        <HabitSectionHeader title={timeOfDay} count={habitsInTime.length} />
        <Sortable.Grid
          data={habitsInTime}
          columns={1}
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
          onDragStart={({ key }) => { activeKeyRef.current = key; }}
          onDragEnd={(params) => {
            handleSectionDragEnd(timeOfDay, params);
            activeKeyRef.current = null;
          }}
          scrollableRef={scrollableRef}
          dragActivationDelay={200}
          activeItemScale={1.02}
          activeItemShadowOpacity={0.15}
          activeItemOpacity={1}
          inactiveItemOpacity={1}
          inactiveItemScale={1}
          hapticsEnabled
          overDrag="vertical"
          reorderTriggerOrigin="touch"
        />
      </Sortable.BaseZone>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
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

      <Sortable.MultiZoneProvider>
        <AnimatedScrollView
          ref={scrollableRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {TIME_OPTIONS.map(timeOfDay => renderSection(timeOfDay))}
        </AnimatedScrollView>
      </Sortable.MultiZoneProvider>

      <HabitDetailModal
        visible={modalVisible}
        habit={selectedHabit}
        onClose={() => setModalVisible(false)}
        onUpdate={handleModalUpdate}
      />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
