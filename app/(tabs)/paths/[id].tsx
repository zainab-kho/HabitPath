// app/(tabs)/paths/[id].tsx
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import { loadHabitsFromSupabase } from '@/lib/supabase/queries/habit';
import AddHabitsToPathModal from '@/modals/AddHabitsToPathModal';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { Path } from '@/types/Path';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate, formatDisplayDateString, parseLocalDate, getWeekDatesForDate } from '@/utils/dateUtils';
import { isHabitActiveToday, getHabitStatus, getHabitCycleStart } from '@/utils/habitUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

// helpers

function completionsOnDate(habits: Habit[], date: string): number {
  return habits.filter(h => h.completionHistory?.includes(date)).length;
}

function completionsInRange(habits: Habit[], days: string[]): number {
  return days.reduce((sum, d) => sum + completionsOnDate(habits, d), 0);
}

// heat map

function HeatMap({
  habits,
  color,
  resetHour,
  resetMin,
  selectedDay,
  onSelectDay,
}: {
  habits: Habit[];
  color: string;
  resetHour: number;
  resetMin: number;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
}) {
  const now = new Date();
  const todayStr = getHabitDate(now, resetHour, resetMin);

  const [viewingMonth, setViewingMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const year = viewingMonth.getFullYear();
  const month = viewingMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const monthName = viewingMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1, 12);
    return getHabitDate(d, resetHour, resetMin);
  });

  const counts = monthDays.map(d => completionsOnDate(habits, d));
  const maxCount = Math.max(...counts, 1);

  const prevMonth = () => setViewingMonth(new Date(year, month - 1, 1));
  const nextMonth = () => {
    if (!isCurrentMonth) setViewingMonth(new Date(year, month + 1, 1));
  };

  return (
    <View>
      <View style={heatmap.monthNav}>
        <Pressable onPress={prevMonth} style={{ padding: 4 }}>
          <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 16, height: 16 }} />
        </Pressable>
        <Pressable onPress={() => setViewingMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>
          <Text style={heatmap.monthLabel}>{monthName}</Text>
        </Pressable>
        <Pressable onPress={nextMonth} style={{ padding: 4, opacity: isCurrentMonth ? 0.2 : 1 }}>
          <Image source={SYSTEM_ICONS.sortRight} style={{ width: 16, height: 16 }} />
        </Pressable>
      </View>

      <View style={heatmap.headerRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
          <Text key={i} style={heatmap.dayLabel}>{label}</Text>
        ))}
      </View>

      <View style={heatmap.grid}>
        {/* empty cells before the 1st */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <View key={`empty-${i}`} style={[heatmap.cell, { borderWidth: 0, backgroundColor: 'transparent' }]} />
        ))}

        {monthDays.map((day, i) => {
          const dayNum = i + 1;
          const isFuture = day > todayStr;
          const count = counts[i];
          const ratio = isFuture || count === 0 ? 0 : count / maxCount;

          let bgColor: string;
          if (isFuture || count === 0) {
            bgColor = 'rgba(0,0,0,0.05)';
          } else if (ratio <= 0.25) {
            bgColor = color + '77';
          } else if (ratio <= 0.5) {
            bgColor = color + 'aa';
          } else if (ratio <= 0.75) {
            bgColor = color + 'dd';
          } else {
            bgColor = color;
          }

          const textColor = ratio > 0.5 && !isFuture && count > 0 ? '#fff' : 'rgba(0,0,0,0.5)';

          const isSelected = day === selectedDay;

          return (
            <Pressable
              key={day}
              onPress={() => !isFuture && onSelectDay(isSelected ? null : day)}
              style={[
                heatmap.cell,
                { backgroundColor: bgColor },
                isFuture && { borderColor: 'rgba(196, 196, 196, 0.87)', opacity: 0.25 },
                isSelected && { borderColor: color },
              ]}
            >
              <Text style={[heatmap.dayNum, { color: textColor }]}>{dayNum}</Text>
            </Pressable>
          );
        })}

      </View>

      <View style={heatmap.legend}>
        <Text style={heatmap.legendLabel}>Less</Text>
        {['rgba(0,0,0,0.05)', color + '77', color + 'aa', color + 'dd', color].map((c, i) => (
          <View key={i} style={[heatmap.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={heatmap.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const heatmap = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthLabel: {
    fontFamily: 'p2',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    columnGap: 1.5,
    marginBottom: 10,
  },
  dayLabel: {
    width: '13.2%',
    textAlign: 'center',
    fontFamily: 'label',
    fontSize: 12,
    opacity: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 1.5,
    rowGap: 1.5,
  },
  cell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  dayNum: {
    fontFamily: 'label',
    fontSize: 12,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: -25,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: '#000',
  },
  legendLabel: {
    fontFamily: 'label',
    fontSize: 10,
    opacity: 0.45,
    marginHorizontal: 5
  },
});

// path detail page

export default function PathDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  // dates
  const today = useMemo(() => new Date(), []);
  const { habits: allHabitsRaw, loadHabits, resetTime } = useHabits(today);
  const allHabits: Habit[] = allHabitsRaw.map(({ completed, ...rest }: any) => rest);

  const resetHour = resetTime.hour;
  const resetMin = resetTime.minute;

  const [path, setPath] = useState<Path | null>(null);
  const [pathLoading, setPathLoading] = useState(true);
  const [showAddHabits, setShowAddHabits] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  // all habits (unfiltered, includes archived + future)
  const [allHabitsAll, setAllHabitsAll] = useState<Habit[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [weeklyCollapsed, setWeeklyCollapsed] = useState(false);

  // helpers
  const todayStr = useMemo(() => getHabitDate(new Date(), resetHour, resetMin), [resetHour, resetMin]);

  const isRecurring = (h: Habit) =>
    h.frequency === 'Daily' || h.frequency === 'Weekly' || h.frequency === 'Weekly Goal' || h.frequency === 'Monthly';

  const isVisible = (h: Habit): boolean => {
    const snoozeDay = h.snoozedUntil?.slice(0, 10);
    if (snoozeDay && snoozeDay > todayStr) return true;
    return isHabitActiveToday(h, new Date(), resetHour, resetMin);
  };

  // past one-timers, completed keep-until, etc.
  const isArchived = (h: Habit): boolean => {
    const snoozeDay = h.snoozedUntil?.slice(0, 10);
    if (snoozeDay && snoozeDay > todayStr) return false;
    if (isRecurring(h) && h.frequency !== 'Weekly Goal') return false;
    if (isHabitActiveToday(h, new Date(), resetHour, resetMin)) return false;
    return true;
  };

  // label like "snoozed until...", "today", etc.
  const nextDueLabel = (h: Habit): string | null => {
    const snoozeDay = h.snoozedUntil?.slice(0, 10);
    if (snoozeDay && snoozeDay > todayStr) return `Snoozed until ${formatDisplayDateString(snoozeDay)}`;
    if (h.keepUntil) return 'Until completed';
    if (!isRecurring(h)) {
      if (h.startDate > todayStr) return formatDisplayDateString(h.startDate);
      return 'Today';
    }
    return null; // recurring — the frequency badge is enough
  };

  // visible habits in this path, sorted: one-time → recurring → snoozed
  const pathHabits = path
    ? allHabitsAll
        .filter(h => h.path === path.name && h.frequency !== 'Weekly Goal' && isVisible(h))
        .sort((a, b) => {
          const order = (h: Habit) => {
            const snoozeDay = h.snoozedUntil?.slice(0, 10);
            if (snoozeDay && snoozeDay > todayStr) return 3;
            if (isRecurring(h)) return 1;
            return 0;
          };
          return order(a) - order(b);
        })
    : [];

  // weekly goals follow the selected day's week; default to the current week
  const weekAnchor = selectedDay ?? todayStr;
  const weekStart = getWeekDatesForDate(weekAnchor)[0];

  const weekRangeLabel = useMemo(() => {
    const monday = parseLocalDate(weekStart);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [weekStart]);

  // weekly goal habits shown in their own section, scoped to the anchor week
  const weeklyGoalHabits = path
    ? allHabitsAll.filter(h => {
        if (h.path !== path.name || h.frequency !== 'Weekly Goal') return false;
        if (!selectedDay) return isVisible(h);
        // for a selected day, show goals that existed during that week
        const startMonday = getWeekDatesForDate(h.startDate)[0];
        if (weekStart < startMonday) return false;
        if (h.endDate && weekStart > getWeekDatesForDate(h.endDate)[0]) return false;
        return true;
      })
    : [];

  // all habits in this path (for heatmap + trends)
  const allPathHabits = path
    ? allHabitsAll.filter(h => h.path === path.name)
    : [];

  // archived habits, most recent first
  const archivedHabits = path
    ? allHabitsAll
        .filter(h => h.path === path.name && isArchived(h))
        .sort((a, b) => {
          const aDate = a.completionHistory?.slice(-1)[0] ?? a.startDate;
          const bDate = b.completionHistory?.slice(-1)[0] ?? b.startDate;
          return bDate.localeCompare(aDate);
        })
    : [];

  // unassigned habits (no path)
  const unassignedHabits = path
    ? allHabitsAll.filter(h => !h.path && isVisible(h))
    : [];

  const loadAllHabits = useCallback(async () => {
    if (!user) return;
    try {
      const habits = await loadHabitsFromSupabase(user.id);
      setAllHabitsAll(habits);
    } catch (e) {
      console.error('Error loading habits:', e);
    }
  }, [user]);

  const loadPath = useCallback(async () => {
    if (!user || !id) return;
    setPathLoading(true);

    try {
      const { data: pathData, error: pathError } = await supabase
        .from('paths')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (pathError || !pathData) {
        router.back();
        return;
      }

      setPath(pathData as Path);
      await loadAllHabits();
    } catch (err) {
      console.error('Error loading path:', err);
    } finally {
      setPathLoading(false);
    }
  }, [user, id, router, loadAllHabits]);

  useEffect(() => { loadPath(); }, [loadPath]);

  const { thisWeek, lastWeek, weekDiff, thisMonth, lastMonth, monthDiff } = useMemo(() => {
    if (allPathHabits.length === 0) return { thisWeek: 0, lastWeek: 0, weekDiff: 0, thisMonth: 0, lastMonth: 0, monthDiff: 0 };
    const todayHabitStr = getHabitDate(new Date(), resetHour, resetMin);
    const todayDate = new Date(todayHabitStr + 'T12:00:00');
    const todayDow = (todayDate.getDay() + 6) % 7;
    const thisMonday = new Date(todayDate);
    thisMonday.setDate(todayDate.getDate() - todayDow);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const daysIntoWeek = todayDow + 1;
    const thisWeekDays: string[] = [];
    const lastWeekDays: string[] = [];
    for (let i = 0; i < daysIntoWeek; i++) {
      const thisD = new Date(thisMonday);
      thisD.setDate(thisMonday.getDate() + i);
      thisWeekDays.push(getHabitDate(thisD, resetHour, resetMin));
      const lastD = new Date(lastMonday);
      lastD.setDate(lastMonday.getDate() + i);
      lastWeekDays.push(getHabitDate(lastD, resetHour, resetMin));
    }
    const tw = completionsInRange(allPathHabits, thisWeekDays);
    const lw = completionsInRange(allPathHabits, lastWeekDays);

    const todayHabitDate = todayHabitStr;
    const habitYear = parseInt(todayHabitDate.slice(0, 4));
    const habitMonth = parseInt(todayHabitDate.slice(5, 7)) - 1;
    const habitDay = parseInt(todayHabitDate.slice(8, 10));
    const lastMonthLength = new Date(habitYear, habitMonth, 0).getDate();
    const thisMonthDays: string[] = [];
    const lastMonthDays: string[] = [];
    for (let i = 1; i <= habitDay; i++) {
      const thisD = new Date(habitYear, habitMonth, i, 12);
      thisMonthDays.push(getHabitDate(thisD, resetHour, resetMin));
      if (i <= lastMonthLength) {
        const lastD = new Date(habitYear, habitMonth - 1, i, 12);
        lastMonthDays.push(getHabitDate(lastD, resetHour, resetMin));
      }
    }
    const tm = completionsInRange(allPathHabits, thisMonthDays);
    const lm = completionsInRange(allPathHabits, lastMonthDays);

    return { thisWeek: tw, lastWeek: lw, weekDiff: tw - lw, thisMonth: tm, lastMonth: lm, monthDiff: tm - lm };
  }, [allPathHabits, resetHour, resetMin]);

  // loading state

  if (pathLoading || !path) {
    return (
      <AppLinearGradient variant="path.background">
        <PageContainer showBottomNav>
          <PageHeader title="" showBackButton />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator />
          </View>
        </PageContainer>
      </AppLinearGradient>
    );
  }

  const colorHex = PATH_COLORS[path.color as PathColorKey] ?? '#999';

  const handleSaveHabits = async (selectedIds: string[]) => {
    const currentIds = pathHabits.map(h => h.id);
    const toAdd = selectedIds.filter(hid => !currentIds.includes(hid));
    const toRemove = currentIds.filter(hid => !selectedIds.includes(hid));

    try {
      if (toAdd.length > 0) {
        await supabase
          .from('habits')
          .update({ path: path.name, path_color: colorHex })
          .in('id', toAdd)
          .eq('user_id', user?.id);
      }

      if (toRemove.length > 0) {
        await supabase
          .from('habits')
          .update({ path: null, path_color: null })
          .in('id', toRemove)
          .eq('user_id', user?.id);
      }

      setShowAddHabits(false);
      await loadHabits();
      await loadAllHabits();
    } catch (err) {
      console.error('Error saving habits to path:', err);
    }
  };

  // add a single habit to this path
  const handleAddHabit = async (habitId: string) => {
    if (!path || !user) return;
    try {
      await supabase
        .from('habits')
        .update({ path: path.name, path_color: colorHex })
        .eq('id', habitId)
        .eq('user_id', user.id);
      await loadHabits();
      await loadAllHabits();
    } catch (err) {
      console.error('Error adding habit to path:', err);
    }
  };

  const handleTogglePause = async () => {
    if (!path || !user) return;
    const isPaused = !!path.paused;
    try {
      await supabase
        .from('paths')
        .update({ paused: !isPaused, paused_at: isPaused ? null : new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      setPath({ ...path, paused: !isPaused, paused_at: isPaused ? undefined : new Date().toISOString() });
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  const handleToggleArchive = async () => {
    if (!path || !user) return;
    const isArchived = !!path.archived_at;
    try {
      await supabase
        .from('paths')
        .update({ archived_at: isArchived ? null : new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
      if (!isArchived) {
        router.back();
      } else {
        setPath({ ...path, archived_at: isArchived ? undefined : new Date().toISOString() });
      }
    } catch (err) {
      console.error('Error toggling archive:', err);
    }
  };

  const handleDeletePath = () => {
    Alert.alert(
      'Delete Path',
      "This will remove the path and unlink all its habits. Habits won't be deleted.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('habits')
              .update({ path: null, path_color: null })
              .eq('user_id', user?.id)
              .eq('path', path.name);

            await supabase
              .from('paths')
              .delete()
              .eq('id', id);

            await loadHabits();
            router.back();
          },
        },
      ]
    );
  };

  const pathHabitIds = pathHabits.map(h => h.id);

  return (
    <AppLinearGradient variant="path.background">
      <PageContainer showBottomNav>
        <PageHeader
          title={path.name}
          showBackButton
          showPlusButton
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* trends */}
          <View style={styles.trendRow}>
            <View style={[styles.trendBubble, { backgroundColor: colorHex + '22' }]}>
              <Text style={[globalStyles.body1, { fontSize: 13 }]}>
                {thisWeek} this week
              </Text>
              {(thisWeek > 0 || lastWeek > 0) && (
                <View style={styles.trendIndicator}>
                  <Image
                    source={weekDiff > 0 ? SYSTEM_ICONS.trendUp : weekDiff < 0 ? SYSTEM_ICONS.trendDown : SYSTEM_ICONS.trendUp}
                    style={[styles.trendIcon, { tintColor: weekDiff > 0 ? '#2bb471' : weekDiff < 0 ? '#bc2d2d' : '#999' }]}
                  />
                  <Text style={[globalStyles.body1, { color: weekDiff > 0 ? '#2bb471' : weekDiff < 0 ? '#bc2d2d' : '#999' }]}>
                    {weekDiff === 0 ? '0%' : lastWeek === 0 ? 'New' : `${Math.round(Math.abs(weekDiff / lastWeek) * 100)}%`}
                  </Text>
                </View>
              )}
            </View>
            <View style={[styles.trendBubble, { backgroundColor: colorHex }]}>
              <Text style={[globalStyles.body2, { fontSize: 13 }]}>
                {thisMonth} this month
              </Text>
              {(thisMonth > 0 || lastMonth > 0) && (
                <View style={styles.trendIndicator}>
                  <Image
                    source={monthDiff > 0 ? SYSTEM_ICONS.trendUp : monthDiff < 0 ? SYSTEM_ICONS.trendDown : SYSTEM_ICONS.trendUp}
                    style={[styles.trendIcon, { tintColor: monthDiff > 0 ? '#2bb471' : monthDiff < 0 ? '#bc2d2d' : '#999' }]}
                  />
                  <Text style={[globalStyles.body1, { color: monthDiff > 0 ? '#2bb471' : monthDiff < 0 ? '#bc2d2d' : '#999' }]}>
                    {monthDiff === 0 ? '0%' : lastMonth === 0 ? 'New' : `${Math.round(Math.abs(monthDiff / lastMonth) * 100)}%`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* heat map */}
          <ShadowBox
            shadowColor={colorHex}
            shadowOffset={{ x: 0, y: 5 }}
            style={{ marginBottom: 16 }}
          >
            <View style={[styles.card, { paddingBottom: 10 }]}>
              {allPathHabits.length === 0 ? (
                <Text style={[globalStyles.label, { opacity: 0.4, marginTop: 8 }]}>
                  Add habits to see your progress
                </Text>
              ) : (
                <HeatMap
                  habits={allPathHabits}
                  color={colorHex}
                  resetHour={resetHour}
                  resetMin={resetMin}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                />
              )}

            </View>
          </ShadowBox>

          {/* habits */}
          {(() => {
            const showingSelectedDay = !!selectedDay;
            let displayHabits: (Habit & { dayStatus?: string })[] = [];

            const habitToday = todayStr;
            const isPastDay = showingSelectedDay && selectedDay < habitToday;

            if (showingSelectedDay) {
              const selDate = parseLocalDate(selectedDay);
              selDate.setHours(12);
              const isViewingToday2 = selectedDay === habitToday;

              displayHabits = allPathHabits
                .filter(h => h.frequency !== 'Weekly Goal' && isHabitActiveToday(h, selDate, resetHour, resetMin))
                .map(h => ({
                  ...h,
                  dayStatus: getHabitStatus(h, selectedDay, isViewingToday2, habitToday, selDate, resetHour, resetMin),
                }))
                .filter(h => h.dayStatus !== 'snoozed');
            }

            const selectedDateLabel = showingSelectedDay
              ? new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : null;

            return (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>
                    {showingSelectedDay ? selectedDateLabel!.toUpperCase() : 'HABITS'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {showingSelectedDay ? (
                      <Pressable onPress={() => setSelectedDay(null)} hitSlop={8}>
                        <ShadowBox>
                          <Text style={[globalStyles.body, { fontSize: 10, paddingHorizontal: 10, paddingVertical: 3 }]}>CLEAR</Text>
                        </ShadowBox>
                      </Pressable>
                    ) : (
                      <>
                        {archivedHabits.length > 0 && (
                          <Pressable onPress={() => setShowArchived(true)}>
                            <ShadowBox contentBackgroundColor="#f0f0f0" shadowBorderRadius={15} shadowOffset={{ x: 0, y: 3 }}>
                              <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                <Text style={[globalStyles.body1]}>Archived</Text>
                              </View>
                            </ShadowBox>
                          </Pressable>
                        )}
                        <Pressable onPress={() => setShowAddHabits(true)}>
                          <ShadowBox contentBackgroundColor={colorHex} shadowBorderRadius={15} shadowOffset={{ x: 0, y: 3 }}>
                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                              <Text style={[globalStyles.body1]}>Edit</Text>
                            </View>
                          </ShadowBox>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>

                {showingSelectedDay ? (
                  displayHabits.length === 0 ? (
                      <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                        <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                          No habits scheduled for this day
                        </Text>
                      </View>
                  ) : (
                    displayHabits.map(habit => {
                      const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
                      const isDone = habit.dayStatus === 'completed';
                      const isSkipped = habit.dayStatus === 'skipped';

                      return (
                        <ShadowBox
                          key={habit.id}
                          contentBackgroundColor={isDone ? colorHex : '#fff'}
                          contentBorderColor="#000"
                          contentBorderWidth={1}
                          shadowBorderRadius={15}
                          shadowOffset={isDone ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                          shadowColor={colorHex}
                          style={{ marginBottom: 12 }}
                        >
                          <View style={styles.habitRow}>
                            <View style={styles.habitIconWrap}>
                              {iconFile ? (
                                <Image source={iconFile} style={styles.habitIcon} />
                              ) : (
                                <Text style={{ fontSize: 24 }}>✦</Text>
                              )}
                            </View>

                            <View style={{ flex: 1, gap: 6 }}>
                              <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>
                                {habit.name}
                              </Text>
                              {isPastDay && !isDone && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <View style={[
                                    globalStyles.bubbleLabel,
                                    {
                                      backgroundColor: isSkipped ? '#F6EC6C' : '#97AFB9',
                                      borderColor: isSkipped ? '#F6EC6C' : '#97AFB9',
                                    },
                                  ]}>
                                    <Text style={[globalStyles.label, { opacity: 1, color: '#000' }]}>
                                      {isSkipped ? 'Skipped' : 'Missed'}
                                    </Text>
                                  </View>
                                </View>
                              )}
                            </View>
                          </View>
                        </ShadowBox>
                      );
                    })
                  )
                ) : pathHabits.length === 0 ? (
                  <ShadowBox
                    contentBackgroundColor="#fff"
                    shadowBorderRadius={15}
                    shadowOffset={{ x: 0, y: 5 }}
                    shadowColor={colorHex}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
                      <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                        No habits yet — tap Add to get started
                      </Text>
                    </View>
                  </ShadowBox>
                ) : (
                  pathHabits.map(habit => {
                    const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
                    // keepUntil habits record completion against their cycle start, not today
                    const effectiveDate = habit.keepUntil
                      ? getHabitCycleStart(habit, new Date(), resetHour, resetMin)
                      : habitToday;
                    let isDoneToday = habit.completionHistory?.includes(effectiveDate) ?? false;
                    if (!isDoneToday && habit.increment) {
                      const amount = habit.incrementHistory?.[effectiveDate] ?? 0;
                      const goal = habit.keepUntil
                        ? (habit.incrementGoal && habit.incrementGoal > 0 ? habit.incrementGoal : 1)
                        : (habit.incrementGoal ?? 0);
                      isDoneToday = goal > 0 && amount >= goal;
                    }

                    return (
                      <ShadowBox
                        key={habit.id}
                        contentBackgroundColor={isDoneToday ? colorHex : '#fff'}
                        contentBorderColor="#000"
                        contentBorderWidth={1}
                        shadowBorderRadius={15}
                        shadowOffset={isDoneToday ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                        shadowColor={isDoneToday ? '#000' : colorHex}
                        style={{ marginBottom: 12 }}
                      >
                        <View style={styles.habitRow}>
                          <View style={styles.habitIconWrap}>
                            {iconFile ? (
                              <Image source={iconFile} style={styles.habitIcon} />
                            ) : (
                              <Text style={{ fontSize: 24 }}>✦</Text>
                            )}
                          </View>

                          <View style={{ flex: 1, gap: 6 }}>
                            <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>
                              {habit.name}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.path.primary[0], borderColor: colorHex}]}>
                                <Text style={globalStyles.label}>
                                  {habit.frequency === 'Weekly Goal' ? 'Week Goal' : isRecurring(habit) ? `↻ ${habit.frequency}` : '1×'}
                                </Text>
                              </View>
                              {nextDueLabel(habit) && (
                                <View style={[globalStyles.bubbleLabel, { backgroundColor: '#97AFB9', borderColor: colorHex }]}>
                                  <Text style={globalStyles.label}>{nextDueLabel(habit)}</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                      </ShadowBox>
                    );
                  })
                )}
              </>
            );
          })()}

          {/* weekly goals */}
          {weeklyGoalHabits.length > 0 && (
            <View style={{ marginTop: 15 }}>
              <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>WEEKLY GOALS</Text>
              <View style={{
                borderWidth: 1,
                borderColor: '#000',
                borderRadius: 15,
                padding: 10,
                paddingVertical: 15,
                backgroundColor: PAGE.path.background[0],
              }}>
              <Pressable
                onPress={() => setWeeklyCollapsed(!weeklyCollapsed)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: weeklyCollapsed ? 0 : 10,
                  marginHorizontal: 10,
                }}
              >
                <Text style={globalStyles.body}>{weekRangeLabel}</Text>
                <Image
                  source={SYSTEM_ICONS.sort}
                  style={{
                    width: 20,
                    height: 20,
                    tintColor: colorHex,
                    transform: [{ rotate: weeklyCollapsed ? '0deg' : '180deg' }],
                  }}
                />
              </Pressable>

              {!weeklyCollapsed && weeklyGoalHabits.map(habit => {
                const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
                // weekly goals record completion against the week's monday
                let isDoneToday = habit.completionHistory?.includes(weekStart) ?? false;
                if (!isDoneToday && habit.increment) {
                  const amount = habit.incrementHistory?.[weekStart] ?? 0;
                  const goal = habit.incrementGoal ?? 0;
                  isDoneToday = goal > 0 && amount >= goal;
                }
                return (
                  <ShadowBox
                    key={habit.id}
                    contentBackgroundColor={isDoneToday ? colorHex : '#fff'}
                    contentBorderColor="#000"
                    contentBorderWidth={1}
                    shadowBorderRadius={15}
                    shadowOffset={isDoneToday ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                    shadowColor={isDoneToday ? '#000' : colorHex}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={styles.habitRow}>
                      <View style={styles.habitIconWrap}>
                        {iconFile ? (
                          <Image source={iconFile} style={styles.habitIcon} />
                        ) : (
                          <Text style={{ fontSize: 24 }}>✦</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>
                          {habit.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.path.primary[0], borderColor: colorHex }]}>
                            <Text style={globalStyles.label}>Week Goal</Text>
                          </View>
                          {nextDueLabel(habit) && (
                            <View style={[globalStyles.bubbleLabel, { backgroundColor: '#97AFB9', borderColor: colorHex }]}>
                              <Text style={globalStyles.label}>{nextDueLabel(habit)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </ShadowBox>
                );
              })}
              </View>
            </View>
          )}

          {/* unassigned habits */}
          {unassignedHabits.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>NOT IN ANY PATH ({unassignedHabits.length})</Text>
              </View>
              {unassignedHabits.map(habit => {
                const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
                return (
                  <ShadowBox
                    key={habit.id}
                    contentBackgroundColor="#fff"
                    contentBorderColor="#000"
                    contentBorderWidth={1}
                    shadowBorderRadius={15}
                    shadowOffset={{ x: 0, y: 5 }}
                    shadowColor={COLORS.Primary}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={styles.habitRow}>
                      <View style={styles.habitIconWrap}>
                        {iconFile ? (
                          <Image source={iconFile} style={styles.habitIcon} />
                        ) : (
                          <Text style={{ fontSize: 24 }}>✦</Text>
                        )}
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>{habit.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.path.primary[0], borderColor: colorHex }]}>
                            <Text style={globalStyles.label}>
                              {habit.frequency === 'Weekly Goal' ? 'Week Goal' : isRecurring(habit) ? `↻ ${habit.frequency}` : '1×'}
                            </Text>
                          </View>
                          {nextDueLabel(habit) && (
                            <View style={[globalStyles.bubbleLabel, { backgroundColor: '#97AFB9', borderColor: colorHex  }]}>
                              <Text style={globalStyles.label}>{nextDueLabel(habit)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Pressable onPress={() => handleAddHabit(habit.id)}>
                        <ShadowBox
                          contentBackgroundColor={colorHex}
                          shadowBorderRadius={15}
                          shadowOffset={{ x: 0, y: 3 }}
                        >
                          <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                            <Text style={[globalStyles.body1]}>Add</Text>
                          </View>
                        </ShadowBox>
                      </Pressable>
                    </View>
                  </ShadowBox>
                );
              })}
            </View>
          )}

          {/* actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 }}>
            <Pressable onPress={handleTogglePause} style={{ flex: 1, maxWidth: 100 }}>
              <ShadowBox
                contentBackgroundColor={path.paused ? colorHex : BUTTON_COLORS.Cancel}
                shadowBorderRadius={20}
              >
                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                  <Text style={globalStyles.body}>
                    {path.paused ? 'Unpause' : 'Pause'}
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable onPress={handleToggleArchive} style={{ flex: 1, maxWidth: 100 }}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                  <Text style={globalStyles.body}>
                    {path.archived_at ? 'Unarchive' : 'Archive'}
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable onPress={handleDeletePath} style={{ flex: 1, maxWidth: 100 }}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={20}>
                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                  <Text style={globalStyles.body}>Delete</Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </ScrollView>

        <AddHabitsToPathModal
          visible={showAddHabits}
          allHabits={allHabitsAll.length > 0 ? allHabitsAll : allHabits}
          pathHabitIds={pathHabitIds}
          pathColor={colorHex}
          pathName={path.name}
          resetHour={resetHour}
          resetMin={resetMin}
          onClose={() => setShowAddHabits(false)}
          onSave={handleSaveHabits}
        />

        {/* archived habits modal */}
        <Modal visible={showArchived} transparent animationType="none" onRequestClose={() => setShowArchived(false)}>
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
            onPress={() => setShowArchived(false)}
          >
            <Pressable
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                borderWidth: 3,
                borderColor: colorHex,
                maxHeight: '75%',
                width: '90%',
                alignSelf: 'center',
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ marginTop: 20, marginBottom: 10 }}>
                <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>Archived</Text>
                <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                  Completed or past one-time habits
                </Text>
              </View>

              <GHScrollView style={{ paddingHorizontal: 3 }}>
                <View style={{ padding: 20, paddingTop: 10 }}>
                  {archivedHabits.map(habit => {
                    const iconFile = habit.icon ? HABIT_ICONS[habit.icon] : null;
                    const completedDate = habit.completionHistory?.slice(-1)[0];
                    const isDone = (habit.completionHistory?.length ?? 0) > 0;
                    return (
                      <ShadowBox
                        key={habit.id}
                        contentBackgroundColor={isDone ? colorHex : '#fff'}
                        contentBorderColor="#000"
                        contentBorderWidth={1}
                        shadowBorderRadius={15}
                        shadowOffset={isDone ? { x: 0, y: 0 } : { x: 0, y: 5 }}
                        shadowColor={colorHex}
                        style={{ marginBottom: 12 }}
                      >
                        <View style={styles.habitRow}>
                          <View style={styles.habitIconWrap}>
                            {iconFile
                              ? <Image source={iconFile} style={styles.habitIcon} />
                              : <Text style={{ fontSize: 24 }}>✦</Text>
                            }
                          </View>
                          <View style={{ flex: 1, gap: 6 }}>
                            <Text style={[globalStyles.body, { fontSize: 15 }]} numberOfLines={1}>{habit.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <View style={[globalStyles.bubbleLabel, { backgroundColor: PAGE.path.primary[0], borderColor: colorHex }]}>
                                <Text style={globalStyles.label}>
                                  {habit.frequency === 'Weekly Goal' ? 'Week Goal' : isRecurring(habit) ? `↻ ${habit.frequency}` : '1×'}
                                </Text>
                              </View>
                              <View style={[globalStyles.bubbleLabel, { backgroundColor: COLORS.ProgressColor, borderColor: COLORS.ProgressColor }]}>
                                <Text style={[globalStyles.label, { opacity: 1 }]}>
                                  {completedDate
                                    ? `${formatDisplayDateString(completedDate)}`
                                    : formatDisplayDateString(habit.startDate)}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      </ShadowBox>
                    );
                  })}
                </View>
              </GHScrollView>

              <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10 }}>
                <Pressable onPress={() => setShowArchived(false)} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Close</Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </PageContainer>
    </AppLinearGradient>
  );
}


// styles

const styles = StyleSheet.create({
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  trendBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendIcon: {
    width: 14,
    height: 14,
  },
  card: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'label',
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    padding: 12,
  },
  habitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain' as const,
  },
});