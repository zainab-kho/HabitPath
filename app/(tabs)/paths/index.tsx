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
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';

// ─── date helpers ─────────────────────────────────────────────────────────────

// Mon→Sun labels
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

function WeekGrid({ pathName, habits, color, week, todayStr, now, resetHour, resetMin }: WeekGridProps) {
    const pathHabits = habits.filter(h => h.path === pathName);

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
                    h.completionHistory?.includes(str)
                ).length;
                const emptyCount = regularHabits.length - regularDone;
                const total = scheduledHabits.length;
                const done = scheduledHabits.filter(h => h.completionHistory?.includes(str)).length;

                const pillOpacity = isFuture ? { opacity: 0.35 } : {};

                return (
                    <View key={str} style={[grid.col, isToday && grid.todayCol]}>
                        {/* pill stack — renders top→bottom: empty | increment | filled */}
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

                                    {/* ② increment pills — sits at the boundary */}
                                    {incrementHabits.map((h, i) => {
                                        const amount = h.incrementHistory?.[str] ?? 0;
                                        const goal = h.incrementGoal && h.incrementGoal > 0
                                            ? h.incrementGoal : 0;
                                        const ratio = goal > 0 ? Math.min(amount / goal, 1) : 0;
                                        const isDone = goal > 0
                                            ? ratio >= 1
                                            : h.completionHistory?.includes(str) ?? false;

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

                        {/* ✓ on fully complete days */}
                        {total > 0 && done === total && (
                            <Text style={[grid.check, { color }]}>✓</Text>
                        )}
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
                shadowColor={colorHex}
                shadowBorderRadius={18}
                shadowOffset={{ x: 0, y: 5 }}
                style={{ marginBottom: 14 }}
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
                <View style={[uiStyles.badge, {
                    width: 150,
                    alignSelf: 'center',
                    justifyContent: 'center',
                    backgroundColor: PAGE.path.primary[1],
                    borderColor: PAGE.path.primary[0],
                }]}>
                    <Text style={summaryStyles.sub}>
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
    const { habits: allHabitsRaw, loadHabits, resetTime } = useHabits(today);

    // use the user's actual reset time, falling back to 4am default
    const resetHour = resetTime.hour;
    const resetMin = resetTime.minute;

    // strip computed "completed" field so we match your Habit type usage elsewhere
    const habits: Habit[] = allHabitsRaw.map(({ status, ...rest }) => rest);

    const [paths, setPaths] = useState<Path[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewPath, setShowNewPath] = useState(false);

    // prevents the flash → spinner → reload when swiping back from [id].tsx
    const hasLoadedOnce = useRef(false);

    const loadPaths = useCallback(async (showLoader: boolean = true) => {
        if (!user) return;
        if (showLoader) setLoading(true);
        try {
            const { data: pathsData, error } = await supabase
                .from('paths')
                .select('*')
                .eq('user_id', user.id)
                .order('created_date', { ascending: true });

            if (error) throw error;
            setPaths(pathsData ?? []);
        } catch (err) {
            console.error('Error loading paths:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // refresh when you come back to the tab (keeps completion history in sync)
    // spinner only shows on first mount — subsequent focus events refresh silently
    useFocusEffect(
        useCallback(() => {
            const isFirstLoad = !hasLoadedOnce.current;
            hasLoadedOnce.current = true;

            loadPaths(isFirstLoad);
            loadHabits();
        }, [loadPaths, loadHabits])
    );

    const handlePathCreated = (pathId: string) => {
        loadPaths();
        loadHabits();
        router.push(`/(tabs)/paths/${pathId}`);
    };

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
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                        <DailySummary
                            habits={habits}
                            now={now}
                            todayStr={todayStr}
                            resetHour={resetHour}
                            resetMin={resetMin}
                        />
                        {paths.map(path => (
                            <PathCard
                                key={path.id}
                                path={path}
                                habits={habits}
                                week={week}
                                todayStr={todayStr}
                                now={now}
                                resetHour={resetHour}
                                resetMin={resetMin}
                                onPress={() => router.push(`/(tabs)/paths/${path.id}`)}
                            />
                        ))}
                    </ScrollView>
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
        borderRadius: 18,
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