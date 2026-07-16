// @/app/(tabs)/habits/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';

import HabitsList from '@/components/habits/HabitsList';
import { isHabitActiveToday } from '@/utils/habitUtils';
import ProgressBar from '@/components/habits/ProgressBar';
import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits, HabitWithStatus } from '@/hooks/useHabits';
import SnoozeHabitModal from '@/modals/habits/SnoozeHabit';
import { STORAGE_KEYS } from '@/storage/keys';
import { globalStyles } from '@/styles';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import {
  formatDateHeader,
  formatLocalDate,
  getCurrentHabitDay,
  getHabitDate,
  isToday,
  navigateDate as navigateDateUtil,
  parseLocalDate,
} from '@/utils/dateUtils';
import { useGradientForTime } from '@/utils/gradients';

export default function HabitsPage() {
  const { user } = useAuth();
  const gradient = useGradientForTime();

  const atNoon = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);

  const [viewingDate, setViewingDate] = useState<Date>(atNoon(getCurrentHabitDay()));

  // use the habits hook to get all data
  const {
    habits,
    allHabits,
    loading,
    resetTime,
    appStreak,
    totalPoints,
    earnedPoints,
    progressTotal,
    progressEarned,
    progressSkipped,
    toggleHabit,
    updateIncrement,
    loadHabits,
    snoozeHabit,
    skipHabit,
    unskipHabit,
    unskipAndCompleteHabit,
    reorderHabits,
    deleteHabit,
    archiveHabit,
  } = useHabits(viewingDate);

  // snooze modal state
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [snoozeTargetHabit, setSnoozeTargetHabit] = useState<HabitWithStatus | null>(null);
  const [snoozeDateStr, setSnoozeDateStr] = useState('');

  const handleSnoozeHabit = async (habitId: string) => {
    const target = habits.find(h => h.id === habitId) ?? null;

    // viewing a past day → snooze to today; viewing today → snooze to tomorrow.
    // "tomorrow" is the day AFTER the current habit day (respects the reset time),
    // not calendar tomorrow — otherwise at e.g. 2am with a 4am reset it would skip
    // a day (the habit day is still "yesterday" until the reset passes).
    const todayStr = getHabitDate(new Date(), resetTime.hour, resetTime.minute);
    const viewingStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);
    let defaultSnoozeStr: string;
    if (viewingStr < todayStr) {
      defaultSnoozeStr = todayStr;
    } else {
      const tomorrow = parseLocalDate(viewingStr);
      tomorrow.setDate(tomorrow.getDate() + 1);
      defaultSnoozeStr = formatLocalDate(tomorrow);
    }

    await snoozeHabit(habitId, defaultSnoozeStr);

    setSnoozeTargetHabit(target);
    setSnoozeDateStr(defaultSnoozeStr);
    setSnoozeModalVisible(true);
  };

  const handleUpdateSnoozeDate = async (habitId: string, newDateStr: string) => {
    await snoozeHabit(habitId, newDateStr);
  };

  const handleUndoSnooze = async (habitId: string) => {
    await snoozeHabit(habitId, null);
  };

  // night mode detection (for text color)
  const currentHour = new Date().getHours();
  const isNightMode = currentHour >= 21 || currentHour < 5;
  const textColor = isNightMode ? 'white' : 'black';

  // filter only active habits for the current viewing date
  const activeHabits = habits.filter(habit =>
    isHabitActiveToday(habit, viewingDate, resetTime.hour, resetTime.minute)
  );

  const dateStr = getHabitDate(viewingDate, resetTime.hour, resetTime.minute);

  // habits snoozed away from the viewing date + unscheduled inbox habits —
  // both live on the inbox page, counted for the button badge
  const snoozedHabits = allHabits.filter(h => {
    const from = h.snoozedFrom?.slice(0, 10);
    const until = h.snoozedUntil?.slice(0, 10);
    return from && until && dateStr >= from && dateStr < until;
  });
  const inboxCount = allHabits.filter(h => !h.startDate && !h.archivedAt).length;

  // badge count must match the Inbox page, which is always relative to REAL today —
  // so navigating to a different day doesn't change the "Inbox & Snoozed (#)" number
  const realTodayStr = getHabitDate(new Date(), resetTime.hour, resetTime.minute);
  const snoozedTodayCount = allHabits.filter(h => {
    const from = h.snoozedFrom?.slice(0, 10);
    const until = h.snoozedUntil?.slice(0, 10);
    return from && until && realTodayStr >= from && realTodayStr < until;
  }).length;

  // calculate totals for points badge (unchanged)
  const totalActivePoints = activeHabits.reduce(
    (sum, h) => h.frequency === 'Weekly Goal' ? sum : sum + (h.rewardPoints || 0),
    0
  );

  // navigate between dates
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const newDate = navigateDateUtil(viewingDate, direction);
    setViewingDate(atNoon(newDate));
  };

  // jump to today (using resetTime)
  const handleGoToToday = () => {
    const todayHabitDay = getCurrentHabitDay(resetTime.hour, resetTime.minute);
    setViewingDate(atNoon(todayHabitDay));
  };

  // check if viewing today
  const isViewingToday = isToday(viewingDate, resetTime.hour, resetTime.minute);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const dirty = await AsyncStorage.getItem(STORAGE_KEYS.HABITS_DIRTY);
        if (!cancelled && dirty === '1') {
          await AsyncStorage.removeItem(STORAGE_KEYS.HABITS_DIRTY);
          loadHabits();
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [loadHabits])
  );

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{ flex: 1 }}
    >
      <PageContainer showBottomNav>
        <PageHeader title="Habits" textColor={textColor} />

        {/* date navigator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          {/* previous day button */}
          <Pressable onPress={() => handleNavigateDate('prev')} style={{ padding: 5 }}>
            <Image
              source={SYSTEM_ICONS.sortLeft}
              style={{
                width: 20,
                height: 20,
                tintColor: textColor,
              }}
            />
          </Pressable>

          {/* date display / jump to Today */}
          <Pressable
            style={{
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#000',
              backgroundColor: COLORS.PrimaryLight,
            }}
            onPress={handleGoToToday}
          >
            <Text
              style={[
                globalStyles.body2,
                {
                  color: isViewingToday ? textColor : `${COLORS.Secondary}`,
                  fontSize: 13,
                },
              ]}
            >
              {formatDateHeader(viewingDate)}
            </Text>
          </Pressable>

          {/* next day button */}
          <Pressable onPress={() => handleNavigateDate('next')} style={{ padding: 5 }}>
            <Image
              source={SYSTEM_ICONS.sortRight}
              style={{
                width: 20,
                height: 20,
                tintColor: textColor,
              }}
            />
          </Pressable>
        </View>

        {/* progress bar */}
        <ProgressBar
          totalHabits={progressTotal}
          completedHabits={progressEarned}
          skippedHabits={progressSkipped}
          earnedPoints={earnedPoints}
          totalPossiblePoints={totalActivePoints}
          appStreak={appStreak}
        />

        {/* habits list */}
        <HabitsList
          habits={habits}
          snoozedHabits={snoozedHabits}
          inboxCount={inboxCount}
          inboxSnoozedCount={snoozedTodayCount}
          loading={loading}
          viewingDate={viewingDate}
          resetTime={resetTime}
          userId={user?.id ?? ''}
          onToggleHabit={toggleHabit}
          onIncrementUpdate={updateIncrement}
          onSkipHabit={skipHabit}
          onUnskipHabit={unskipHabit}
          onUnskipAndCompleteHabit={unskipAndCompleteHabit}
          onSnoozeHabit={handleSnoozeHabit}
          onReorderHabits={reorderHabits}
          onDeleteHabit={deleteHabit}
          onArchiveHabit={archiveHabit}
          onReloadHabits={loadHabits}
        />

        {/* snooze confirmation modal */}
        <SnoozeHabitModal
          visible={snoozeModalVisible}
          onClose={() => setSnoozeModalVisible(false)}
          habit={snoozeTargetHabit}
          snoozeDateStr={snoozeDateStr}
          onUpdateSnoozeDate={handleUpdateSnoozeDate}
          onUndoSnooze={handleUndoSnooze}
          resetHour={resetTime.hour}
          resetMin={resetTime.minute}
        />

        {/* floating buttons */}
        <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
          <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
            <Pressable onPress={() => router.push('/more/journal/NewEntry')}>
              <ShadowBox
                contentBackgroundColor={PAGE.journal.border[0]}
                contentBorderRadius={30}
                shadowBorderRadius={30}
              >
                <View
                  style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Image source={SYSTEM_ICONS.write} style={{ width: 20, height: 20 }} />
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable onPress={() => router.push({ pathname: '/habits/NewHabitPage', params: { startDate: formatLocalDate(viewingDate) } })}>
              <ShadowBox
                contentBackgroundColor={COLORS.PrimaryLight}
                contentBorderRadius={30}
                shadowBorderRadius={30}
              >
                <View
                  style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                >
                  <Image source={SYSTEM_ICONS.plus} style={{ width: 20, height: 20 }} />
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </View>
      </PageContainer>
    </LinearGradient>
  );
}