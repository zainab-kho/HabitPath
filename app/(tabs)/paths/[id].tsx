// app/(tabs)/paths/[id].tsx
import { BUTTON_COLORS } from '@/constants/colors';
import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { HABIT_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import AddHabitsToPathModal from '@/modals/AddHabitsToPathModal';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { Path } from '@/types/Path';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate } from '@/utils/dateUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** last N days as YYYY-MM-DD strings (oldest → newest), reset-time-aware */
function lastNDays(n: number, resetHour = 4, resetMin = 0): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(getHabitDate(d, resetHour, resetMin));
  }
  return days;
}

/** how many habits in this path were completed on a given date */
function completionsOnDate(habits: Habit[], date: string): number {
  return habits.filter(h => h.completionHistory?.includes(date)).length;
}

/** total points earned by all habits in path */
function totalPoints(habits: Habit[]): number {
  return habits.reduce((sum, h) => {
    return sum + (h.completionEntries?.reduce((s, e) => s + (e.pointsEarned || 0), 0) ?? 0);
  }, 0);
}

/** completions in last 7 days */
function completionsThisWeek(habits: Habit[], resetHour = 4, resetMin = 0): number {
  const recentDays = lastNDays(7, resetHour, resetMin);
  return recentDays.reduce((sum, d) => sum + completionsOnDate(habits, d), 0);
}

// ─── heat map ────────────────────────────────────────────────────────────────

