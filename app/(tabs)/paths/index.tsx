// app/(tabs)/paths/index.tsx
import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { isHabitActiveToday, getHabitCycleStart } from '@/utils/habitUtils';
import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import NewPathModal from '@/modals/NewPathModal';
import { globalStyles, uiStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { Path } from '@/types/Path';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { getHabitDate, getWeekDatesForDate } from '@/utils/dateUtils';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

// date helpers

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // indexed by getDay()

// builds the current week (user's configured start day), respecting reset time
function buildWeek(now: Date, resetHour: number, resetMin: number) {
    const todayStr = getHabitDate(now, resetHour, resetMin);
    const todayNoon = new Date(todayStr + 'T12:00:00');

    return getWeekDatesForDate(todayStr).map(str => {
        const noon = new Date(str + 'T12:00:00');
        // real datetime offset from now so reset-time math stays consistent
        const offset = Math.round((noon.getTime() - todayNoon.getTime()) / 86400000);
        const d = new Date(now);
        d.setDate(now.getDate() + offset);
        return {
            date: d,
            str,
            label: DAY_LETTERS[noon.getDay()],
            isFuture: str > todayStr,
        };
    });
}

// skipped pill
function SkippedPill({ opacity }: { opacity?: { opacity: number } | {} }) {
    return (
        <View style={[grid.pill, {
            backgroundColor: 'rgba(0,0,0,0.06)',
            borderColor: 'rgba(0,0,0,0.10)',
        }, opacity]} />
    );
}

// week grid

interface WeekGridProps {
    pathName: string;
    habits: Habit[];
    color: string;
    week: ReturnType<typeof buildWeek>;
    todayStr: string;
    now: Date;
    resetHour: number;
    resetMin: number;
}

function isHabitCompletedForDate(h: Habit, dateStr: string, date: Date, resetHour: number, resetMin: number): boolean {
    // weekly goals are week-scoped: a completion anywhere in the week counts
    if (h.frequency === 'Weekly Goal') {
        const weekDays = getWeekDatesForDate(dateStr);
        if (weekDays.some(d => h.completionHistory?.includes(d))) return true;
        if (h.increment) {
            const amount = weekDays.reduce((s, d) => s + (h.incrementHistory?.[d] ?? 0), 0);
            const goal = h.incrementGoal ?? 0;
            return goal > 0 && amount >= goal;
        }
        return false;
    }

    // keepUntil habits record completion against their cycle start, not the viewed day
    const effectiveDate = h.keepUntil
        ? getHabitCycleStart(h, date, resetHour, resetMin)
        : dateStr;
    if (h.completionHistory?.includes(effectiveDate)) return true;

    // increment habits count as done once their goal is reached
    if (h.increment) {
        const amount = h.incrementHistory?.[effectiveDate] ?? 0;
        const goal = h.keepUntil
            ? (h.incrementGoal && h.incrementGoal > 0 ? h.incrementGoal : 1)
            : (h.incrementGoal ?? 0);
        if (goal > 0 && amount >= goal) return true;
    }

    const snoozeUntil = h.snoozedUntil?.slice(0, 10);
    const snoozeFrom = h.snoozedFrom?.slice(0, 10);
    if (snoozeUntil && snoozeFrom && dateStr === snoozeUntil) {
        return h.completionHistory?.includes(snoozeFrom) ?? false;
    }
    return false;
}

function countWeekCompletions(h: Habit, weekSet: Set<string>): number {
    const history = h.completionHistory ?? [];
    let hits = history.filter(d => weekSet.has(d)).length;
    // keepUntil: the latest completion is recorded on its cycle start, which can
    // predate this week even when the habit was actually finished this week —
    // lastCompletedDate holds the real completion day
    if (h.keepUntil && h.lastCompletedDate && weekSet.has(h.lastCompletedDate)) {
        const latest = [...history].sort().at(-1);
        if (latest && !weekSet.has(latest)) hits += 1;
    }
    return hits;
}

function WeekGrid({ pathName, habits, color, week, todayStr, now, resetHour, resetMin }: WeekGridProps) {
    const pathHabits = habits.filter(h => h.path === pathName && h.frequency !== 'Weekly Goal');

    return (
        <View style={grid.row}>
            {week.map(({ date, str, label, isFuture }) => {
                const isToday = str === todayStr;

                const scheduledHabits = pathHabits.filter(h =>
                    isHabitActiveToday(h, date, resetHour, resetMin)
                );

                // separate regular and increment habits for layered rendering
                const regularHabits = scheduledHabits.filter(h => !h.increment);
                const incrementHabits = scheduledHabits.filter(h => h.increment);

                const regularDone = regularHabits.filter(h =>
                    isHabitCompletedForDate(h, str, date, resetHour, resetMin)
                ).length;
                const regularSkipped = regularHabits.filter(h =>
                    h.skippedDates?.includes(str)
                ).length;
                const emptyCount = regularHabits.length - regularDone - regularSkipped;
                const total = scheduledHabits.length;
                const done = scheduledHabits.filter(h => isHabitCompletedForDate(h, str, date, resetHour, resetMin)).length;

                const pillOpacity = isFuture ? { opacity: .75 } : {};

                const allDone = total > 0 && done === total;

                return (
                    <View key={str} style={[
                        grid.col,
                        isToday && grid.todayCol,
                        allDone && !isFuture && { backgroundColor: color + '12', borderRadius: 8 },
                    ]}>
                        {/* pill stack: empty → skipped → increment → filled */}
                        <View style={grid.pills}>
                            {total === 0 ? (
                                <View style={[
                                    grid.dot,
                                    isToday && { backgroundColor: color + '30' },
                                    isFuture && { opacity: 0.3 },
                                ]} />
                            ) : (
                                <>
                                    {/* empty pills */}
                                    {Array.from({ length: emptyCount }, (_, i) => (
                                        <View
                                            key={`empty-${i}`}
                                            style={[
                                                grid.pill,
                                                {
                                                    backgroundColor: 'transparent',
                                                    borderColor: isToday ? color + 'cc' : color + '55',
                                                },
                                                isToday && { borderWidth: 1.5 },
                                                pillOpacity,
                                            ]}
                                        />
                                    ))}

                                    {/* skipped pills */}
                                    {Array.from({ length: regularSkipped }, (_, i) => (
                                        <SkippedPill key={`skip-${i}`} opacity={pillOpacity} />
                                    ))}

                                    {/* increment pills */}
                                    {incrementHabits.map((h, i) => {
                                        const effectiveDate = h.keepUntil
                                            ? getHabitCycleStart(h, date, resetHour, resetMin)
                                            : str;
                                        const amount = h.incrementHistory?.[effectiveDate] ?? 0;
                                        const goal = h.incrementGoal && h.incrementGoal > 0
                                            ? h.incrementGoal : 0;
                                        const ratio = goal > 0 ? Math.min(amount / goal, 1) : 0;
                                        const isDone = goal > 0
                                            ? ratio >= 1
                                            : isHabitCompletedForDate(h, str, date, resetHour, resetMin);

                                        return (
                                            <View key={`inc-${i}`} style={grid.pillWrap}>
                                                <View style={[
                                                    grid.pill,
                                                    {
                                                        borderColor: isToday ? color + 'cc' : color + '66',
                                                        overflow: 'hidden',
                                                    },
                                                    isDone && { borderColor: color },
                                                    pillOpacity,
                                                ]}>
                                                    {(ratio > 0 || isDone) && (
                                                        <View style={{
                                                            position: 'absolute',
                                                            left: 0, top: 0, bottom: 0,
                                                            width: isDone ? '100%' : `${Math.round(ratio * 100)}%`,
                                                            backgroundColor: color + (isDone ? 'ff' : '88'),
                                                        }} />
                                                    )}
                                                </View>
                                                {goal === 0 && amount > 0 && (
                                                    <Text style={[grid.badge, { color }]}>
                                                        {amount > 99 ? '99+' : amount}
                                                    </Text>
                                                )}
                                            </View>
                                        );
                                    })}

                                    {/* completed pills */}
                                    {Array.from({ length: regularDone }, (_, i) => (
                                        <View
                                            key={`filled-${i}`}
                                            style={[
                                                grid.pill,
                                                { backgroundColor: color, borderColor: color },
                                                pillOpacity,
                                            ]}
                                        />
                                    ))}
                                </>
                            )}
                        </View>

                        <Text style={[
                            grid.dayLabel,
                            isToday && { color, fontFamily: 'p2', opacity: 1 },
                            isFuture && { opacity: 0.25 },
                        ]}>
                            {label}
                        </Text>

                    </View>
                );
            })}
        </View>
    );
}

const grid = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 4,
    },
    col: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 3,
        paddingVertical: 6,
        borderRadius: 8,
    },
    todayCol: {
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    dayLabel: {
        fontFamily: 'label',
        fontSize: 10,
        opacity: 0.4,
    },
    pills: {
        gap: 2,
        alignItems: 'center',
    },
    pill: {
        width: 14,
        height: 6,
        borderRadius: 3,
        borderWidth: 1.5,
    },
    pillWrap: {
        alignItems: 'center',
    },
    badge: {
        fontSize: 7,
        fontFamily: 'p2',
        lineHeight: 9,
        marginTop: 1,
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(0,0,0,0.08)',
        marginTop: 2,
    },
});

