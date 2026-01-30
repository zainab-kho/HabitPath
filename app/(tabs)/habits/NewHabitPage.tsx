// @/app/(tabs)/habits/NewHabitPage.tsx
import { useRouter } from 'expo-router';
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

import { getIconFile } from '@/components/habits/iconUtils';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { FREQUENCIES, REWARD_OPTIONS, TIME_OPTIONS, WEEK_DAYS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import IconPickerModal from '@/modals/IconPickerModal';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { formatDisplayDate, formatLocalDate } from '@/utils/dateUtils';
import { getResetTime } from '@/utils/habitUtils';

type Frequency = typeof FREQUENCIES[number];
type TimeOfDay = typeof TIME_OPTIONS[number];

const ICON_SIZE = 30;

export default function NewHabitPage() {
    const router = useRouter();
    const { user } = useAuth();
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
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // rewards
    const [rewardPoints, setRewardPoints] = useState<number>(1);
    const [showRewardsPicker, setShowRewardsPicker] = useState(false);

    // more options
    const [moreOptions, setMoreOptions] = useState(false);
    const [keepUntil, setKeepUntil] = useState(false);
    const [increment, setIncrement] = useState(false);
    const [incrementAmount, setIncrementAmount] = useState(0);
    const [incrementGoal, setIncrementGoal] = useState(0);
    const [incrementType, setIncrementType] = useState<Habit['incrementType']>('None');

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

        // auto-select today's day for Weekly
        if (freq === 'Weekly') {
            const dayIndex = startDate.getDay();
            setSelectedDays([WEEK_DAYS[dayIndex]]);
        } else {
            setSelectedDays([]);
        }
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);

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

            const newHabit: Habit = {
                id: String(uuid.v4()),
                name: habitName.trim(),
                icon: selectedIcon,
                frequency: selectedFrequency,
                selectedDays: selectedFrequency === 'Weekly' ? selectedDays : [],
                selectedTimeOfDay,
                startDate: habitStartDate,     // pure calendar date
                selectedDate: selectedDateLabel, // display label
                rewardPoints,
                keepUntil,
                increment,
                incrementAmount,
                incrementType,
                // incrementGoal **TODO: add to supabase
            };

            const { error } = await supabase.from('habits').insert([{
                id: newHabit.id,
                user_id: user.id,
                name: newHabit.name,
                icon: newHabit.icon,
                frequency: newHabit.frequency,
                selected_days: newHabit.selectedDays,
                selected_time_of_day: newHabit.selectedTimeOfDay,
                start_date: newHabit.startDate,
                selected_date: newHabit.selectedDate,
                reward_points: newHabit.rewardPoints,
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
                                borderWidth: 2,
                                borderColor: PAGE.habits.border[0],
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
                                            borderWidth: 2,
                                            borderColor: COLORS.Primary,
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
                                                borderBottomWidth: 2,
                                                borderBottomColor: PAGE.habits.border[0],
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
                                        <ShadowBox contentBackgroundColor="#fff">
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 8,
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
                                        <ShadowBox contentBackgroundColor={
                                            rewardPoints === 0 ?
                                                '#fff' :
                                                COLORS.RewardsAccent}
                                        >
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 8,
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

                                    {/* weekly days selector */}
                                    {selectedFrequency === 'Weekly' && (
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
                                                                    paddingVertical: 8,
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
                                                        paddingVertical: 8,
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
                                                            {['None', 'Minutes', 'Miles', 'Sips'].map((type) => (
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

                                                    <View style={{ gap: 30 }}>
                                                        <Text style={globalStyles.label}>INCREMENT AMOUNT</Text>

                                                        <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                                            <ShadowBox
                                                                shadowColor={PAGE.habits.primary[1]}
                                                                style={{

                                                                }}>
                                                                <Pressable
                                                                    onPress={() => setIncrementAmount(prev => Math.max(0, prev - 1))}
                                                                    style={{
                                                                        paddingVertical: 3,
                                                                        paddingHorizontal: 8,
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                    <Text style={globalStyles.body}>-</Text>
                                                                </Pressable>
                                                            </ShadowBox>

                                                            <ShadowBox
                                                                shadowColor={PAGE.habits.primary[1]}>
                                                                <View style={{
                                                                    borderWidth: 2,
                                                                    borderColor: PAGE.habits.primary[0],
                                                                    width: 100,
                                                                    borderRadius: 20,
                                                                    justifyContent: 'center'
                                                                }}>
                                                                    <TextInput
                                                                        style={[globalStyles.body, { textAlign: 'center' }]}
                                                                        keyboardType="numeric"
                                                                        value={incrementAmount.toString()}
                                                                        onChangeText={text => setIncrementAmount(Number(text))}
                                                                        onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                                                                    />
                                                                </View>
                                                            </ShadowBox>

                                                            <ShadowBox
                                                                shadowColor={PAGE.habits.primary[1]}
                                                                style={{

                                                                }}>
                                                                <Pressable
                                                                    onPress={() => setIncrementAmount(prev => prev + 1)}
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

                                                        {/* 
                                                        **TODO: add goal input (option)
                                                        1. 
                                                         */}
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
                                                                    borderWidth: 2,
                                                                    borderColor: PAGE.habits.primary[0],
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
                                            borderRadius={20}
                                        >
                                            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
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
                                                isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Done
                                            }
                                            borderRadius={20}
                                        >
                                            <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                                                <Text style={globalStyles.body}>
                                                    {isSaving ? 'Saving...' : 'Save'}
                                                </Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
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