// @/app/(tabs)/more/goals/index.tsx
// All Goals — every habit in one list, regardless of what day it falls on, with
// filters and sorting so a specific habit is easy to find and edit. Rows are
// read-only; tapping one opens the same detail modal the habits page uses.
//
// Under the "My order" sort the list becomes draggable, grouped by time of day.
// Dragging here is PERMANENT (habits.display_order) — it sets the order every
// day starts from, unlike dragging on the habits page, which only affects that day.
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// gesture-handler scroll + root view so scrolling works inside the filter modal
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedRef } from 'react-native-reanimated';
import Sortable from 'react-native-sortables';

import GoalRow from '@/components/habits/GoalRow';
import HabitSectionHeader from '@/components/habits/HabitSectionHeader';
import { COLORS, PAGE } from '@/constants/colors';
import { TIME_OPTIONS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { savePermanentOrder, savePermanentTimeOfDay } from '@/hooks/useDailyHabitOverrides';
import { HabitWithStatus, useHabits } from '@/hooks/useHabits';
import HabitDetailModal from '@/modals/HabitDetailModal';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { formatDisplayDateString, formatLocalDate, getHabitDate, parseLocalDate } from '@/utils/dateUtils';
import { getNextOccurrence, isHabitActiveToday } from '@/utils/habitUtils';

// frequency buckets as the list offers them — 'Weekly Goal' and one-off habits
// are their own choices here even though they aren't in FREQUENCIES
const FREQUENCY_FILTERS = ['Daily', 'Weekly', 'Monthly', 'Custom', 'Weekly Goal', 'Once'] as const;
type FrequencyFilter = typeof FREQUENCY_FILTERS[number];

const STATUS_FILTERS = ['Scheduled', 'Inbox', 'Snoozed', 'Completed', 'Past', 'Archived'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

// one-time habits, plus keep-until weekly goals, are finished after completion
const isOneTime = (habit: Habit) => !habit.frequency || habit.frequency === 'None';

// finished habits have nothing left to do; completed keep-until weekly goals
// retire after their first completed week instead of recurring indefinitely.
const isFinished = (habit: Habit) =>
    ((isOneTime(habit) || (habit.frequency === 'Weekly Goal' && habit.keepUntil))
        && (habit.completionHistory?.length ?? 0) > 0);

// habits that can never come up again: a one-off that was skipped (dismissed,
// so it won't return), a one-off whose day has passed (a keepUntil one carries
// over, so it's still live), or a repeating habit past its end date. Never
// completed — those are isFinished — just done with.
const isPast = (habit: Habit, todayStr: string) => {
    if (habit.endDate && habit.endDate < todayStr) return true;
    if (isOneTime(habit) && (habit.skippedDates?.length ?? 0) > 0) return true;
    return isOneTime(habit) && !habit.keepUntil && !!habit.startDate && habit.startDate < todayStr;
};

// 'My order' is the permanent arrangement — the only sort you can drag in
const SORTS = ['My order', 'Name', 'Recent', 'Start date', 'Path', 'Points'] as const;
type Sort = typeof SORTS[number];

type TimeOfDay = typeof TIME_OPTIONS[number];

// rows of the draggable list: section headers interleaved with habits
type ListItem =
    | { type: 'header'; id: string; timeOfDay: TimeOfDay; count: number }
    | { type: 'habit'; id: string; habit: Habit };

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

// the permanent order: arranged habits first, in their saved order, then
// everything never arranged, oldest start date first
function byPermanentOrder(a: Habit, b: Habit): number {
    const aOrder = a.displayOrder ?? null;
    const bOrder = b.displayOrder ?? null;
    if (aOrder != null && bOrder != null) return aOrder - bOrder;
    if (aOrder != null) return -1;
    if (bOrder != null) return 1;
    return (a.startDate ?? '').localeCompare(b.startDate ?? '');
}

const NO_PATH = '__none__';

function frequencyBucket(habit: Habit): FrequencyFilter {
    if (habit.frequency === 'Weekly Goal') return 'Weekly Goal';
    if (!habit.frequency || habit.frequency === 'None') return 'Once';
    return habit.frequency as FrequencyFilter;
}

// same chip as the journal's filter sheet
function Chip({ label, selected, color, onPress }: {
    label: string;
    selected: boolean;
    color: string;
    onPress: () => void;
}) {
    return (
        <Pressable onPress={onPress}>
            <View style={[
                styles.filterChip,
                { borderColor: selected ? '#000' : color, backgroundColor: selected ? color : '#fff' },
            ]}>
                <Text style={styles.filterChipText}>{label}</Text>
            </View>
        </Pressable>
    );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <View style={{ gap: 10 }}>
            <Text style={styles.filterLabel}>{title}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>
        </View>
    );
}

export default function AllGoalsPage() {
    // a stable date: useHabits defaults this to a fresh Date on every render, which
    // would make its load effect re-run in a loop. The day only matters here for
    // working out which habits are currently snoozed.
    const [today] = useState(() => new Date());
    const { allHabits, loading, resetTime, loadHabits, deleteHabit, archiveHabit } = useHabits(today);

    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    // inline search — expands from the search button, same as the journal
    const [searchOpen, setSearchOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [paths, setPaths] = useState<string[]>([]);
    const [frequencies, setFrequencies] = useState<FrequencyFilter[]>([]);
    const [timesOfDay, setTimesOfDay] = useState<string[]>([]);
    const [statuses, setStatuses] = useState<StatusFilter[]>([]);
    const [sort, setSort] = useState<Sort>('My order');
    // null = every day; otherwise only habits scheduled on this date
    const [dayFilter, setDayFilter] = useState<string | null>(null);
    const [showDayCalendar, setShowDayCalendar] = useState(false);

    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    const { user } = useAuth();
    const scrollableRef = useAnimatedRef<Animated.ScrollView>();

    const toggleSearch = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSearchOpen(prev => {
            if (prev) setSearch('');
            return !prev;
        });
    }, []);

    const todayStr = getHabitDate(today, resetTime.hour, resetTime.minute);

    // toggles one value in a multi-select filter
    const toggle = <T,>(list: T[], setList: (next: T[]) => void, value: T) => {
        setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
    };

    const toggleStatus = (status: StatusFilter) => {
        if (status === 'Archived') {
            setStatuses(statuses.includes('Archived') ? [] : ['Archived']);
            return;
        }
        const withoutArchived = statuses.filter(value => value !== 'Archived');
        setStatuses(withoutArchived.includes(status)
            ? withoutArchived.filter(value => value !== status)
            : [...withoutArchived, status]);
    };

    // every path currently in use, for the path filter
    const pathOptions = useMemo(() => {
        const names = new Set<string>();
        allHabits.forEach(h => { if (h.path) names.add(h.path); });
        return [...names].sort((a, b) => a.localeCompare(b));
    }, [allHabits]);

    const visible = useMemo(() => {
        const wantsArchived = statuses.includes('Archived');
        const wantsFinished = statuses.includes('Completed');
        const wantsPast = statuses.includes('Past');

        const isSnoozed = (habit: Habit) => {
            const from = habit.snoozedFrom?.slice(0, 10);
            const until = habit.snoozedUntil?.slice(0, 10);
            return !!from && !!until && todayStr >= from && todayStr < until;
        };

        const filtered = allHabits.filter(habit => {
            // archived habits are hidden unless asked for, and are the only thing
            // shown when 'Archived' is the single status picked
            if (habit.archivedAt && !wantsArchived) return false;

            // a done one-off has nothing left to do; recurring habits always stay,
            // however many times they've been completed
            if (isFinished(habit) && !wantsFinished) return false;

            // a one-off from last March, or a habit whose end date has gone by
            if (isPast(habit, todayStr) && !wantsPast) return false;

            if (search.trim() && !habit.name?.toLowerCase().includes(search.trim().toLowerCase())) return false;

            if (paths.length) {
                const key = habit.path ?? NO_PATH;
                if (!paths.includes(key)) return false;
            }

            if (frequencies.length && !frequencies.includes(frequencyBucket(habit))) return false;

            if (timesOfDay.length && !timesOfDay.includes(habit.selectedTimeOfDay ?? 'Anytime')) return false;

            // only habits that actually land on the chosen day
            if (dayFilter && !isHabitActiveToday(habit, parseLocalDate(dayFilter), resetTime.hour, resetTime.minute)) {
                return false;
            }

            if (statuses.length) {
                const matches = statuses.some(status => {
                    if (status === 'Archived') return !!habit.archivedAt;
                    if (status === 'Completed') return isFinished(habit);
                    if (status === 'Past') return isPast(habit, todayStr);
                    if (status === 'Inbox') return !habit.startDate && !habit.archivedAt;
                    if (status === 'Snoozed') return isSnoozed(habit);
                    // Scheduled
                    return !!habit.startDate && !habit.archivedAt && !isSnoozed(habit)
                        && !isFinished(habit) && !isPast(habit, todayStr);
                });
                if (!matches) return false;
            }

            return true;
        });

        const sorted = [...filtered];
        sorted.sort((a, b) => {
            switch (sort) {
                case 'My order':
                    return byPermanentOrder(a, b);
                case 'Recent':
                    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
                case 'Start date':
                    // inbox habits have no start date — park them at the end
                    if (!a.startDate) return b.startDate ? 1 : 0;
                    if (!b.startDate) return -1;
                    return a.startDate.localeCompare(b.startDate);
                case 'Path':
                    if (!a.path) return b.path ? 1 : (a.name || '').localeCompare(b.name || '');
                    if (!b.path) return -1;
                    return a.path.localeCompare(b.path) || (a.name || '').localeCompare(b.name || '');
                case 'Points':
                    return (b.rewardPoints ?? 0) - (a.rewardPoints ?? 0);
                default:
                    return (a.name || '').localeCompare(b.name || '');
            }
        });

        return sorted;
    }, [allHabits, search, paths, frequencies, timesOfDay, statuses, sort, todayStr, dayFilter, resetTime]);

    const pathGroups = useMemo(() => {
        if (sort !== 'Path') return [];

        const groups: { name: string; habits: Habit[] }[] = [];
        visible.forEach(habit => {
            const name = habit.path || 'No path';
            const group = groups[groups.length - 1];
            if (group?.name === name) {
                group.habits.push(habit);
            } else {
                groups.push({ name, habits: [habit] });
            }
        });
        return groups;
    }, [visible, sort]);

    // next scheduled day per habit — walks the calendar forward, so it's worked
    // out once per list change rather than on every row render
    const nextDates = useMemo(() => {
        const map: Record<string, string | null> = {};
        visible.forEach(habit => {
            map[habit.id] = getNextOccurrence(habit, resetTime.hour, resetTime.minute, { from: today, includeToday: false });
        });
        return map;
    }, [visible, resetTime, today]);

    const isDragMode = sort === 'My order';

    // the draggable list: habits grouped under their time-of-day section
    const flatList = useMemo<ListItem[]>(() => {
        if (!isDragMode) return [];

        const grouped: Record<TimeOfDay, Habit[]> = {
            'Wake Up': [], 'Morning': [], 'Anytime': [],
            'Afternoon': [], 'Evening': [], 'Bed Time': [],
        };
        visible.forEach(habit => {
            const section = (habit.selectedTimeOfDay ?? 'Anytime') as TimeOfDay;
            (grouped[section] ?? grouped['Anytime']).push(habit);
        });

        const items: ListItem[] = [];
        TIME_OPTIONS.forEach(time => {
            const inSection = grouped[time];
            if (inSection.length > 0) {
                items.push({ type: 'header', id: `header-${time}`, timeOfDay: time, count: inSection.length });
                inSection.forEach(habit => items.push({ type: 'habit', id: habit.id, habit }));
            }
        });
        return items;
    }, [visible, isDragMode]);

    const firstHeaderId = flatList[0]?.type === 'header' ? flatList[0].id : null;

    const handleDragEnd = useCallback(async (params: { data: ListItem[] }) => {
        if (!user) return;

        // walk the dropped list, tracking which section each habit ended up under
        let section: TimeOfDay = 'Anytime';
        const newVisibleIds: string[] = [];
        const sectionChanges: { habitId: string; newSection: TimeOfDay }[] = [];

        for (const item of params.data) {
            if (item.type === 'header') {
                section = item.timeOfDay;
                continue;
            }
            newVisibleIds.push(item.habit.id);
            if ((item.habit.selectedTimeOfDay ?? 'Anytime') !== section) {
                sectionChanges.push({ habitId: item.habit.id, newSection: section });
            }
        }

        // filters may hide habits, so rebuild the full order: hidden habits keep
        // their slots and the visible ones drop into the slots they already held,
        // in their new order
        const visibleIds = new Set(newVisibleIds);
        const everything = [...allHabits].sort(byPermanentOrder);
        let next = 0;
        const fullOrder = everything.map(habit =>
            visibleIds.has(habit.id) ? newVisibleIds[next++] : habit.id
        );

        try {
            // dragging into another section moves the habit there for good
            await Promise.all(
                sectionChanges.map(change =>
                    savePermanentTimeOfDay(change.habitId, user.id, change.newSection)
                )
            );
            await savePermanentOrder(fullOrder, user.id);
        } catch (err) {
            console.error('Error saving permanent order:', err);
        }

        loadHabits();
    }, [user, allHabits, loadHabits]);

    const activeFilterCount =
        paths.length + frequencies.length + timesOfDay.length + statuses.length + (dayFilter ? 1 : 0);

    const clearFilters = () => {
        setPaths([]);
        setFrequencies([]);
        setTimesOfDay([]);
        setStatuses([]);
        setDayFilter(null);
        setShowDayCalendar(false);
    };

    return (
        <AppLinearGradient variant="newHabit.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="All Goals" showBackButton />

                {/* search / filter / sort row */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 3, marginBottom: 10 }}>
                    {searchOpen ? (
                        <View style={styles.searchBar}>
                            <Image source={SYSTEM_ICONS.search} style={{ width: 15, height: 15, opacity: 0.5 }} />
                            <TextInput
                                style={styles.searchInput}
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search habits..."
                                placeholderTextColor="rgba(0,0,0,0.35)"
                                autoFocus
                                autoCorrect={false}
                                cursorColor={PAGE.habits.border[0]}
                                selectionColor={PAGE.habits.border[0]}
                            />
                            <Pressable onPress={toggleSearch} hitSlop={8}>
                                <Text style={{ fontSize: 15, color: '#888' }}>✕</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {/* sort */}
                            <Pressable onPress={() => setSortOpen(true)}>
                                <ShadowBox
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12 }}>
                                        <Text style={{ fontFamily: 'p1', fontSize: 13 }}>{sort}</Text>
                                        <Image source={SYSTEM_ICONS.sort} style={{ width: 12, height: 12 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            {/* filter */}
                            <Pressable onPress={() => setFilterOpen(true)}>
                                <ShadowBox
                                    contentBorderRadius={30}
                                    shadowBorderRadius={30}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                        <Image source={SYSTEM_ICONS.list} style={{ width: 16, height: 16 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            {/* search */}
                            <Pressable onPress={toggleSearch}>
                                <ShadowBox
                                    contentBorderRadius={30}
                                    shadowBorderRadius={30}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                        <Image source={SYSTEM_ICONS.search} style={{ width: 16, height: 16 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </>
                    )}
                </View>

                {/* the list */}
                {loading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.Secondary} />
                    </View>
                ) : (
                    <>
                        <Text style={[globalStyles.label, { opacity: 0.6, marginBottom: 8 }]}>
                            {visible.length} {visible.length === 1 ? 'HABIT' : 'HABITS'}
                        </Text>

                        {visible.length === 0 ? (
                            <Text style={[globalStyles.body, { textAlign: 'center', marginTop: 30, opacity: 0.6 }]}>
                                {allHabits.length === 0 ? 'No habits yet.' : 'No habits match these filters.'}
                            </Text>
                        ) : isDragMode ? (
                    // permanent arrangement: drag a habit to move it for every day
                    <Sortable.PortalProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                            <AnimatedScrollView
                                ref={scrollableRef}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 60, paddingTop: 5 }}
                            >
                                <Text style={[globalStyles.label, styles.dragHint]}>
                                    Hold and drag to set the order every day starts from
                                </Text>

                                <Sortable.Grid
                                    data={flatList}
                                    columns={1}
                                    customHandle
                                    keyExtractor={(item) => item.id}
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
                                    renderItem={({ item }) => {
                                        if (item.type === 'header') {
                                            const header = (
                                                <HabitSectionHeader title={item.timeOfDay} count={item.count} />
                                            );
                                            // the first header stays put so habits can't be dropped above it
                                            return item.id === firstHeaderId
                                                ? <Sortable.Handle mode="fixed-order">{header}</Sortable.Handle>
                                                : header;
                                        }

                                        return (
                                            <Sortable.Handle>
                                                <GoalRow
                                                    habit={item.habit}
                                                    nextDate={nextDates[item.habit.id]}
                                                    todayStr={todayStr}
                                                    onPress={() => {
                                                        setSelectedHabit(item.habit);
                                                        setModalVisible(true);
                                                    }}
                                                />
                                            </Sortable.Handle>
                                        );
                                    }}
                                />
                            </AnimatedScrollView>
                        </GestureHandlerRootView>
                    </Sortable.PortalProvider>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingTop: 5 }}>
                        {sort === 'Path' ? pathGroups.map(group => (
                            <View key={group.name}>
                                <HabitSectionHeader title={group.name} count={group.habits.length} />
                                {group.habits.map(habit => (
                                    <GoalRow
                                        key={habit.id}
                                        habit={habit}
                                        nextDate={nextDates[habit.id]}
                                        todayStr={todayStr}
                                        onPress={() => {
                                            setSelectedHabit(habit);
                                            setModalVisible(true);
                                        }}
                                    />
                                ))}
                            </View>
                        )) : visible.map(habit => (
                            <GoalRow
                                key={habit.id}
                                habit={habit}
                                nextDate={nextDates[habit.id]}
                                todayStr={todayStr}
                                onPress={() => {
                                    setSelectedHabit(habit);
                                    setModalVisible(true);
                                }}
                            />
                        ))}
                    </ScrollView>
                        )}
                    </>
                )}

                {/* sort sheet */}
                <Modal
                    visible={sortOpen}
                    transparent
                    animationType="none"
                    onRequestClose={() => setSortOpen(false)}
                >
                    <View style={styles.filterOverlay}>
                        <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortOpen(false)} />
                        <View style={styles.filterCard}>
                            <View style={{ marginTop: 20 }}>
                                <Text style={{ fontFamily: 'p2', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
                                    Sort Goals
                                </Text>
                            </View>

                            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 8 }}>
                                {SORTS.map(option => {
                                    const selected = sort === option;
                                    return (
                                        <Pressable
                                            key={option}
                                            onPress={() => {
                                                setSort(option);
                                                setSortOpen(false);
                                            }}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={selected ? PAGE.habits.primary[0] : '#fff'}
                                                contentBorderColor={selected ? '#000' : PAGE.habits.primary[0]}
                                                shadowBorderColor={selected ? '#000' : PAGE.habits.primary[0]}
                                                shadowColor={selected ? '#000' : PAGE.habits.primary[0]}
                                                shadowBorderRadius={12}
                                            >
                                                <View style={{ paddingVertical: 9, paddingHorizontal: 12 }}>
                                                    <Text style={[globalStyles.body1, { textAlign: 'center' }]}>{option}</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* filter sheet — same shape as the journal's */}
                <Modal
                    visible={filterOpen}
                    transparent
                    animationType="none"
                    onRequestClose={() => setFilterOpen(false)}
                >
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <View style={styles.filterOverlay}>
                            {/* backdrop behind the card, so the chips and calendar stay scrollable */}
                            <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterOpen(false)} />

                            <View style={styles.filterCard}>
                                <View style={{ marginTop: 20 }}>
                                    <Text style={{ fontFamily: 'p2', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
                                        Filter Habits
                                    </Text>
                                </View>

                                <GHScrollView
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: 20 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    <FilterGroup title="DAY">
                                        <Chip
                                            label="Any day"
                                            selected={!dayFilter}
                                            color={PAGE.habits.primary[1]}
                                            onPress={() => { setDayFilter(null); setShowDayCalendar(false); }}
                                        />
                                        <Chip
                                            label="Today"
                                            selected={dayFilter === todayStr}
                                            color={PAGE.habits.primary[1]}
                                            onPress={() => { setDayFilter(todayStr); setShowDayCalendar(false); }}
                                        />
                                        <Chip
                                            label={dayFilter && dayFilter !== todayStr
                                                ? formatDisplayDateString(dayFilter)
                                                : 'Pick a date'}
                                            selected={!!dayFilter && dayFilter !== todayStr}
                                            color={PAGE.habits.primary[1]}
                                            onPress={() => setShowDayCalendar(prev => !prev)}
                                        />
                                    </FilterGroup>

                                    {showDayCalendar && (
                                        <ShadowBox>
                                            <SimpleCalendar
                                                selectedDate={dayFilter ? parseLocalDate(dayFilter) : today}
                                                onSelectDate={(date) => {
                                                    setDayFilter(formatLocalDate(date));
                                                    setShowDayCalendar(false);
                                                }}
                                                selectedDateColor={PAGE.habits.primary[0]}
                                            />
                                        </ShadowBox>
                                    )}

                                    {pathOptions.length > 0 && (
                                        <FilterGroup title="PATH">
                                            {pathOptions.map(name => (
                                                <Chip
                                                    key={name}
                                                    label={name}
                                                    selected={paths.includes(name)}
                                                    color={PAGE.habits.primary[0]}
                                                    onPress={() => toggle(paths, setPaths, name)}
                                                />
                                            ))}
                                            <Chip
                                                label="No path"
                                                selected={paths.includes(NO_PATH)}
                                                color={PAGE.habits.primary[0]}
                                                onPress={() => toggle(paths, setPaths, NO_PATH)}
                                            />
                                        </FilterGroup>
                                    )}

                                    <FilterGroup title="FREQUENCY">
                                        {FREQUENCY_FILTERS.map(option => (
                                            <Chip
                                                key={option}
                                                label={option}
                                                selected={frequencies.includes(option)}
                                                color={COLORS.Frequency}
                                                onPress={() => toggle(frequencies, setFrequencies, option)}
                                            />
                                        ))}
                                    </FilterGroup>

                                    <FilterGroup title="TIME OF DAY">
                                        {TIME_OPTIONS.map(option => (
                                            <Chip
                                                key={option}
                                                label={option}
                                                selected={timesOfDay.includes(option)}
                                                color={COLORS.TimeOfDay}
                                                onPress={() => toggle(timesOfDay, setTimesOfDay, option)}
                                            />
                                        ))}
                                    </FilterGroup>

                                    <FilterGroup title="STATUS">
                                        {STATUS_FILTERS.map(option => (
                                            <Chip
                                                key={option}
                                                label={option}
                                                selected={statuses.includes(option)}
                                                color={COLORS.PrimaryLight}
                                                onPress={() => toggleStatus(option)}
                                            />
                                        ))}
                                    </FilterGroup>
                                </GHScrollView>

                                <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, marginTop: 10 }}>
                                    <Pressable onPress={clearFilters} style={{ flex: 1 }}>
                                        <ShadowBox contentBackgroundColor="#f0f0f0" shadowBorderRadius={15}>
                                            <View style={{ paddingVertical: 6 }}>
                                                <Text style={{ fontFamily: 'p2', fontSize: 14, textAlign: 'center' }}>Clear</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>

                                    <Pressable onPress={() => setFilterOpen(false)} style={{ flex: 1 }}>
                                        <ShadowBox contentBackgroundColor={PAGE.habits.border[0]} shadowBorderRadius={15}>
                                            <View style={{ paddingVertical: 6 }}>
                                                <Text style={{ fontFamily: 'p2', fontSize: 14, textAlign: 'center' }}>Done</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </GestureHandlerRootView>
                </Modal>

                <HabitDetailModal
                    visible={modalVisible}
                    // the modal only reads habit fields, never the derived `status`
                    habit={selectedHabit as HabitWithStatus | null}
                    resetHour={resetTime.hour}
                    resetMin={resetTime.minute}
                    onClose={() => setModalVisible(false)}
                    onUpdate={loadHabits}
                    onDelete={deleteHabit}
                    onArchive={archiveHabit}
                />
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    dragHint: {
        opacity: 0.5,
        marginBottom: 10,
        textAlign: 'center',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: PAGE.habits.border[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'p3',
        fontSize: 14,
        color: '#333',
        padding: 0,
    },
    filterOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: PAGE.habits.border[0],
        maxHeight: '80%',
        width: '90%',
        alignSelf: 'center',
    },
    filterLabel: {
        fontFamily: 'label',
        fontSize: 11,
        opacity: 0.6,
        letterSpacing: 0.5,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
    },
    filterChipText: {
        fontFamily: 'p1',
        fontSize: 12,
    },
});
