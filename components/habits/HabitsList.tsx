// components/habits/HabitsList.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';
import { useRouter } from 'expo-router';

import HabitItem from '@/components/habits/HabitItem';
import HabitSectionHeader from '@/components/habits/HabitSectionHeader';
import { getWeeklyTimeTotal } from '@/utils/habitUtils';
import HabitDetailModal from '@/modals/HabitDetailModal';
import TimeLogModal from '@/modals/habits/TimeLogModal';
import { toggleQuestSubtaskCompletion } from '@/lib/supabase/queries/questGoalHabits';
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
  saveDailyOrder,
  saveTempTimeOfDay,
} from '@/hooks/useDailyHabitOverrides';

interface HabitsListProps {
  habits: HabitWithStatus[];
  loading?: boolean;
  viewingDate: Date | null;
  resetTime: { hour: number; minute: number };
  userId: string;
  onToggleHabit: (habitId: string) => void;
  onIncrementUpdate?: (habitId: string, newAmount: number) => void;
  onSkipHabit?: (habitId: string) => void;
  onUnskipHabit?: (habitId: string) => void;
  onUnskipAndCompleteHabit?: (habitId: string) => void;
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
  loading,
  viewingDate,
  resetTime,
  userId,
  onToggleHabit,
  onIncrementUpdate,
  onSkipHabit,
  onUnskipHabit,
  onUnskipAndCompleteHabit,
  onSnoozeHabit,
}: HabitsListProps) {
  const router = useRouter();
  const currentDate = viewingDate || new Date();
  const dateStr = getHabitDate(currentDate, resetTime.hour, resetTime.minute);
  const scrollableRef = useAnimatedRef<Animated.ScrollView>();

  const [showCompleted, setShowCompleted] = useState(true);
  const [expandedQuestGoals, setExpandedQuestGoals] = useState<Set<string>>(new Set());

  // No snapshot needed — `loading` from useHabits is derived (habitsForDate !== dateStr),
  // so it's always true when habits don't match the current date. Safe to use habits directly.

  // Modal state
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStatus | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Time log modal state
  const [timeLogHabit, setTimeLogHabit] = useState<HabitWithStatus | null>(null);
  const [timeLogVisible, setTimeLogVisible] = useState(false);

  const handleOpenTimeLog = (habit: HabitWithStatus) => {
    setTimeLogHabit(habit);
    setTimeLogVisible(true);
  };

  const handleLogTime = (minutes: number) => {
    if (!timeLogHabit || !onIncrementUpdate) return;
    const todayAmount = timeLogHabit.incrementHistory?.[dateStr] ?? 0;
    onIncrementUpdate(timeLogHabit.id, todayAmount + minutes);
  };

  const toggleQuestGoalExpanded = (habitId: string) => {
    setExpandedQuestGoals(prev => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  };

  // Local subtask completion overrides (optimistic, persisted to Supabase)
  const [subtaskOverrides, setSubtaskOverrides] = useState<Record<string, boolean>>({});

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      setSubtaskOverrides(prev => ({ ...prev, [subtaskId]: completed }));
      await toggleQuestSubtaskCompletion(subtaskId, completed);
    } catch (err) {
      console.error('Error toggling quest subtask:', err);
      // revert on error
      setSubtaskOverrides(prev => {
        const next = { ...prev };
        delete next[subtaskId];
        return next;
      });
    }
  };

  // Apply subtask overrides to habits
  const displayHabits = useMemo(() => {
    if (Object.keys(subtaskOverrides).length === 0) return habits;
    return habits.map(h => {
      if (!h.isQuestGoal || !h.questSubtasks) return h;
      return {
        ...h,
        questSubtasks: h.questSubtasks.map(s =>
          subtaskOverrides[s.id] !== undefined ? { ...s, completed: subtaskOverrides[s.id] } : s
        ),
      };
    });
  }, [habits, subtaskOverrides]);

  // displayHabits = habits + local subtask overrides. Already active-only from applyHabitsUpdate.
  const activeHabits = displayHabits;
  const regularActiveHabits = activeHabits.filter(h => !h.isQuestGoal && h.frequency !== 'Weekly Goal');
  const weeklyAndQuestHabits = activeHabits.filter(h => h.isQuestGoal || h.frequency === 'Weekly Goal');
  const incompleteCount = regularActiveHabits.filter(h => h.status !== 'completed' && h.status !== 'skipped').length;
  const scheduledHabits = regularActiveHabits;
  const allDoneToday = scheduledHabits.length > 0 && incompleteCount === 0;

  const saveToggleState = async () => {
    const nextValue = !showCompleted;
    setShowCompleted(nextValue);
    await AsyncStorage.setItem(
      STORAGE_KEYS.TOGGLE_STATE,
      nextValue ? '1' : '0'
    );
  };

  // Order comes directly from Supabase (tempOrder/tempOrderDate on each habit)
  const orderedHabits = useMemo(
    () => applyDailyOrder(activeHabits ?? [], dateStr),
    [activeHabits, dateStr],
  );

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.TOGGLE_STATE);
      if (stored !== null) {
        setShowCompleted(stored === '1');
      }
    })();
  }, []);

  // Build the flat list: headers interleaved with habits, grouped by section
  const flatList = useMemo(() => {
    const regularOrdered = orderedHabits.filter(h => !h.isQuestGoal && h.frequency !== 'Weekly Goal');
    const visible = showCompleted
      ? regularOrdered
      : regularOrdered.filter(h => h.status !== 'completed' && h.status !== 'skipped');

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

  const visibleWeeklyAndQuest = useMemo(() => {
    if (showCompleted) return weeklyAndQuestHabits;
    return weeklyAndQuestHabits.filter(h => h.status !== 'completed' && h.status !== 'skipped');
  }, [weeklyAndQuestHabits, showCompleted]);

  const firstHeaderId = flatList.length > 0 && flatList[0]?.type === 'header' ? flatList[0].id : null;

  const handleDragEnd = useCallback(async (params: { key: string; data: ListItem[] }) => {
    const { key: draggedKey, data: newOrder } = params;

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

    for (const change of sectionChanges) {
      try {
        await saveTempTimeOfDay(change.habitId, userId, change.newSection, dateStr);
      } catch {
        // Continue with other changes
      }
    }

    const visibleIds = new Set(newHabitOrder.map(h => h.id));
    const hiddenHabits = orderedHabits.filter(h => !visibleIds.has(h.id));
    const fullOrder = [...newHabitOrder, ...hiddenHabits];

    saveDailyOrder(fullOrder.map(h => h.id), userId, dateStr);
  }, [orderedHabits, dateStr, userId]);

  const handleHabitPress = (habit: HabitWithStatus) => {
    setSelectedHabit(habit);
    setModalVisible(true);
  };

  const handleModalUpdate = () => {
    // Order is derived from habits prop (Supabase data) — no manual reload needed
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', marginTop: 60 }}>
        <ActivityIndicator size="small" color={COLORS.Primary} />
      </View>
    );
  }

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

  if (scheduledHabits.length === 0 && weeklyAndQuestHabits.length === 0) {
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
                return (
                  <Sortable.Handle mode="fixed-order">
                    <HabitSectionHeader
                      title={item.timeOfDay}
                      count={item.count}
                    />
                  </Sortable.Handle>
                );
              }
              return (
                <HabitSectionHeader
                  title={item.timeOfDay}
                  count={item.count}
                />
              );
            }

            return (
              <Sortable.Handle>
                <HabitItem
                  habit={item.habit}
                  dateStr={dateStr}
                  currentDate={currentDate}
                  resetTime={resetTime}
                  onToggle={() => onToggleHabit(item.habit.id)}
                  onPress={() => handleHabitPress(item.habit)}
                  onIncrementUpdate={onIncrementUpdate}
                  onSkip={() => onSkipHabit?.(item.habit.id)}
                  onUnskip={() => onUnskipHabit?.(item.habit.id)}
                  onUnskipAndComplete={() => onUnskipAndCompleteHabit?.(item.habit.id)}
                  onSnooze={() => onSnoozeHabit?.(item.habit.id)}
                  onToggleSubtask={handleToggleSubtask}
                  questExpanded={expandedQuestGoals.has(item.habit.id)}
                  onToggleQuestExpand={() => toggleQuestGoalExpanded(item.habit.id)}
                  onNavigateToQuest={(questId) => router.push(`/(tabs)/quests/${questId}`)}
                  onOpenTimeLog={handleOpenTimeLog}
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
          itemEntering={null}
          itemExiting={null}
          itemsLayoutTransitionMode="reorder"
        />

        {visibleWeeklyAndQuest.length > 0 && (
          <View style={{
            marginTop: 10,
            backgroundColor: COLORS.PrimaryLight + '20',
            borderColor: '#000',
            borderWidth: 1,
            borderRadius: 15,
            padding: 10,
          }}>
            <HabitSectionHeader
              title="WEEKLY & QUESTS"
              count={visibleWeeklyAndQuest.length}
            />
            {visibleWeeklyAndQuest.map(habit => (
              <HabitItem
                key={habit.id}
                habit={habit}
                dateStr={dateStr}
                currentDate={currentDate}
                resetTime={resetTime}
                onToggle={() => onToggleHabit(habit.id)}
                onPress={() => handleHabitPress(habit)}
                onIncrementUpdate={onIncrementUpdate}
                onSkip={() => onSkipHabit?.(habit.id)}
                onUnskip={() => onUnskipHabit?.(habit.id)}
                onUnskipAndComplete={() => onUnskipAndCompleteHabit?.(habit.id)}
                onSnooze={() => onSnoozeHabit?.(habit.id)}
                onToggleSubtask={handleToggleSubtask}
                questExpanded={expandedQuestGoals.has(habit.id)}
                onToggleQuestExpand={() => toggleQuestGoalExpanded(habit.id)}
                onNavigateToQuest={(questId) => router.push(`/(tabs)/quests/${questId}`)}
                onOpenTimeLog={handleOpenTimeLog}
              />
            ))}
          </View>
        )}
      </AnimatedScrollView>

      <HabitDetailModal
        visible={modalVisible}
        habit={selectedHabit}
        onClose={() => setModalVisible(false)}
        onUpdate={handleModalUpdate}
      />

      <TimeLogModal
        visible={timeLogVisible}
        onClose={() => setTimeLogVisible(false)}
        habitName={timeLogHabit?.name ?? ''}
        weeklyTotal={timeLogHabit ? getWeeklyTimeTotal(timeLogHabit.incrementHistory, dateStr) : 0}
        weeklyGoal={timeLogHabit?.incrementGoal ?? 0}
        habitColor={timeLogHabit?.pathColor ?? undefined}
        onLogTime={handleLogTime}
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
