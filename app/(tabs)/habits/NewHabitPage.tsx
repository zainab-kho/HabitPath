// @/app/(tabs)/habits/NewHabitPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Pressable,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import uuid from 'react-native-uuid';


import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/storage/keys';
import { Habit } from '@/types/Habit';
import { formatDisplayDate, formatLocalDate, getHabitDate, getWeekDatesForDate, parseLocalDate } from '@/utils/dateUtils';
import { getResetTime } from '@/lib/supabase/queries';

import { getIconFile } from '@/components/habits/iconUtils';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { CUSTOM_TYPES, FREQUENCIES, REWARD_OPTIONS, TIME_OPTIONS, WEEK_DAYS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';

type Frequency = typeof FREQUENCIES[number];
type TimeOfDay = typeof TIME_OPTIONS[number];

const ICON_SIZE = 30;

export default function NewHabitPage() {
    const router = useRouter();
    const { user } = useAuth();
    const params = useLocalSearchParams<{
        startDate?: string; editId?: string; editData?: string;
        // when creating a habit inside a quest phase:
        questId?: string; phaseId?: string; questScope?: string;
        phaseEndDate?: string; questEndDate?: string;
    }>();
    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<KeyboardAwareScrollView>(null);
    const hasNavigatedAway = useRef(false);

    const isEditMode = !!params.editId;
    // quest mode: this habit is a "goal" inside a quest (shows quest styling, hides paths)
    const isQuestMode = !!params.questId;
    const inPhase = !!params.phaseId;
    const [questScope, setQuestScope] = useState<'phase' | 'carry' | 'forever'>(
        (params.questScope as 'phase' | 'carry' | 'forever') || (params.phaseId ? 'phase' : 'forever')
    );
    const editHabit = React.useMemo(
        () => params.editData ? JSON.parse(params.editData) : null,
        [params.editData]
    ) as Habit | null;

    const habitToday = getHabitDate(new Date());
    const habitTomorrowStr = (() => {
        const d = parseLocalDate(habitToday);
        d.setDate(d.getDate() + 1);
        return formatLocalDate(d);
    })();

    // basic info
    const [habitName, setHabitName] = useState(editHabit?.name ?? '');
    const [selectedIcon, setSelectedIcon] = useState(editHabit?.icon ?? 'goal');

    useEffect(() => {
        if (!isEditMode) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            (async () => {
                const picked = await AsyncStorage.getItem('pickedIcon');
                if (picked) {
                    setSelectedIcon(picked);
                    await AsyncStorage.removeItem('pickedIcon');
                }
            })();
        }, [])
    );

    // scheduling
    const editFreq = editHabit?.frequency;
    const [selectedFrequency, setSelectedFrequency] = useState<Frequency>(() => {
        if (!editFreq || editFreq === 'Weekly Goal') return 'None';
        if (FREQUENCIES.includes(editFreq as Frequency)) return editFreq as Frequency;
        return 'None';
    });
    const [selectedDays, setSelectedDays] = useState<string[]>(editHabit?.selectedDays ?? []);
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>(
        (editHabit?.selectedTimeOfDay as TimeOfDay) ?? 'Anytime'
    );

    const [startDate, setStartDate] = useState<Date>(() => {
        if (editHabit?.startDate) {
            const [y, m, d] = editHabit.startDate.split('-').map(Number);
            return new Date(y, m - 1, d, 12);
        }
        if (params.startDate) {
            const [y, m, d] = params.startDate.split('-').map(Number);
            return new Date(y, m - 1, d, 12);
        }
        return parseLocalDate(habitToday);
    });
    const [showCalendar, setShowCalendar] = useState(() => {
        if (!editHabit) return false;
        if (!editHabit.startDate) return false; // inbox habit — no date picked yet
        if (editFreq === 'Weekly Goal') return true;
        return editHabit.startDate !== habitToday && editHabit.startDate !== habitTomorrowStr;
    });
    // a "Week goal" is a one-off, week-scoped goal (frequency 'Weekly Goal') that does
    // NOT repeat — it ends on the Sunday of its start week. To repeat weekly, use the
    // 'Weekly' frequency instead.
    const [isWeeklyGoal, setIsWeeklyGoal] = useState(editFreq === 'Weekly Goal');

    // inbox habit: created without a start date, lives on the inbox page until scheduled
    const [noStartDate, setNoStartDate] = useState(!!editHabit && !editHabit.startDate);

    const startDateStr = formatLocalDate(startDate);
    const startDateOption: 'today' | 'tomorrow' | 'custom' | 'none' =
        noStartDate ? 'none'
            : startDateStr === habitToday ? 'today'
                : startDateStr === habitTomorrowStr ? 'tomorrow'
                    : 'custom';

    const getCustomDateLabel = (date: Date): string => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    // custom frequency
    const [customType, setCustomType] = useState<'daily' | 'weekly' | 'monthly'>(editHabit?.customType ?? 'daily');
    const [customInterval, setCustomInterval] = useState(editHabit?.customInterval ?? 2);

    // monthly repeat: on the start date's day of month, or the nth weekday (e.g. 1st Sunday)
    const [monthlyMode, setMonthlyMode] = useState<'dayOfMonth' | 'nthWeekday'>(
        editHabit?.monthlyWeek && editHabit?.monthlyWeekday ? 'nthWeekday' : 'dayOfMonth'
    );
    const [monthlyWeek, setMonthlyWeek] = useState<number>(editHabit?.monthlyWeek ?? 1);
    const [monthlyWeekday, setMonthlyWeekday] = useState<string>(editHabit?.monthlyWeekday ?? 'Sunday');
    // the specific day-of-month a monthly habit repeats on — independent of the start date
    const [monthlyDay, setMonthlyDay] = useState<number>(editHabit?.monthlyDay ?? startDate.getDate());
    const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
    // date the monthly calendar highlights (UI only); we read its day / weekday-of-month
    const [monthlyPickDate, setMonthlyPickDate] = useState<Date>(() => {
        if (editHabit?.monthlyDay) {
            const base = new Date();
            const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
            return new Date(base.getFullYear(), base.getMonth(), Math.min(editHabit.monthlyDay, daysInMonth), 12);
        }
        return startDate;
    });

    // which occurrence of a weekday within its month a date falls on (1st..4th, or "last")
    const nthWeekOfDate = (date: Date) => Math.ceil(date.getDate() / 7);
    const nthWeekLabel = (w: number) => (w === 5 ? 'last' : (['', '1st', '2nd', '3rd', '4th'][w] ?? `${w}th`));

    // end date — optional. off by default: a habit with no end date repeats forever at
    // its frequency's cadence (weekly goal → every week, monthly → every month, etc.).
    const [endDate, setEndDate] = useState<Date | null>(() => {
        if (!editHabit?.endDate) return null;
        const [y, m, d] = editHabit.endDate.split('-').map(Number);
        return new Date(y, m - 1, d, 12);
    });
    const [addEndDate, setAddEndDate] = useState<boolean>(!!editHabit?.endDate);
    // whether the end-date calendar is expanded (separate from addEndDate so collapsing
    // it doesn't wipe the chosen end date)
    const [showEndCalendar, setShowEndCalendar] = useState(false);

    // Resolve path selection for edit mode
    React.useEffect(() => {
        if (!editHabit?.path || !user) return;
        supabase
            .from('paths')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', editHabit.path)
            .single()
            .then(({ data: pathData }) => {
                if (pathData) setSelectedPathId(pathData.id);
            });
    }, [editHabit?.path, user]);

    // rewards
    const [rewardPoints, setRewardPoints] = useState<number>(editHabit?.rewardPoints ?? 1);
    const [showRewardsPicker, setShowRewardsPicker] = useState(false);

    // more options
    const [moreOptions, setMoreOptions] = useState(!!(editHabit?.increment || editHabit?.keepUntil));
    const [keepUntil, setKeepUntil] = useState(editHabit?.keepUntil ?? false);
    const [increment, setIncrement] = useState(editHabit?.increment ?? false);
    const [incrementStep, setincrementStep] = useState(editHabit?.incrementStep ?? 1);
    const [incrementGoal, setIncrementGoal] = useState(() => {
        if (editHabit?.incrementType === 'Time') return 0;
        return editHabit?.incrementGoal ?? 0;
    });
    const [incrementType, setIncrementType] = useState<Habit['incrementType']>(editHabit?.incrementType ?? 'None');
    const [timeGoalHours, setTimeGoalHours] = useState(() => {
        if (editHabit?.incrementType === 'Time' && editHabit?.incrementGoal) return Math.floor(editHabit.incrementGoal / 60);
        return 10;
    });
    const [timeGoalMinutes, setTimeGoalMinutes] = useState(() => {
        if (editHabit?.incrementType === 'Time' && editHabit?.incrementGoal) return editHabit.incrementGoal % 60;
        return 0;
    });

    // paths
    interface PathOption { id: string; name: string; color: string; }
    const [paths, setPaths] = useState<PathOption[]>([]);
    const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

    React.useEffect(() => {
        if (!user) return;
        supabase
            .from('paths')
            .select('id, name, color')
            .eq('user_id', user.id)
            .order('name')
            .then(({ data }) => setPaths((data as PathOption[]) ?? []));
    }, [user]);

    // Single-select: tap same path to deselect, tap different path to switch
    const togglePath = (id: string) => {
        setSelectedPathId(prev => prev === id ? null : id);
    };

    // ui state
    const [isSaving, setIsSaving] = useState(false);

    // get date label for display
    const getDateLabel = (date: Date): string => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

        if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
        if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';

        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    // week boundaries respect the user's configured week start day
    const snapToMonday = (date: Date): Date => {
        const start = parseLocalDate(getWeekDatesForDate(formatLocalDate(date))[0]);
        return new Date(start.getFullYear(), start.getMonth(), start.getDate(), 12);
    };

    const getSundayOfWeek = (weekStart: Date): Date => {
        const end = parseLocalDate(getWeekDatesForDate(formatLocalDate(weekStart))[6]);
        return new Date(end.getFullYear(), end.getMonth(), end.getDate(), 12);
    };

    const handleFrequencyChange = (freq: Frequency) => {
        setSelectedFrequency(freq);

        // Monthly opens its "repeats on" calendar right away; keep one calendar open at a time
        if (freq === 'Monthly') {
            setShowCalendar(false);
            setShowEndCalendar(false);
            setShowMonthlyCalendar(true);
        } else {
            setShowMonthlyCalendar(false);
        }

        if (freq === 'Weekly') {
            const dayIndex = startDate.getDay();
            setSelectedDays([WEEK_DAYS[dayIndex]]);
        } else if (freq === 'Custom') {
            setCustomType('daily');
            setCustomInterval(2);
            setSelectedDays([]);
        } else {
            setSelectedDays([]);
        }
    };

    const handleCustomTypeChange = (type: 'daily' | 'weekly' | 'monthly') => {
        setCustomType(type);
        if (type === 'weekly') {
            const dayIndex = startDate.getDay();
            setSelectedDays([WEEK_DAYS[dayIndex]]);
        } else {
            setSelectedDays([]);
        }
    };

    const getEndDateLabel = (date: Date | null): string => {
        if (!date) return 'None';
        return getDateLabel(date);
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        await AsyncStorage.setItem(STORAGE_KEYS.HABITS_DIRTY, '1');


        try {
            if (!user) throw new Error('No user logged in');

            const resetTime = await getResetTime();
            // null = inbox habit, scheduled later from the inbox page
            const habitStartDate = noStartDate ? null : formatLocalDate(startDate);

            const selectedDateLabel = (() => {
                const now = new Date();
                const isLimbo =
                    now.getHours() < resetTime.hour ||
                    (now.getHours() === resetTime.hour && now.getMinutes() < resetTime.minute);

                if (isLimbo) {
                    return formatDisplayDate(startDate); // always calendar date in limbo
                }

                const dateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
                const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const tomorrowOnly = new Date(todayOnly);
                tomorrowOnly.setDate(todayOnly.getDate() + 1);

                if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
                if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';
                return formatDisplayDate(startDate);
            })();

            // For time-tracking habits, convert hours+minutes to total minutes for the goal
            const finalIncrementGoal = incrementType === 'Time'
                ? (timeGoalHours * 60 + timeGoalMinutes)
                : incrementGoal;

            // Time-tracking habits should be Daily frequency so they show every day
            const finalFrequency = incrementType === 'Time' ? 'Daily' : isWeeklyGoal ? 'Weekly Goal' : selectedFrequency;
            const finalSelectedDays = incrementType === 'Time'
                ? []
                : (selectedFrequency === 'Weekly' || (selectedFrequency === 'Custom' && customType === 'weekly'))
                    ? selectedDays
                    : [];

            // Resolve the selected path's name + hex color
            const selectedPath = paths.find(p => p.id === selectedPathId) ?? null;
            const pathName = selectedPath?.name ?? null;
            const pathColorHex = selectedPath
                ? (PATH_COLORS[selectedPath.color as PathColorKey] ?? null)
                : null;

            const habitData = {
                name: habitName.trim(),
                icon: selectedIcon,
                frequency: finalFrequency,
                selected_days: finalSelectedDays,
                selected_time_of_day: selectedTimeOfDay,
                start_date: habitStartDate,
                selected_date: selectedDateLabel,
                reward_points: rewardPoints,
                keep_until: keepUntil,
                increment,
                increment_step: incrementType === 'Time' ? 1 : incrementStep,
                increment_type: incrementType,
                increment_goal: finalIncrementGoal,
                path: pathName,
                path_color: pathColorHex,
                path_ids: selectedPathId ? [selectedPathId] : [],
                custom_type: finalFrequency === 'Custom' ? customType : null,
                custom_interval: finalFrequency === 'Custom' ? customInterval : null,
                monthly_week: finalFrequency === 'Monthly' && monthlyMode === 'nthWeekday' ? monthlyWeek : null,
                monthly_weekday: finalFrequency === 'Monthly' && monthlyMode === 'nthWeekday' ? monthlyWeekday : null,
                monthly_day: finalFrequency === 'Monthly' && monthlyMode === 'dayOfMonth' ? monthlyDay : null,
                // optional end date: null = repeats forever. ignore an end that lands before
                // the start (avoids a habit that can never occur).
                end_date:
                    addEndDate && endDate && formatLocalDate(endDate) >= formatLocalDate(startDate)
                        ? formatLocalDate(endDate)
                        : null,
                // quest linkage — when created from a quest phase, the scope drives the
                // effective end date (overriding the picker above)
                ...(params.questId ? {
                    quest_id: params.questId,
                    phase_id: params.phaseId ?? null,
                    quest_scope: questScope,
                    end_date:
                        questScope === 'forever' ? null :
                            questScope === 'carry' ? (params.questEndDate ?? null) :
                                (params.phaseEndDate ?? null),
                } : {}),
            };

            const { error } = isEditMode
                ? await supabase.from('habits')
                    .update(habitData)
                    .eq('id', params.editId!)
                    .eq('user_id', user.id)
                : await supabase.from('habits').insert([{
                    ...habitData,
                    id: String(uuid.v4()),
                    user_id: user.id,
                    created_at: new Date().toISOString(),
                }]);

            if (error) {
                console.error('❌ Error saving habit:', error);
                Alert.alert('Error', 'Failed to save habit. Please try again.');
            } else {
                console.log('✅ Habit saved successfully!');
                router.back();
            }

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error('❌ Error saving habit:', msg);
            Alert.alert('Error', 'Failed to save habit. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLinearGradient variant={isQuestMode ? "quest.background" : "newHabit.background"}>
            <PageContainer>
                <PageHeader title={isQuestMode ? "New Goal" : (isEditMode ? "Edit Habit" : "New Habit")} showBackButton />

                <KeyboardAwareScrollView
                    ref={scrollRef}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                    enableOnAndroid={true} // scrolls on Android too
                    extraHeight={120}       // adjust based on your header or bottom spacing
                    keyboardOpeningTime={0} // faster scrolling when keyboard opens
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View>
                        {/* main card */}
                        <View style={{
                            backgroundColor: '#fff',
                            borderWidth: 1,
                            // borderColor: PAGE.habits.border[0],
                            borderRadius: 20,
                            padding: 30,
                            gap: 20,
                        }}>
                            {/* icon + name */}
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 15,
                            }}>
                                <Pressable
                                    onPress={() => router.push('/(tabs)/habits/IconPickerPage' as any)}
                                    style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 25,
                                        borderWidth: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: PAGE.habits.primary[1],
                                    }}
                                >
                                    <Image
                                        source={getIconFile(selectedIcon)}
                                        style={{
                                            width: ICON_SIZE,
                                            height: ICON_SIZE,
                                        }}
                                    />
                                </Pressable>

                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        globalStyles.body,
                                        {
                                            flex: 1,
                                            borderBottomWidth: 1,
                                            borderBottomColor: COLORS.PrimaryLight,
                                            paddingVertical: 10,
                                        }
                                    ]}
                                    placeholder="Enter habit name..."
                                    placeholderTextColor="rgba(0,0,0,0.4)"
                                    value={habitName}
                                    onChangeText={setHabitName}
                                    autoFocus={false}
                                    cursorColor={PAGE.habits.border[0]}
                                    selectionColor={PAGE.habits.border[0]}
                                    onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}

                                />
                            </View>

                            {/* start date */}
                            <View style={{ gap: 10 }}>
                                <Text style={[globalStyles.label]}>START DATE</Text>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {(['today', 'tomorrow', 'custom', 'none'] as const).map((option) => {
                                        const isSelected = startDateOption === option;
                                        const label = option === 'today' ? 'Today'
                                            : option === 'tomorrow' ? 'Tomorrow'
                                                : option === 'none' ? 'No date'
                                                    : startDateOption === 'custom' ? getCustomDateLabel(startDate)
                                                        : 'Custom';

                                        return (
                                            <Pressable
                                                key={option}
                                                onPress={() => {
                                                    if (option === 'today') {
                                                        setNoStartDate(false);
                                                        setStartDate(parseLocalDate(habitToday));
                                                        setShowCalendar(false);
                                                        if (isWeeklyGoal) {
                                                            setIsWeeklyGoal(false);
                                                            setEndDate(null);
                                                        }
                                                    } else if (option === 'tomorrow') {
                                                        setNoStartDate(false);
                                                        setStartDate(parseLocalDate(habitTomorrowStr));
                                                        setShowCalendar(false);
                                                        if (isWeeklyGoal) {
                                                            setIsWeeklyGoal(false);
                                                            setEndDate(null);
                                                        }
                                                    } else if (option === 'none') {
                                                        // inbox habit — schedule it later
                                                        setNoStartDate(true);
                                                        setShowCalendar(false);
                                                        if (isWeeklyGoal) {
                                                            setIsWeeklyGoal(false);
                                                            setEndDate(null);
                                                        }
                                                    } else {
                                                        setNoStartDate(false);
                                                        setShowMonthlyCalendar(false);
                                                        setShowEndCalendar(false);
                                                        setShowCalendar(!showCalendar);
                                                    }
                                                }}
                                            >
                                                <ShadowBox
                                                    contentBackgroundColor={isSelected ? PAGE.habits.primary[0] : '#fff'}
                                                    contentBorderColor={isSelected ? '#000' : PAGE.habits.primary[0]}
                                                    shadowBorderColor={isSelected ? '#000' : PAGE.habits.primary[0]}
                                                    shadowColor={isSelected ? '#000' : PAGE.habits.primary[0]}
                                                >
                                                    <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                        <Text style={globalStyles.body1}>{label}</Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                {showCalendar && (
                                    <View style={{ marginVertical: 5, gap: 8 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            paddingVertical: 4,
                                            paddingHorizontal: 2,
                                        }}>
                                            <Text style={globalStyles.body1}>Week goal?</Text>
                                            <Switch
                                                value={isWeeklyGoal}
                                                onValueChange={(val) => {
                                                    setIsWeeklyGoal(val);
                                                    if (val) {
                                                        const monday = snapToMonday(startDate);
                                                        setStartDate(monday);
                                                        // no end date by default → recurs every week. if an end
                                                        // date is set, a week goal ends on a whole week (Sunday).
                                                        if (addEndDate && endDate) setEndDate(getSundayOfWeek(endDate));
                                                        if (selectedFrequency === 'Daily') {
                                                            setSelectedFrequency('None');
                                                        }
                                                        if (customType === 'daily') {
                                                            setCustomType('weekly');
                                                        }
                                                    }
                                                }}
                                                trackColor={{ false: '#ddd', true: PAGE.habits.primary[0] }}
                                                thumbColor="#fff"
                                            />
                                        </View>

                                        <ShadowBox>
                                            <SimpleCalendar
                                                selectedDate={startDate}
                                                onSelectDate={(date) => {
                                                    if (isWeeklyGoal) {
                                                        // picks the START week; the end (if any) is set below
                                                        setStartDate(date);
                                                    } else {
                                                        setStartDate(date);
                                                        setShowCalendar(false);
                                                    }
                                                }}
                                                selectedDateColor={PAGE.habits.primary[0]}
                                                weekSelectMode={isWeeklyGoal}
                                            />
                                        </ShadowBox>
                                    </View>
                                )}
                            </View>

                            {/* rewards */}
                            <View style={{ gap: 10 }}>
                                <Text style={[globalStyles.label]}>
                                    REWARD POINTS
                                </Text>
                                <Pressable onPress={() => setShowRewardsPicker(!showRewardsPicker)}>
                                    <ShadowBox
                                        contentBackgroundColor={
                                            rewardPoints === 0 ?
                                                '#fff' :
                                                COLORS.RewardsAccent}
                                        contentBorderRadius={10}
                                    >
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 10,
                                            paddingVertical: 5,
                                            paddingHorizontal: 15,
                                        }}>
                                            <Image
                                                source={SYSTEM_ICONS.reward}
                                                style={{ width: 17, height: 17, tintColor: COLORS.Rewards }}
                                            />
                                            <Text style={globalStyles.body1}>
                                                {rewardPoints} {rewardPoints === 1 ? 'point' : 'points'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {showRewardsPicker && (
                                    <View style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                    }}>
                                        {REWARD_OPTIONS.map((points) => (
                                            <Pressable
                                                key={points}
                                                onPress={() => {
                                                    setRewardPoints(points);
                                                    setShowRewardsPicker(false);
                                                }}
                                                style={{ width: '22%' }}
                                            >
                                                <ShadowBox
                                                    contentBackgroundColor={
                                                        rewardPoints === points
                                                            ? COLORS.Rewards
                                                            : '#fff'
                                                    }
                                                    contentBorderColor={
                                                        rewardPoints === points
                                                            ? '#000'
                                                            : COLORS.Rewards
                                                    }
                                                    shadowBorderColor={
                                                        rewardPoints === points
                                                            ? '#000'
                                                            : COLORS.Rewards
                                                    }
                                                    shadowColor={
                                                        rewardPoints === points
                                                            ? '#000'
                                                            : COLORS.Rewards
                                                    }
                                                >
                                                    <View style={{
                                                        paddingVertical: 6,
                                                        alignItems: 'center',
                                                    }}>
                                                        <Text style={globalStyles.label} numberOfLines={1}>
                                                            {points} pts
                                                        </Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* scheduling */}
                            <View style={{ gap: 10 }}>
                                {/* frequency */}
                                <Text style={[globalStyles.label]}>
                                    FREQUENCY
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}>
                                    {FREQUENCIES.filter(f => !isWeeklyGoal || f !== 'Daily').map((freq) => (
                                        <Pressable
                                            key={freq}
                                            onPress={() => handleFrequencyChange(freq)}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={
                                                    selectedFrequency === freq
                                                        ? COLORS.Frequency
                                                        : '#fff'
                                                }
                                                contentBorderColor={
                                                    selectedFrequency === freq
                                                        ? '#000'
                                                        : COLORS.Frequency
                                                }
                                                shadowBorderColor={
                                                    selectedFrequency === freq
                                                        ? '#000'
                                                        : COLORS.Frequency
                                                }
                                                shadowColor={
                                                    selectedFrequency === freq
                                                        ? '#000'
                                                        : COLORS.Frequency
                                                }
                                            >
                                                <View style={{
                                                    paddingVertical: 6,
                                                    paddingHorizontal: 12,
                                                }}>
                                                    <Text style={[
                                                        globalStyles.body1
                                                    ]}>
                                                        {freq}
                                                    </Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>

                                {selectedFrequency !== 'None' && (
                                <View style={{
                                    gap: 15,
                                    padding: 15,
                                    backgroundColor: PAGE.habits.primary[0],
                                    borderRadius: 15

                                }}>

                                    {/* monthly repeat: pick one date — repeat on that exact day of the
                                        month, or on the weekday-of-month that date falls on (e.g. 3rd Tue) */}
                                    {selectedFrequency === 'Monthly' && (
                                        <>
                                            <Text style={globalStyles.label}>REPEATS ON</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {([
                                                    { mode: 'dayOfMonth' as const, label: 'Specific date' },
                                                    { mode: 'nthWeekday' as const, label: 'Day of week' },
                                                ]).map(({ mode, label }) => {
                                                    const isSelected = monthlyMode === mode;
                                                    return (
                                                        <Pressable
                                                            key={mode}
                                                            onPress={() => {
                                                                setMonthlyMode(mode);
                                                                if (mode === 'nthWeekday') {
                                                                    // derive the weekday-of-month from the picked date
                                                                    setMonthlyWeekday(WEEK_DAYS[monthlyPickDate.getDay()]);
                                                                    setMonthlyWeek(nthWeekOfDate(monthlyPickDate));
                                                                }
                                                                setShowCalendar(false);
                                                                setShowEndCalendar(false);
                                                                setShowMonthlyCalendar(true);
                                                            }}
                                                        >
                                                            <ShadowBox
                                                                contentBackgroundColor={isSelected ? COLORS.Frequency : '#fff'}
                                                                contentBorderColor={isSelected ? '#000' : COLORS.Frequency}
                                                                shadowBorderColor={isSelected ? '#000' : COLORS.Frequency}
                                                                shadowColor={isSelected ? '#000' : COLORS.Frequency}
                                                            >
                                                                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                                    <Text style={globalStyles.body1}>{label}</Text>
                                                                </View>
                                                            </ShadowBox>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>

                                            {/* current selection — tap to change */}
                                            <Pressable onPress={() => { setShowCalendar(false); setShowEndCalendar(false); setShowMonthlyCalendar(true); }}>
                                                <Text style={globalStyles.body1}>
                                                    {monthlyMode === 'dayOfMonth'
                                                        ? `Every month on day ${monthlyDay}`
                                                        : `Every month on the ${nthWeekLabel(monthlyWeek)} ${monthlyWeekday}`}
                                                </Text>
                                            </Pressable>

                                            {showMonthlyCalendar && (
                                                <ShadowBox>
                                                    <SimpleCalendar
                                                        selectedDate={monthlyPickDate}
                                                        onSelectDate={(date) => {
                                                            setMonthlyPickDate(date);
                                                            if (monthlyMode === 'nthWeekday') {
                                                                setMonthlyWeekday(WEEK_DAYS[date.getDay()]);
                                                                setMonthlyWeek(nthWeekOfDate(date));
                                                            } else {
                                                                setMonthlyDay(date.getDate());
                                                            }
                                                            setShowMonthlyCalendar(false);
                                                        }}
                                                        selectedDateColor={PAGE.habits.primary[0]}
                                                    />
                                                </ShadowBox>
                                            )}
                                        </>
                                    )}

                                    {/* custom frequency sub-type */}
                                    {selectedFrequency === 'Custom' && (
                                        <>
                                            <Text style={globalStyles.label}>REPEAT TYPE</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {CUSTOM_TYPES.filter(t => !isWeeklyGoal || t !== 'Daily').map((type) => {
                                                    const typeValue = type.toLowerCase() as 'daily' | 'weekly' | 'monthly';
                                                    const isSelected = customType === typeValue;
                                                    return (
                                                        <Pressable key={type} onPress={() => handleCustomTypeChange(typeValue)}>
                                                            <ShadowBox
                                                                contentBackgroundColor={isSelected ? COLORS.Frequency : '#fff'}
                                                                contentBorderColor={isSelected ? '#000' : COLORS.Frequency}
                                                                shadowBorderColor={isSelected ? '#000' : COLORS.Frequency}
                                                                shadowColor={isSelected ? '#000' : COLORS.Frequency}
                                                            >
                                                                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                                    <Text style={globalStyles.body1}>{type}</Text>
                                                                </View>
                                                            </ShadowBox>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>

                                            <Text style={globalStyles.label}>
                                                EVERY {customInterval} {customType === 'daily' ? (customInterval === 1 ? 'DAY' : 'DAYS') : customType === 'weekly' ? (customInterval === 1 ? 'WEEK' : 'WEEKS') : (customInterval === 1 ? 'MONTH' : 'MONTHS')}
                                            </Text>
                                            <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                                <ShadowBox shadowColor={COLORS.Frequency}>
                                                    <Pressable
                                                        onPress={() => setCustomInterval(prev => Math.max(1, prev - 1))}
                                                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Text style={globalStyles.body}>-</Text>
                                                    </Pressable>
                                                </ShadowBox>

                                                <ShadowBox shadowColor={COLORS.Frequency}>
                                                    <View style={{
                                                        paddingVertical: 2, width: 100, borderRadius: 20, justifyContent: 'center'
                                                    }}>
                                                        <TextInput
                                                            style={[globalStyles.body, { textAlign: 'center' }]}
                                                            keyboardType="numeric"
                                                            value={customInterval.toString()}
                                                            onChangeText={text => setCustomInterval(Math.max(1, Number(text) || 1))}
                                                            onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                        />
                                                    </View>
                                                </ShadowBox>

                                                <ShadowBox shadowColor={COLORS.Frequency}>
                                                    <Pressable
                                                        onPress={() => setCustomInterval(prev => prev + 1)}
                                                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Text style={globalStyles.body}>+</Text>
                                                    </Pressable>
                                                </ShadowBox>
                                            </View>
                                        </>
                                    )}

                                    {/* weekly days selector — shared between Weekly and Custom Weekly */}
                                    {!isWeeklyGoal && (selectedFrequency === 'Weekly' || (selectedFrequency === 'Custom' && customType === 'weekly')) && (
                                        <>
                                            <Text style={globalStyles.label}>
                                                SELECT DAYS
                                            </Text>
                                            <View style={{
                                                flexDirection: 'row',
                                                flexWrap: 'wrap',
                                                gap: 8,
                                            }}>
                                                {WEEK_DAYS.map((day) => {
                                                    const selected = selectedDays.includes(day);
                                                    const dayAbbrev = day.slice(0, 3);

                                                    return (
                                                        <Pressable
                                                            key={day}
                                                            onPress={() => toggleDay(day)}
                                                            style={{ width: 42 }}
                                                        >
                                                            <ShadowBox
                                                                contentBackgroundColor={
                                                                    selected ? COLORS.Frequency : '#fff'
                                                                }
                                                                contentBorderColor={
                                                                    selected ? '#000' : COLORS.Frequency
                                                                }
                                                                shadowBorderColor={
                                                                    selected ? '#000' : COLORS.Frequency
                                                                }
                                                                shadowColor={
                                                                    selected ? '#000' : COLORS.Frequency
                                                                }
                                                            >
                                                                <View style={{
                                                                    paddingVertical: 5,
                                                                    alignItems: 'center',
                                                                }}>
                                                                    <Text style={[
                                                                        globalStyles.body1,
                                                                        { fontSize: 13 },
                                                                    ]}>
                                                                        {dayAbbrev}
                                                                    </Text>
                                                                </View>
                                                            </ShadowBox>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        </>
                                    )}

                                    {/* optional end date — off = repeats forever at its cadence.
                                        week goals pick a whole week; other habits pick a single day.
                                        always rendered here since the wrapper only shows when a
                                        frequency (not None) is selected. */}
                                    <>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingVertical: 4,
                                                paddingHorizontal: 2,
                                            }}>
                                                <Text style={globalStyles.body1}>Add end date?</Text>
                                                <Switch
                                                    value={addEndDate}
                                                    onValueChange={(val) => {
                                                        setAddEndDate(val);
                                                        if (val) {
                                                            // seed a sensible default when first enabled
                                                            if (!endDate) setEndDate(isWeeklyGoal ? getSundayOfWeek(startDate) : startDate);
                                                            // opening the end-date calendar closes the others
                                                            setShowCalendar(false);
                                                            setShowMonthlyCalendar(false);
                                                            setShowEndCalendar(true);
                                                        } else {
                                                            setShowEndCalendar(false);
                                                        }
                                                    }}
                                                    trackColor={{ false: '#ddd', true: PAGE.habits.border[0] }}
                                                    thumbColor="#fff"
                                                />
                                            </View>

                                            {addEndDate && !showEndCalendar && (
                                                <Pressable onPress={() => {
                                                    setShowCalendar(false);
                                                    setShowMonthlyCalendar(false);
                                                    setShowEndCalendar(true);
                                                }}>
                                                    <Text style={globalStyles.body1}>
                                                        Ends {getCustomDateLabel(endDate ?? startDate)}
                                                    </Text>
                                                </Pressable>
                                            )}

                                            {addEndDate && showEndCalendar && (
                                                <ShadowBox>
                                                    <SimpleCalendar
                                                        selectedDate={endDate ?? startDate}
                                                        onSelectDate={(date) => {
                                                            setEndDate(isWeeklyGoal ? getSundayOfWeek(date) : date);
                                                            setShowEndCalendar(false);
                                                        }}
                                                        selectedDateColor={PAGE.habits.primary[0]}
                                                        weekSelectMode={isWeeklyGoal}
                                                    />
                                                </ShadowBox>
                                            )}
                                        </>
                                </View>
                                )}
                            </View>

                            {!isWeeklyGoal && <View style={{ gap: 10 }}>
                                {/* time of day */}
                                <Text style={[globalStyles.label]}>
                                    TIME OF DAY
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                }}>
                                    {TIME_OPTIONS.map((time) => (
                                        <Pressable
                                            key={time}
                                            onPress={() => setSelectedTimeOfDay(time)}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={
                                                    selectedTimeOfDay === time
                                                        ? COLORS.TimeOfDay
                                                        : '#fff'
                                                }
                                                contentBorderColor={
                                                    selectedTimeOfDay === time
                                                        ? '#000'
                                                        : COLORS.TimeOfDay
                                                }
                                                shadowBorderColor={
                                                    selectedTimeOfDay === time
                                                        ? '#000'
                                                        : COLORS.TimeOfDay
                                                }
                                                shadowColor={
                                                    selectedTimeOfDay === time
                                                        ? '#000'
                                                        : COLORS.TimeOfDay
                                                }
                                            >
                                                <View style={{
                                                    paddingVertical: 5,
                                                    paddingHorizontal: 12,
                                                }}>
                                                    <Text style={[
                                                        globalStyles.body1
                                                    ]}>
                                                        {time}
                                                    </Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>}

                            <View style={{ gap: 10 }}>

                                {/* paths — hidden for quest goals */}
                                {!isQuestMode && (
                                    <>
                                        <Text style={[globalStyles.label]}>
                                            PATHS
                                        </Text>
                                        <View style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                        }}>
                                            {paths.length === 0 ? (
                                                <Text style={[globalStyles.label, { opacity: 0.4 }]}>No paths yet</Text>
                                            ) : (
                                                paths.map((path) => {
                                                    const selected = selectedPathId === path.id;
                                                    const colorHex = PATH_COLORS[path.color as PathColorKey] ?? '#999';
                                                    return (
                                                        <Pressable key={path.id} onPress={() => togglePath(path.id)}>
                                                            <ShadowBox
                                                                contentBackgroundColor={selected ? colorHex : '#fff'}
                                                                contentBorderColor={selected ? '#000' : colorHex}
                                                                shadowBorderColor={selected ? '#000' : colorHex}
                                                                shadowColor={selected ? '#000' : colorHex}
                                                            >
                                                                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                                    <Text style={globalStyles.body1}>{path.name}</Text>
                                                                </View>
                                                            </ShadowBox>
                                                        </Pressable>
                                                    );
                                                })
                                            )}

                                        </View>
                                    </>
                                )}

                                {/* quest goal: what happens to this habit when its phase ends */}
                                {isQuestMode && inPhase && (
                                    <>
                                        <Text style={[globalStyles.label]}>WHEN THIS PHASE ENDS</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {([['phase', 'End with phase'], ['carry', 'Carry forward'], ['forever', 'Keep forever']] as const).map(([val, lbl]) => {
                                                const sel = questScope === val;
                                                return (
                                                    <Pressable key={val} onPress={() => setQuestScope(val)}>
                                                        <ShadowBox
                                                            contentBackgroundColor={sel ? PAGE.quest.primary[0] : '#fff'}
                                                            contentBorderColor={sel ? '#000' : PAGE.quest.primary[0]}
                                                            shadowBorderColor={sel ? '#000' : PAGE.quest.primary[0]}
                                                            shadowColor={sel ? '#000' : PAGE.quest.primary[0]}
                                                        >
                                                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                                <Text style={globalStyles.body1}>{lbl}</Text>
                                                            </View>
                                                        </ShadowBox>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </>
                                )}

                                {/* **TODO: create More options logic */}
                                <Pressable
                                    onPress={() => setMoreOptions(!moreOptions)}
                                    style={{
                                        marginTop: 10,
                                        alignSelf: 'center',
                                        opacity: 0.6,
                                    }}>
                                    <Text style={globalStyles.label}>{moreOptions ? 'Less options' : 'More options'}</Text>
                                </Pressable>

                                {moreOptions && (
                                    <>
                                        <View style={{ gap: 10 }}>
                                            {/* keep until until */}
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 10,
                                            }}>
                                                <Text style={globalStyles.body}>Keep until finished?</Text>
                                                <Switch
                                                    trackColor={{ true: PAGE.habits.primary[1] }}
                                                    value={keepUntil}
                                                    onValueChange={setKeepUntil}
                                                />
                                            </View>

                                            {/* increment tracking toggle */}
                                            <View style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                marginBottom: 10,
                                            }}>
                                                <Text style={globalStyles.body}>Track in increments?</Text>
                                                <Switch
                                                    trackColor={{ true: PAGE.habits.primary[1] }}
                                                    value={increment}
                                                    onValueChange={setIncrement}
                                                />
                                            </View>

                                            {/* increment type & amount (only if increment enabled) */}
                                            {increment && (
                                                <View style={{ gap: 30 }}>
                                                    <View style={{ gap: 10 }}>

                                                        <Text style={globalStyles.label}>INCREMENT TYPE</Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                            {['None', 'Time', 'Minutes', 'Miles', 'Sips'].map((type) => (
                                                                <Pressable key={type} onPress={() => setIncrementType(type as Habit['incrementType'])}>
                                                                    <ShadowBox
                                                                        contentBackgroundColor={incrementType === type ? PAGE.habits.primary[1] : '#fff'}
                                                                        contentBorderColor={incrementType === type ? '#000' : PAGE.habits.primary[1]}
                                                                        shadowBorderColor={incrementType === type ? '#000' : PAGE.habits.primary[1]}
                                                                        shadowColor={incrementType === type ? '#000' : PAGE.habits.primary[1]}
                                                                    >
                                                                        <View style={{ paddingVertical: 6, paddingHorizontal: 10 }}>
                                                                            <Text style={globalStyles.body1}>{type}</Text>
                                                                        </View>
                                                                    </ShadowBox>
                                                                </Pressable>
                                                            ))}
                                                        </View>
                                                    </View>

                                                    {/* Weekly time goal (only for Time type) */}
                                                    {incrementType === 'Time' && (
                                                        <View style={{ gap: 10 }}>
                                                            <Text style={globalStyles.label}>WEEKLY TIME GOAL</Text>
                                                            <Text style={[globalStyles.label, { opacity: 0.5, fontSize: 11 }]}>
                                                                Set the total hours and minutes you want to log each week.
                                                            </Text>

                                                            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 5 }}>
                                                                {/* hours */}
                                                                <View style={{ alignItems: 'center', gap: 6 }}>
                                                                    <Text style={[globalStyles.label, { fontSize: 10 }]}>HOURS</Text>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <Pressable
                                                                                onPress={() => setTimeGoalHours(prev => Math.max(0, prev - 1))}
                                                                                style={{ paddingVertical: 4, paddingHorizontal: 10 }}
                                                                            >
                                                                                <Text style={globalStyles.body}>-</Text>
                                                                            </Pressable>
                                                                        </ShadowBox>

                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <View style={{
                                                                                borderWidth: 2,
                                                                                borderColor: PAGE.habits.primary[0],
                                                                                width: 60,
                                                                                borderRadius: 20,
                                                                                justifyContent: 'center',
                                                                            }}>
                                                                                <TextInput
                                                                                    style={[globalStyles.body, { textAlign: 'center' }]}
                                                                                    keyboardType="numeric"
                                                                                    value={timeGoalHours.toString()}
                                                                                    onChangeText={text => setTimeGoalHours(Number(text) || 0)}
                                                                                    onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                                                />
                                                                            </View>
                                                                        </ShadowBox>

                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <Pressable
                                                                                onPress={() => setTimeGoalHours(prev => prev + 1)}
                                                                                style={{ paddingVertical: 4, paddingHorizontal: 10 }}
                                                                            >
                                                                                <Text style={globalStyles.body}>+</Text>
                                                                            </Pressable>
                                                                        </ShadowBox>
                                                                    </View>
                                                                </View>

                                                                <Text style={[globalStyles.h2, { marginTop: 16 }]}>:</Text>

                                                                {/* minutes */}
                                                                <View style={{ alignItems: 'center', gap: 6 }}>
                                                                    <Text style={[globalStyles.label, { fontSize: 10 }]}>MINUTES</Text>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <Pressable
                                                                                onPress={() => setTimeGoalMinutes(prev => {
                                                                                    const val = prev - 15;
                                                                                    return val < 0 ? 0 : val;
                                                                                })}
                                                                                style={{ paddingVertical: 4, paddingHorizontal: 10 }}
                                                                            >
                                                                                <Text style={globalStyles.body}>-</Text>
                                                                            </Pressable>
                                                                        </ShadowBox>

                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <View style={{
                                                                                borderWidth: 2,
                                                                                borderColor: PAGE.habits.primary[0],
                                                                                width: 60,
                                                                                borderRadius: 20,
                                                                                justifyContent: 'center',
                                                                            }}>
                                                                                <TextInput
                                                                                    style={[globalStyles.body, { textAlign: 'center' }]}
                                                                                    keyboardType="numeric"
                                                                                    value={timeGoalMinutes.toString()}
                                                                                    onChangeText={text => setTimeGoalMinutes(Number(text) || 0)}
                                                                                    onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                                                />
                                                                            </View>
                                                                        </ShadowBox>

                                                                        <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                            <Pressable
                                                                                onPress={() => setTimeGoalMinutes(prev => prev + 15)}
                                                                                style={{ paddingVertical: 4, paddingHorizontal: 10 }}
                                                                            >
                                                                                <Text style={globalStyles.body}>+</Text>
                                                                            </Pressable>
                                                                        </ShadowBox>
                                                                    </View>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    )}

                                                    {incrementType !== 'Time' && (
                                                        <View style={{ gap: 30 }}>
                                                            <View style={{ gap: 30 }}>
                                                                <Text style={globalStyles.label}>INCREMENT AMOUNT</Text>

                                                                <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                                                    <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                        <Pressable
                                                                            onPress={() => setincrementStep(prev => Math.max(0, prev - 1))}
                                                                            style={{
                                                                                paddingVertical: 3,
                                                                                paddingHorizontal: 8,
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                            <Text style={globalStyles.body}>-</Text>
                                                                        </Pressable>
                                                                    </ShadowBox>

                                                                    <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                        <View style={{
                                                                            paddingVertical: 2,
                                                                            width: 100,
                                                                            borderRadius: 20,
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <TextInput
                                                                                style={[globalStyles.body, { textAlign: 'center' }]}
                                                                                keyboardType="numeric"
                                                                                value={incrementStep.toString()}
                                                                                onChangeText={text => setincrementStep(Number(text))}
                                                                                onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                                            />
                                                                        </View>
                                                                    </ShadowBox>

                                                                    <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                                                                        <Pressable
                                                                            onPress={() => setincrementStep(prev => prev + 1)}
                                                                            style={{
                                                                                paddingVertical: 3,
                                                                                paddingHorizontal: 8,
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                            <Text style={globalStyles.body}>+</Text>
                                                                        </Pressable>
                                                                    </ShadowBox>
                                                                </View>
                                                            </View>

                                                            <View style={{ gap: 30 }}>
                                                                <Text style={globalStyles.label}>INCREMENT GOAL (OPTIONAL)</Text>

                                                                <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                                                    <ShadowBox shadowColor={PAGE.habits.primary[0]}>
                                                                        <Pressable
                                                                            onPress={() => setIncrementGoal(prev => Math.max(0, prev - 1))}
                                                                            style={{
                                                                                paddingVertical: 3,
                                                                                paddingHorizontal: 8,
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                            <Text style={globalStyles.body}>-</Text>
                                                                        </Pressable>
                                                                    </ShadowBox>

                                                                    <ShadowBox shadowColor={PAGE.habits.primary[0]}>
                                                                        <View style={{
                                                                            paddingVertical: 2,
                                                                            width: 100,
                                                                            borderRadius: 20,
                                                                            justifyContent: 'center'
                                                                        }}>
                                                                            <TextInput
                                                                                style={[globalStyles.body, { textAlign: 'center' }]}
                                                                                keyboardType="numeric"
                                                                                value={incrementGoal.toString()}
                                                                                onChangeText={text => setIncrementGoal(Number(text))}
                                                                                onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                                            />
                                                                        </View>
                                                                    </ShadowBox>

                                                                    <ShadowBox shadowColor={PAGE.habits.primary[0]}>
                                                                        <Pressable
                                                                            onPress={() => setIncrementGoal(prev => prev + 1)}
                                                                            style={{
                                                                                paddingVertical: 3,
                                                                                paddingHorizontal: 8,
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center'
                                                                            }}>
                                                                            <Text style={globalStyles.body}>+</Text>
                                                                        </Pressable>
                                                                    </ShadowBox>
                                                                </View>
                                                            </View>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </>
                                )}




                                {/* save and cancel button */}
                                <View style={{
                                    flexDirection: 'row',
                                    gap: 10,
                                    marginTop: 30,
                                    justifyContent: 'center',
                                }}>
                                    <Pressable
                                        onPress={() => router.back()}
                                        style={{ flex: 1, maxWidth: 100 }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={BUTTON_COLORS.Cancel}
                                            shadowBorderRadius={20}
                                        >
                                            <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                                <Text style={globalStyles.body}>Cancel</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>

                                    <Pressable
                                        onPress={handleSave}
                                        disabled={isSaving}
                                        style={{ flex: 1, maxWidth: 100 }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={
                                                isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save
                                            }
                                            shadowBorderRadius={20}
                                        >
                                            <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                                <Text style={globalStyles.body}>
                                                    {isSaving ? 'Saving...' : 'Save'}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>
                </KeyboardAwareScrollView>
            </PageContainer>

        </AppLinearGradient >
    );
}