// path card

interface PathCardProps {
    path: Path;
    habits: Habit[];
    onPress: () => void;
    week: ReturnType<typeof buildWeek>;
    todayStr: string;
    now: Date;
    resetHour: number;
    resetMin: number;
}

function PathCard({ path, habits, onPress, week, todayStr, now, resetHour, resetMin }: PathCardProps) {
    const colorHex = PATH_COLORS[path.color as PathColorKey] ?? '#999';

    const pathHabits = habits.filter(h => h.path === path.name);

    const todayScheduled = pathHabits.filter(h =>
        isHabitActiveToday(h, now, resetHour, resetMin)
    );
    const todayDone = todayScheduled.filter(h =>
        isHabitCompletedForDate(h, todayStr, now, resetHour, resetMin)
    );

    const weekSet = new Set(week.map(w => w.str)); // last 7 day strings

    // completions this week
    const weekCompleted = pathHabits.reduce(
        (sum, h) => sum + countWeekCompletions(h, weekSet),
        0
    );

    const statusText =
        todayScheduled.length === 0
            ? `${weekCompleted}  ·  Nothing today`
            : todayDone.length === todayScheduled.length
                ? `${weekCompleted}  ·  All done ✓`
                : `${weekCompleted}  ·  ${todayDone.length}/${todayScheduled.length} today`;

    return (
        <Pressable onPress={onPress}>
            <ShadowBox
                contentBorderRadius={25}
                shadowColor={colorHex}
                shadowBorderRadius={30}
                shadowOffset={{ x: 0, y: 5 }}
                style={{ marginBottom: 18 }}
            >
                <View style={styles.card}>

                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <Text style={globalStyles.h4} numberOfLines={1}>
                                {path.name}
                            </Text>

                            <View style={[uiStyles.badge]}>
                                <Image
                                    source={SYSTEM_ICONS.star}
                                    style={[uiStyles.badgeIcon, { tintColor: COLORS.Star }]}
                                />
                                <Text style={uiStyles.badgeText}>{statusText}</Text>
                            </View>
                        </View>

                        {/* week grid */}
                        <WeekGrid
                            pathName={path.name}
                            habits={habits}
                            color={colorHex}
                            week={week}
                            todayStr={todayStr}
                            now={now}
                            resetHour={resetHour}
                            resetMin={resetMin}
                        />
                    </View>
                </View>
            </ShadowBox>
        </Pressable>
    );
}

