// components/habits/HabitsList.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

// Union type for items in the flat sortable list
type ListItem =
  | { type: 'header'; id: string; timeOfDay: TimeOfDay; count: number }
  | { type: 'habit'; id: string; habit: HabitWithStatus };

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function getSection(habit: Pick<Habit, 'selectedTimeOfDay' | 'tempTimeOfDay' | 'tempTimeOfDayDate'>, dateStr: string): TimeOfDay {
  const tod = (habit.tempTimeOfDay && habit.tempTimeOfDayDate === dateStr)
    ? habit.tempTimeOfDay
    : (habit.selectedTimeOfDay ?? 'Anytime');
  return tod as TimeOfDay;
}

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

  // Build the flat list: headers interleaved with habits, grouped by section
  const flatList = useMemo(() => {
    const visible = showCompleted
      ? orderedHabits
      : orderedHabits.filter(h => h.status !== 'completed' && h.status !== 'skipped');

    const grouped: Record<TimeOfDay, HabitWithStatus[]> = {
      'Wake Up': [], 'Morning': [], 'Anytime': [],
      'Afternoon': [], 'Evening': [], 'Bed Time': [],
    };
    visible.forEach(h => {
      const section = getSection(h, dateStr);
      (grouped[section] || grouped['Anytime']).push(h);
    });

    const items: ListItem[] = [];
    TIME_OPTIONS.forEach(time => {
      const habitsInTime = grouped[time];
      if (habitsInTime.length > 0) {
        items.push({ type: 'header', id: `header-${time}`, timeOfDay: time, count: habitsInTime.length });
        habitsInTime.forEach(h => items.push({ type: 'habit', id: h.id, habit: h }));
      }
    });

    return items;
  }, [orderedHabits, showCompleted, dateStr]);

  // The first header's ID — used to apply fixed-order mode
  const firstHeaderId = flatList.length > 0 && flatList[0]?.type === 'header' ? flatList[0].id : null;

  const handleDragEnd = useCallback(async (params: { key: string; data: ListItem[] }) => {
    const { key: draggedKey, data: newOrder } = params;

    // Derive new sections: walk the list, track current header
    let currentSection: TimeOfDay = 'Anytime';
    const newHabitOrder: HabitWithStatus[] = [];
    const sectionChanges: { habitId: string; newSection: TimeOfDay }[] = [];

    for (const item of newOrder) {
      if (item.type === 'header') {
        currentSection = item.timeOfDay;
      } else {
        const habit = item.habit;
        const oldSection = getSection(habit, dateStr);

        if (oldSection !== currentSection) {
          // This habit moved to a new section
          sectionChanges.push({ habitId: habit.id, newSection: currentSection });
          newHabitOrder.push({
            ...habit,
            tempTimeOfDay: currentSection,
            tempTimeOfDayDate: dateStr,
          });
        } else {
          newHabitOrder.push(habit);
        }
      }
    }

    // Save section changes to Supabase
    for (const change of sectionChanges) {
      try {
        await saveTempTimeOfDay(change.habitId, userId, change.newSection, dateStr);
      } catch {
        // Continue with other changes
      }
    }

    // Rebuild full order including hidden habits
    const visibleIds = new Set(newHabitOrder.map(h => h.id));
    const hiddenHabits = orderedHabits.filter(h => !visibleIds.has(h.id));
    const fullOrder = [...newHabitOrder, ...hiddenHabits];

    setOrderedHabits(fullOrder);
    saveDailyOrder(dateStr, fullOrder.map(h => h.id));
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

      <AnimatedScrollView
        ref={scrollableRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Sortable.Grid
          data={flatList}
          columns={1}
          customHandle
          renderItem={({ item }) => {
            if (item.type === 'header') {
              const isFirstHeader = item.id === firstHeaderId;
              if (isFirstHeader) {
                // First header: locked in place, can't be displaced
                return (
                  <Sortable.Handle mode="fixed-order">
                    <HabitSectionHeader
                      title={item.timeOfDay}
                      count={item.count}
                    />
                  </Sortable.Handle>
                );
              }
              // Other headers: can't be picked up, but slide out of the way
              return (
                <HabitSectionHeader
                  title={item.timeOfDay}
                  count={item.count}
                />
              );
            }

            // Wrap habit in Sortable.Handle → can be picked up
            return (
              <Sortable.Handle>
                <HabitItem
                  habit={item.habit}
                  dateStr={dateStr}
                  onToggle={() => onToggleHabit(item.habit.id)}
                  onPress={() => handleHabitPress(item.habit)}
                  onIncrementUpdate={onIncrementUpdate}
                  onSkip={() => onSkipHabit?.(item.habit.id)}
                  onSnooze={() => onSnoozeHabit?.(item.habit.id)}
                />
              </Sortable.Handle>
            );
          }}
          keyExtractor={(item) => item.id}
          onDragEnd={handleDragEnd}
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
      </AnimatedScrollView>

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
