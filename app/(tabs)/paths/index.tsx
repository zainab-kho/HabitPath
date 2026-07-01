// app/(tabs)/paths/index.tsx
import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { isHabitActiveToday } from '@/utils/habitUtils';
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
import { getHabitDate } from '@/utils/dateUtils';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

// ─── date helpers ─────────────────────────────────────────────────────────────

// Mon through Sun labels
const DAY_LABELS_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * Build current Mon→Sun week, reset-time-aware.
 * Uses getHabitDate so dates before reset time still belong to the previous day.
 * Future days are flagged with isFuture so the grid can fade them.
 */
function buildWeek(now: Date, resetHour: number, resetMin: number) {
    const todayStr = getHabitDate(now, resetHour, resetMin);
    // parse the reset-adjusted "today" at noon to get the correct day-of-week
    const todayDate = new Date(todayStr + 'T12:00:00');
    const dow = todayDate.getDay(); // 0=Sun, 1=Mon…6=Sat
    const daysFromMon = dow === 0 ? 6 : dow - 1;

    return Array.from({ length: 7 }, (_, i) => {
        const offset = i - daysFromMon; // negative=past, 0=today, positive=future
        const d = new Date(now);
        d.setDate(now.getDate() + offset);
        const str = getHabitDate(d, resetHour, resetMin);
        return {
            date: d,
            str,
            label: DAY_LABELS_WEEK[i],
            isFuture: str > todayStr,
        };
    });
}

// ─── skipped pill ─────────────────────────────────────────────────────────────

/* faint gray pill for skipped habits */
function SkippedPill({ opacity }: { opacity?: { opacity: number } | {} }) {
    return (
        <View style={[grid.pill, {
            backgroundColor: 'rgba(0,0,0,0.06)',
            borderColor: 'rgba(0,0,0,0.10)',
        }, opacity]} />
    );
}

// ─── week grid ────────────────────────────────────────────────────────────────

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