// daily summary

function DailySummary({
    habits,
    now,
    todayStr,
    resetHour,
    resetMin,
}: {
    habits: Habit[];
    now: Date;
    todayStr: string;
    resetHour: number;
    resetMin: number;
}) {
    // today's progress
    const totalToday = habits.filter(
        h => h.path && isHabitActiveToday(h, now, resetHour, resetMin)
    ).length;

    const doneToday = habits.filter(
        h =>
            h.path &&
            isHabitActiveToday(h, now, resetHour, resetMin) &&
            isHabitCompletedForDate(h, todayStr, now, resetHour, resetMin)
    ).length;

    const progressPercentage =
        totalToday > 0 ? Math.min((doneToday / totalToday) * 100, 100) : 0;

    const pctRounded = Math.round(progressPercentage);

    // week progress
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        return {
            date: d,
            str: getHabitDate(d, resetHour, resetMin),
        };
    });

    // total scheduled this week
    const totalWeekOccurrences = habits.reduce((sum, h) => {
        if (!h.path) return sum;
        return (
            sum +
            weekDays.filter(({ date }) => isHabitActiveToday(h, date, resetHour, resetMin)).length
        );
    }, 0);

    // completed this week
    const weekDaySet = new Set(weekDays.map(w => w.str));
    const doneWeekOccurrences = habits.reduce((sum, h) => {
        if (!h.path) return sum;
        return sum + countWeekCompletions(h, weekDaySet);
    }, 0);

    const fillColor = pctRounded === 100 ? PAGE.habits.primary[0] : PAGE.path.primary[1];

    return (
        <View style={summaryStyles.wrap}>
            {totalWeekOccurrences > 0 && (
                <View style={{
                    alignSelf: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#000',
                    backgroundColor: PAGE.path.primary[1],
                }}>
                    <Text style={[globalStyles.body2, { fontSize: 13 }]}>
                        {doneWeekOccurrences}/{totalWeekOccurrences} done this week
                    </Text>
                </View>
            )}
        </View>
    );
}