function HeatMap({
  habits,
  color,
  resetHour,
  resetMin,
}: {
  habits: Habit[];
  color: string;
  resetHour: number;
  resetMin: number;
}) {
  const now = new Date();
  const todayStr = getHabitDate(now, resetHour, resetMin);

  // current month bounds
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun

  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // build date strings for every day of the month
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return getHabitDate(d, resetHour, resetMin);
  });

  const counts = monthDays.map(d => completionsOnDate(habits, d));
  const maxCount = Math.max(...counts, 1);

  return (
    <View style={heatmap.wrap}>
      {/* month label */}
      <Text style={heatmap.monthLabel}>{monthName}</Text>

      {/* S M T W T F S header */}
      <View style={heatmap.headerRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
          <Text key={i} style={heatmap.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* calendar grid */}
      <View style={heatmap.grid}>
        {/* invisible placeholders before the 1st */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <View key={`empty-${i}`} style={heatmap.cell} />
        ))}

        {/* actual days */}
        {monthDays.map((day, i) => {
          const dayNum = i + 1;
          const isToday = day === todayStr;
          const isFuture = day > todayStr;
          const count = counts[i];
          const ratio = isFuture || count === 0 ? 0 : count / maxCount;

          let bgColor: string;
          if (isFuture || count === 0) {
            bgColor = 'rgba(0,0,0,0.05)';
          } else if (ratio <= 0.25) {
            bgColor = color + '40';
          } else if (ratio <= 0.5) {
            bgColor = color + '70';
          } else if (ratio <= 0.75) {
            bgColor = color + 'a8';
          } else {
            bgColor = color + 'ee';
          }

          const textColor = ratio > 0.5 && !isFuture && count > 0 ? '#fff' : 'rgba(0,0,0,0.5)';

          return (
            <View
              key={day}
              style={[
                heatmap.cell,
                { backgroundColor: bgColor },
                isToday && { borderRadius: 50 },
                isFuture && { opacity: 0.25 },
              ]}
            >
              <Text style={[heatmap.dayNum, { color: textColor }]}>{dayNum}</Text>
              {count > 0 && !isFuture && (
                <Text style={[heatmap.cellCount, { color: ratio > 0.5 ? '#fff' : color }]}>
                  {count}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* legend */}
      <View style={heatmap.legend}>
        <Text style={heatmap.legendLabel}>Less</Text>
        {['rgba(0,0,0,0.05)', color + '40', color + '70', color + 'a8', color + 'ee'].map((c, i) => (
          <View key={i} style={[heatmap.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={heatmap.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const heatmap = StyleSheet.create({
  wrap: {
    paddingTop: 4,
    width: '70%',
    alignSelf: 'center',
  },
  monthLabel: {
    fontFamily: 'p2',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'label',
    fontSize: 10,
    opacity: 0.4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 1,
  },
  dayNum: {
    fontFamily: 'label',
    fontSize: 10,
    lineHeight: 11,
  },
  cellCount: {
    fontSize: 8,
    fontFamily: 'p2',
    lineHeight: 9,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 8,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: 'label',
    fontSize: 9,
    opacity: 0.45,
  },
});

// ─── main page ────────────────────────────────────────────────────────────────

export default function PathDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  // stable date reference — new Date() on every render would cause infinite loop in useHabits
  const today = useMemo(() => new Date(), []);
  const { habits: allHabitsRaw, loadHabits, resetTime } = useHabits(today);
  const allHabits: Habit[] = allHabitsRaw.map(({ completed, ...rest }: any) => rest);

  const resetHour = resetTime.hour;
  const resetMin = resetTime.minute;

  const [path, setPath] = useState<Path | null>(null);
  const [pathLoading, setPathLoading] = useState(true);
  const [showAddHabits, setShowAddHabits] = useState(false);

  // derived — always reflects latest completion history from the hook
  const pathHabits = path ? allHabits.filter(h => h.path === path.name) : [];

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
    } catch (err) {
      console.error('Error loading path:', err);
    } finally {
      setPathLoading(false);
    }
  }, [user, id, router]);

  useEffect(() => { loadPath(); }, [loadPath]);

  // ── render loading ─────────────────────────────────────────────────────────

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
    } catch (err) {
      console.error('Error saving habits to path:', err);
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
  const weekCompletions = completionsThisWeek(pathHabits, resetHour, resetMin);
  const pts = totalPoints(pathHabits);
  const bestStreak = Math.max(...pathHabits.map(h => h.bestStreak ?? 0), 0);
  const recentDays = lastNDays(7, resetHour, resetMin);

  return (
    <AppLinearGradient variant="path.background">
      <PageContainer showBottomNav>
        <PageHeader
          title={path.name}
          showBackButton
          showPlusButton
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── stats row ── */}
          <View style={styles.statsRow}>
            <StatBubble label="Habits" value={String(pathHabits.length)} color={colorHex} />
            <StatBubble label="This week" value={String(weekCompletions)} color={colorHex} />
            <StatBubble label="Best streak" value={bestStreak > 0 ? `${bestStreak}🔥` : '—'} color={colorHex} />
            <StatBubble label="Points" value={pts > 0 ? `${pts}✦` : '—'} color={colorHex} />
          </View>

          {/* ── 28-day heat map ── */}
          <ShadowBox
            contentBackgroundColor="#fff"
            shadowBorderRadius={16}
            shadowOffset={{ x: 0, y: 2 }}
            style={{ marginBottom: 16 }}
          >
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>THIS MONTH</Text>
              {pathHabits.length === 0 ? (
                <Text style={[globalStyles.label, { opacity: 0.4, marginTop: 8 }]}>
                  Add habits to see your progress
                </Text>
              ) : (
                <HeatMap
                  habits={pathHabits}
                  color={colorHex}
                  resetHour={resetHour}
                  resetMin={resetMin}
                />
              )}
            </View>
          </ShadowBox>

          {/* ── habits list ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HABITS</Text>
            <Pressable onPress={() => setShowAddHabits(true)}>
              <ShadowBox contentBackgroundColor={colorHex} shadowBorderRadius={12} shadowOffset={{ x: 1, y: 1 }}>
                <View style={styles.addBtn}>
                  <Text style={styles.addBtnText}>+ Add</Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>

          {pathHabits.length === 0 ? (
            <ShadowBox
              contentBackgroundColor="rgba(255,255,255,0.7)"
              shadowBorderRadius={16}
              shadowOffset={{ x: 0, y: 1 }}
              style={{ marginBottom: 10 }}
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

              return (
                <ShadowBox
                  key={habit.id}
                  contentBackgroundColor="#fff"
                  shadowBorderRadius={14}
                  shadowOffset={{ x: 0, y: 2 }}
                  style={{ marginBottom: 10 }}
                >
                  <View style={styles.habitRow}>
                    {/* icon */}
                    <View style={[styles.habitIconWrap, { backgroundColor: colorHex + '44' }]}>
                      {iconFile ? (
                        <Image source={iconFile} style={styles.habitIcon} />
                      ) : (
                        <Text style={{ fontSize: 16 }}>✦</Text>
                      )}
                    </View>

                    {/* name + week dots */}
                    <View style={{ flex: 1 }}>
                      <Text style={globalStyles.body} numberOfLines={1}>
                        {habit.name}
                      </Text>

                      <View style={styles.dotsRow}>
                        {recentDays.map(d => (
                          <View
                            key={d}
                            style={[
                              styles.dot,
                              {
                                backgroundColor: habit.completionHistory?.includes(d)
                                  ? colorHex
                                  : 'rgba(0,0,0,0.08)',
                              },
                            ]}
                          />
                        ))}
                      </View>
                    </View>

                    {/* streak */}
                    {(habit.streak ?? 0) > 0 && (
                      <Text style={styles.streakBadge}>{habit.streak}🔥</Text>
                    )}
                  </View>
                </ShadowBox>
              );
            })
          )}

          <Pressable onPress={handleDeletePath} style={{ width: 100, alignSelf: 'center' }}>
            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={15}>
              <View style={{ paddingVertical: 6 }}>
                <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                  Delete
                </Text>
              </View>
            </ShadowBox>
          </Pressable>
        </ScrollView>

        <AddHabitsToPathModal
          visible={showAddHabits}
          allHabits={allHabits}
          pathHabitIds={pathHabitIds}
          pathColor={colorHex}
          pathName={path.name}
          onClose={() => setShowAddHabits(false)}
          onSave={handleSaveHabits}
        />
      </PageContainer>
    </AppLinearGradient>
  );
}

// ─── stat bubble ──────────────────────────────────────────────────────────────

function StatBubble({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <ShadowBox contentBackgroundColor="#fff" shadowBorderRadius={14} shadowOffset={{ x: 0, y: 2 }} style={{ flex: 1 }}>
      <View style={styles.statBubble}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </ShadowBox>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBubble: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 2,
  },
  statValue: {
    fontFamily: 'p2',
    fontSize: 16,
  },
  statLabel: {
    fontFamily: 'label',
    fontSize: 10,
    opacity: 0.6,
  },
  card: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: 'label',
    fontSize: 11,
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  addBtnText: {
    fontFamily: 'p2',
    fontSize: 13,
    color: '#333',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  habitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitIcon: {
    width: 24,
    height: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  streakBadge: {
    fontFamily: 'p2',
    fontSize: 13,
    color: '#555',
  },
});