function isHabitCompletedForDate(h: Habit, dateStr: string): boolean {
    if (h.completionHistory?.includes(dateStr)) return true;
    const snoozeUntil = h.snoozedUntil?.slice(0, 10);
    const snoozeFrom = h.snoozedFrom?.slice(0, 10);
    if (snoozeUntil && snoozeFrom && dateStr === snoozeUntil) {
        return h.completionHistory?.includes(snoozeFrom) ?? false;
    }
    return false;
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

                // split into regular vs increment so we can layer them correctly
                const regularHabits = scheduledHabits.filter(h => !h.increment);
                const incrementHabits = scheduledHabits.filter(h => h.increment);

                const regularDone = regularHabits.filter(h =>
                    isHabitCompletedForDate(h, str)
                ).length;
                const regularSkipped = regularHabits.filter(h =>
                    h.skippedDates?.includes(str)
                ).length;
                const emptyCount = regularHabits.length - regularDone - regularSkipped;
                const total = scheduledHabits.length;
                const done = scheduledHabits.filter(h => isHabitCompletedForDate(h, str)).length;

                const pillOpacity = isFuture ? { opacity: .75 } : {};

                const allDone = total > 0 && done === total;

                return (
                    <View key={str} style={[
                        grid.col,
                        isToday && grid.todayCol,
                        allDone && !isFuture && { backgroundColor: color + '12', borderRadius: 8 },
                    ]}>
                        {/* pill stack — renders top→bottom: empty | skipped | increment | filled */}
                        <View style={grid.pills}>
                            {total === 0 ? (
                                <View style={[
                                    grid.dot,
                                    isToday && { backgroundColor: color + '30' },
                                    isFuture && { opacity: 0.3 },
                                ]} />
                            ) : (
                                <>
                                    {/* ① empty regular pills — top */}
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

                                    {/* skipped regular pills */}
                                    {Array.from({ length: regularSkipped }, (_, i) => (
                                        <SkippedPill key={`skip-${i}`} opacity={pillOpacity} />
                                    ))}

                                    {/* ② increment pills — sits at the boundary */}
                                    {incrementHabits.map((h, i) => {
                                        const amount = h.incrementHistory?.[str] ?? 0;
                                        const goal = h.incrementGoal && h.incrementGoal > 0
                                            ? h.incrementGoal : 0;
                                        const ratio = goal > 0 ? Math.min(amount / goal, 1) : 0;
                                        const isDone = goal > 0
                                            ? ratio >= 1
                                            : isHabitCompletedForDate(h, str);

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

                                    {/* ③ filled regular pills — bottom */}
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

                        {/* day label */}
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
    emptyRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 4,
        opacity: 0.4,
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
    ghostPill: {
        width: 14,
        height: 6,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.12)',
        borderStyle: 'dashed',
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
    check: {
        fontSize: 8,
        fontFamily: 'p2',
        marginTop: 1,
    },
});

// ─── path card ────────────────────────────────────────────────────────────────

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
    // convert color key -> hex
    const colorHex = PATH_COLORS[path.color as PathColorKey] ?? '#999';

    const pathHabits = habits.filter(h => h.path === path.name);

    const todayScheduled = pathHabits.filter(h =>
        isHabitActiveToday(h, now, resetHour, resetMin)
    );
    const todayDone = todayScheduled.filter(h =>
        h.completionHistory?.includes(todayStr)
    );

    const weekSet = new Set(week.map(w => w.str)); // last 7 day strings

    // total completions across this path in that 7-day window
    const weekCompleted = pathHabits.reduce((sum, h) => {
        const hits = (h.completionHistory ?? []).filter(d => weekSet.has(d)).length;
        return sum + hits;
    }, 0);

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
                    {/* color strip */}

                    <View style={styles.cardContent}>
                        {/* header row */}
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

                        {/* 7-day week grid */}
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

// ─── daily summary ────────────────────────────────────────────────────────────

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
    // ----- today progress (for the bar + message) -----
    const totalToday = habits.filter(
        h => h.path && isHabitActiveToday(h, now, resetHour, resetMin)
    ).length;

    const doneToday = habits.filter(
        h =>
            h.path &&
            isHabitActiveToday(h, now, resetHour, resetMin) &&
            h.completionHistory?.includes(todayStr)
    ).length;

    const progressPercentage =
        totalToday > 0 ? Math.min((doneToday / totalToday) * 100, 100) : 0;

    const pctRounded = Math.round(progressPercentage);

    // ----- week progress (for the subtext) -----
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (6 - i));
        return {
            date: d,
            str: getHabitDate(d, resetHour, resetMin),
        };
    });

    // total scheduled "occurrences" in last 7 days
    const totalWeekOccurrences = habits.reduce((sum, h) => {
        if (!h.path) return sum;
        return (
            sum +
            weekDays.filter(({ date }) => isHabitActiveToday(h, date, resetHour, resetMin)).length
        );
    }, 0);

    // completed "occurrences" in last 7 days
    const doneWeekOccurrences = habits.reduce((sum, h) => {
        if (!h.path) return sum;
        return (
            sum +
            weekDays.filter(({ str }) => h.completionHistory?.includes(str)).length
        );
    }, 0);

    // pick a fill color
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

// ─── main page ────────────────────────────────────────────────────────────────

export default function Paths() {
    const { user } = useAuth();
    const router = useRouter();

    // stable date reference for the hook
    const today = useMemo(() => new Date(), []);
    const { habits: allHabitsRaw, allHabits: allHabitsUnfiltered, loading: habitsLoading, loadHabits, resetTime } = useHabits(today);

    // use the user's actual reset time, falling back to 4am default
    const resetHour = resetTime.hour;
    const resetMin = resetTime.minute;

    // today-filtered habits (for DailySummary)
    const habits: Habit[] = allHabitsRaw.map(({ status, ...rest }) => rest);

    // unfiltered habits for WeekGrid — isHabitActiveToday handles archived visibility per-day
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

    // show spinner only on the very first load, and only until both paths + habits are ready
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

    // "live" date values for display + scheduling logic
    const now = new Date();
    const todayStr = getHabitDate(now, resetHour, resetMin);
    const week = buildWeek(now, resetHour, resetMin);

    return (
        <AppLinearGradient variant="path.background">
            <PageContainer showBottomNav>
                <PageHeader title="Paths" showPlusButton />

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
                <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
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
                                    <Text style={{ fontSize: 20, textAlign: 'center' }}>+</Text>
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

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    summary: {
        marginBottom: 18,
        gap: 8,
    },
    summaryText: {
        fontFamily: 'p1',
        fontSize: 13,
        color: '#444',
        textAlign: 'center',
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderRadius: 25,
        overflow: 'hidden',
        minHeight: 90,
    },
    colorStrip: {
        width: 8,
        alignSelf: 'stretch',
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
    statusText: {
        fontFamily: 'label',
        fontSize: 11,
    },
});

const summaryStyles = StyleSheet.create({
    wrap: {
        marginBottom: 18,
        gap: 6,
    },
    barOuter: {
        justifyContent: 'center',
    },
    bar: {
        height: 30,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#fff',
        position: 'relative',
    },
    fill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
    },
    centerText: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pctText: {
        fontSize: 12,
        fontFamily: 'label',
        color: '#000',
        fontWeight: '600',
    },
    message: {
        fontFamily: 'p1',
        fontSize: 13,
        color: '#444',
        textAlign: 'center',
    },
    sub: {
        fontFamily: 'label',
        fontSize: 11,
        opacity: 0.55,
        textAlign: 'center',
    },
});