// paths list page

export default function Paths() {
    const { user } = useAuth();
    const router = useRouter();
    // drawer access shows a back button; otherwise the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    const today = useMemo(() => new Date(), []);
    const { habits: allHabitsRaw, allHabits: allHabitsUnfiltered, loading: habitsLoading, loadHabits, resetTime } = useHabits(today);
    const resetHour = resetTime.hour;
    const resetMin = resetTime.minute;

    // filtered for today vs unfiltered for the week grid
    const habits: Habit[] = allHabitsRaw.map(({ status, ...rest }) => rest);
    const weekHabits: Habit[] = allHabitsUnfiltered;

    const [paths, setPaths] = useState<Path[]>([]);
    const [pathsLoading, setPathsLoading] = useState(true);
    const [showNewPath, setShowNewPath] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const scrollableRef = useAnimatedRef<Animated.ScrollView>();

    const hasLoadedOnce = useRef(false);

    const loadPaths = useCallback(async () => {
        if (!user) return;
        try {
            const { data: pathsData, error } = await supabase
                .from('paths')
                .select('*')
                .eq('user_id', user.id)
                .order('sort_order', { ascending: true, nullsFirst: false })
                .order('created_date', { ascending: true });

            if (error) throw error;
            setPaths(pathsData ?? []);
        } catch (err) {
            console.error('Error loading paths:', err);
        } finally {
            setPathsLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadPaths();
            loadHabits();
        }, [loadPaths, loadHabits])
    );

    // only show spinner on first load
    const loading = !hasLoadedOnce.current && (pathsLoading || habitsLoading);
    if (!loading && !hasLoadedOnce.current) {
        hasLoadedOnce.current = true;
    }

    const handlePathCreated = (pathId: string) => {
        loadPaths();
        loadHabits();
        router.push(`/(tabs)/paths/${pathId}`);
    };

    const activePaths = useMemo(() =>
        paths.filter(p => !p.paused && !p.archived_at),
        [paths]
    );

    const inactivePaths = useMemo(() =>
        paths.filter(p => p.paused || p.archived_at),
        [paths]
    );

    const handleDragEnd = useCallback(async (params: { data: Path[] }) => {
        const newOrder = params.data;
        setPaths(prev => {
            const inactive = prev.filter(p => p.paused || p.archived_at);
            return [...newOrder.map((p, i) => ({ ...p, sort_order: i })), ...inactive];
        });

        const updates = newOrder.map((p, i) =>
            supabase.from('paths').update({ sort_order: i }).eq('id', p.id)
        );
        await Promise.all(updates);
    }, []);

    // current date values used for display
    const now = new Date();
    const todayStr = getHabitDate(now, resetHour, resetMin);
    const week = buildWeek(now, resetHour, resetMin);

    return (
        <AppLinearGradient variant="path.background">
            <PageContainer showBottomNav={!fromDrawer}>
                <PageHeader title="Paths" showBackButton={fromDrawer} />

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.path.primary[0]} />
                    </View>
                ) : paths.length === 0 ? (
                    <EmptyStateView
                        icon={SYSTEM_ICONS.path}
                        title="No paths yet"
                        description="Paths group your habits into a bigger goal — like a theme or chapter of your life you're actively working on."
                        buttonText="Create a path"
                        buttonAction={() => setShowNewPath(true)}
                        buttonColor={PAGE.path.primary[0]}
                    />
                ) : (
                    <Sortable.PortalProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                    <Animated.ScrollView
                        ref={scrollableRef}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 40 }}
                    >
                        <DailySummary
                            habits={weekHabits}
                            now={now}
                            todayStr={todayStr}
                            resetHour={resetHour}
                            resetMin={resetMin}
                        />
                        <Sortable.Grid
                            data={activePaths}
                            columns={1}
                            customHandle
                            renderItem={({ item: path }) => (
                                <Sortable.Handle>
                                    <PathCard
                                        path={path}
                                        habits={weekHabits}
                                        week={week}
                                        todayStr={todayStr}
                                        now={now}
                                        resetHour={resetHour}
                                        resetMin={resetMin}
                                        onPress={() => router.push(`/(tabs)/paths/${path.id}`)}
                                    />
                                </Sortable.Handle>
                            )}
                            keyExtractor={(path) => path.id}
                            onDragEnd={handleDragEnd}
                            scrollableRef={scrollableRef}
                            dragActivationDelay={200}
                            activeItemScale={1.02}
                            activeItemShadowOpacity={0.15}
                            activeItemOpacity={1}
                            inactiveItemOpacity={1}
                            inactiveItemScale={1}
                            onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                            overDrag="vertical"
                            reorderTriggerOrigin="touch"
                            itemEntering={null}
                            itemExiting={null}
                            itemsLayoutTransitionMode="reorder"
                        />

                        {/* paused & archived section */}
                        {inactivePaths.length > 0 && (
                            <View style={{ marginTop: 20 }}>
                                <Pressable onPress={() => setShowInactive(!showInactive)}>
                                    <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.4, fontSize: 12 }]}>
                                        {showInactive ? 'Hide' : 'Show'} Paused & Archived ({inactivePaths.length})
                                    </Text>
                                </Pressable>

                                {showInactive && (
                                    <View style={{ marginTop: 12, opacity: 0.6 }}>
                                        {inactivePaths.map(path => (
                                            <PathCard
                                                key={path.id}
                                                path={path}
                                                habits={weekHabits}
                                                week={week}
                                                todayStr={todayStr}
                                                now={now}
                                                resetHour={resetHour}
                                                resetMin={resetMin}
                                                onPress={() => router.push(`/(tabs)/paths/${path.id}`)}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}
                    </Animated.ScrollView>
                    </GestureHandlerRootView>
                    </Sortable.PortalProvider>
                )}

                {/* floating buttons */}
                <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>

                        <Pressable onPress={() => setShowNewPath(true)}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.habits.button[0]}
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

                <NewPathModal visible={showNewPath} onClose={() => setShowNewPath(false)} onCreated={handlePathCreated} />
            </PageContainer>
        </AppLinearGradient>
    );
}

// styles

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 25,
        overflow: 'hidden',
        minHeight: 90,
    },
    cardContent: {
        flex: 1,
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
});

const summaryStyles = StyleSheet.create({
    wrap: {
        marginBottom: 18,
        gap: 6,
    },
});