// @/app/(tabs)/habits/NewHabitPage.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    Switch,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import uuid from 'react-native-uuid';


import { PATH_COLORS, type PathColorKey } from '@/colors/pathColors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/storage/keys';
import { Habit } from '@/types/Habit';
import { formatDisplayDate, formatLocalDate } from '@/utils/dateUtils';
import { getResetTime } from '@/lib/supabase/queries';

import { getIconFile } from '@/components/habits/iconUtils';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { CUSTOM_TYPES, FREQUENCIES, REWARD_OPTIONS, TIME_OPTIONS, WEEK_DAYS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import IconPickerModal from '@/modals/IconPickerModal';
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
    const params = useLocalSearchParams<{ startDate?: string }>();
    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<KeyboardAwareScrollView>(null);

    // basic info
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [habitName, setHabitName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('goal');

    // scheduling
    const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('None');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('Anytime');
    const [startDate, setStartDate] = useState<Date>(() => {
        if (params.startDate) {
            const [y, m, d] = params.startDate.split('-').map(Number);
            return new Date(y, m - 1, d, 12);
        }
        return new Date();
    });
    const [showCalendar, setShowCalendar] = useState(false);

    // custom frequency
    const [customType, setCustomType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [customInterval, setCustomInterval] = useState(2);

    // end date
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showEndDateCalendar, setShowEndDateCalendar] = useState(false);

    // rewards
    const [rewardPoints, setRewardPoints] = useState<number>(1);
    const [showRewardsPicker, setShowRewardsPicker] = useState(false);

    // more options
    const [moreOptions, setMoreOptions] = useState(false);
    const [keepUntil, setKeepUntil] = useState(false);
    const [increment, setIncrement] = useState(false);
    const [incrementStep, setincrementStep] = useState(1);
    const [incrementGoal, setIncrementGoal] = useState(0);
    const [incrementType, setIncrementType] = useState<Habit['incrementType']>('None');
    const [timeGoalHours, setTimeGoalHours] = useState(10);
    const [timeGoalMinutes, setTimeGoalMinutes] = useState(0);

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

    const handleFrequencyChange = (freq: Frequency) => {
        setSelectedFrequency(freq);

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
            const habitStartDate = formatLocalDate(startDate); // e.g., "2026-01-30"

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
            const finalFrequency = incrementType === 'Time' ? 'Daily' : selectedFrequency;
            const finalSelectedDays = incrementType === 'Time'
                ? []
                : (selectedFrequency === 'Weekly' || (selectedFrequency === 'Custom' && customType === 'weekly'))
                    ? selectedDays
                    : [];

            const newHabit: Habit = {
                id: String(uuid.v4()),
                name: habitName.trim(),
                icon: selectedIcon,
                frequency: finalFrequency,
                selectedDays: finalSelectedDays,
                selectedTimeOfDay,
                startDate: habitStartDate,     // pure calendar date
                selectedDate: selectedDateLabel, // display label
                rewardPoints,
                keepUntil,
                increment,
                incrementStep: incrementType === 'Time' ? 1 : incrementStep,
                incrementType,
                incrementGoal: finalIncrementGoal,
                customType: selectedFrequency === 'Custom' ? customType : undefined,
                customInterval: selectedFrequency === 'Custom' ? customInterval : undefined,
                endDate: endDate ? formatLocalDate(endDate) : undefined,
            };

            // Resolve the selected path's name + hex color so the habit
            // shows up immediately in the path detail view (which filters by h.path === path.name)
            const selectedPath = paths.find(p => p.id === selectedPathId) ?? null;
            const pathName = selectedPath?.name ?? null;
            const pathColorHex = selectedPath
                ? (PATH_COLORS[selectedPath.color as PathColorKey] ?? null)
                : null;

            const { error } = await supabase.from('habits').insert([{
                id: newHabit.id,
                user_id: user.id,
                name: newHabit.name,
                icon: newHabit.icon,
                frequency: finalFrequency,
                selected_days: finalSelectedDays,
                selected_time_of_day: newHabit.selectedTimeOfDay,
                start_date: newHabit.startDate,
                selected_date: newHabit.selectedDate,
                reward_points: newHabit.rewardPoints,
                keep_until: newHabit.keepUntil,
                increment: newHabit.increment,
                increment_step: newHabit.incrementStep,
                increment_type: newHabit.incrementType,
                increment_goal: newHabit.incrementGoal,
                path: pathName,
                path_color: pathColorHex,
                path_ids: selectedPathId ? [selectedPathId] : [],
                custom_type: finalFrequency === 'Custom' ? customType : null,
                custom_interval: finalFrequency === 'Custom' ? customInterval : null,
                end_date: endDate ? formatLocalDate(endDate) : null,
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
        <AppLinearGradient variant="newHabit.background">
            <PageContainer>
                <PageHeader title="New Habit" showBackButton />

                {/* **TODO: make sure keyboard works smoothly */}
                <KeyboardAwareScrollView
                    ref={scrollRef}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                    enableOnAndroid={true} // scrolls on Android too
                    extraHeight={120}       // adjust based on your header or bottom spacing
                    keyboardOpeningTime={0} // faster scrolling when keyboard opens
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
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
                                        onPress={() => setShowIconPicker(true)}
                                        style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 25,
                                            borderWidth: 1,
                                            // borderColor: COLORS.Primary,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: COLORS.PrimaryLight,
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
                                        autoFocus
                                        cursorColor={PAGE.habits.border[0]}
                                        selectionColor={PAGE.habits.border[0]}
                                        onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}

                                    />
                                </View>

                                {/* start date */}
                                <View style={{ gap: 10 }}>
                                    <Text style={[globalStyles.label]}>
                                        START DATE
                                    </Text>
                                    <Pressable onPress={() => setShowCalendar(!showCalendar)}>
                                        <ShadowBox
                                            contentBackgroundColor="#fff"
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
                                                    source={SYSTEM_ICONS.calendar}
                                                    style={{ width: 17, height: 17 }}
                                                />
                                                <Text style={globalStyles.body1}>
                                                    {getDateLabel(startDate)}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>

                                    {showCalendar && (
                                        <View style={{ marginVertical: 5 }}>
                                            <ShadowBox>
                                                <SimpleCalendar
                                                    selectedDate={startDate}
                                                    onSelectDate={(date) => {
                                                        setStartDate(date);
                                                        setShowCalendar(false);
                                                    }}
                                                    selectedDateColor={PAGE.habits.primary[0]}
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
                                            gap: 10,
                                        }}>
                                            {REWARD_OPTIONS.map((points) => (
                                                <Pressable
                                                    key={points}
                                                    onPress={() => {
                                                        setRewardPoints(points);
                                                        setShowRewardsPicker(false);
                                                    }}
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
                                                            paddingHorizontal: 10,
                                                            width: 60,
                                                            alignItems: 'center',
                                                        }}>
                                                            <Text style={[
                                                                globalStyles.label,
                                                            ]}>
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
                                        {FREQUENCIES.map((freq) => (
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
                                                        paddingVertical: 7,
                                                        paddingHorizontal: 10,
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

                                    {/* custom frequency sub-type */}
                                    {selectedFrequency === 'Custom' && (
                                        <>
                                            <Text style={globalStyles.label}>REPEAT TYPE</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {CUSTOM_TYPES.map((type) => {
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
                                                                <View style={{ paddingVertical: 7, paddingHorizontal: 10 }}>
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
                                    {(selectedFrequency === 'Weekly' || (selectedFrequency === 'Custom' && customType === 'weekly')) && (
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

                                    {/* end date — for any repeating frequency */}
                                    {selectedFrequency !== 'None' && (
                                        <>
                                            <Text style={globalStyles.label}>END DATE</Text>
                                            <Pressable onPress={() => setShowEndDateCalendar(!showEndDateCalendar)}>
                                                <ShadowBox
                                                    contentBackgroundColor="#fff"
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
                                                            source={SYSTEM_ICONS.calendar}
                                                            style={{ width: 17, height: 17 }}
                                                        />
                                                        <Text style={globalStyles.body1}>
                                                            {getEndDateLabel(endDate)}
                                                        </Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>

                                            {showEndDateCalendar && (
                                                <View style={{ marginVertical: 5, gap: 10 }}>
                                                    {endDate && (
                                                        <Pressable onPress={() => { setEndDate(null); setShowEndDateCalendar(false); }}>
                                                            <ShadowBox
                                                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                                                shadowBorderRadius={15}
                                                            >
                                                                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                                                    <Text style={globalStyles.body1}>Remove end date</Text>
                                                                </View>
                                                            </ShadowBox>
                                                        </Pressable>
                                                    )}
                                                    <ShadowBox>
                                                        <SimpleCalendar
                                                            selectedDate={endDate || startDate}
                                                            onSelectDate={(date) => {
                                                                if (date > startDate) {
                                                                    setEndDate(date);
                                                                    setShowEndDateCalendar(false);
                                                                } else {
                                                                    Alert.alert('Invalid date', 'End date must be after the start date.');
                                                                }
                                                            }}
                                                            selectedDateColor={PAGE.habits.primary[0]}
                                                        />
                                                    </ShadowBox>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </View>

                                <View style={{ gap: 10 }}>
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
                                </View>

                                <View style={{ gap: 10 }}>

                                    {/* paths */}
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
                        </ScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAwareScrollView>
            </PageContainer>

            <IconPickerModal
                visible={showIconPicker}
                selectedIcon={selectedIcon}
                onClose={() => setShowIconPicker(false)}
                onSelectIcon={(iconName) => setSelectedIcon(iconName)}
            />
        </AppLinearGradient >
    );
}