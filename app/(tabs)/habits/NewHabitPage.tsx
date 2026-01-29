// @/app/(tabs)/habits/NewHabitPage.tsx
import { getIconFile } from '@/components/habits/iconUtils';
import { BUTTON_COLORS, COLORS } from '@/constants/colors';
import { FREQUENCIES, REWARD_OPTIONS, TIME_OPTIONS, WEEK_DAYS } from '@/constants/habits';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { formatLocalDate } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import uuid from 'react-native-uuid';

type Frequency = typeof FREQUENCIES[number];
type TimeOfDay = typeof TIME_OPTIONS[number];

export default function NewHabitPage() {
    const router = useRouter();
    const { user } = useAuth();
    const inputRef = useRef<TextInput>(null);

    // basic info
    const [habitName, setHabitName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('goal');

    // scheduling
    const [selectedFrequency, setSelectedFrequency] = useState<Frequency>('No Repeat');
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<TimeOfDay>('Anytime');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);

    // rewards
    const [rewardPoints, setRewardPoints] = useState<number>(1);
    const [showRewardsPicker, setShowRewardsPicker] = useState(false);

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
        if (!habitName.trim()) {
            Alert.alert('Missing Info', 'Please enter a habit name');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to save habits');
            return;
        }

        setIsSaving(true);

        try {
            const newHabit: Habit = {
                id: uuid.v4() as string,
                name: habitName.trim(),
                icon: selectedIcon,
                frequency: selectedFrequency,
                selectedDays: selectedFrequency === 'Weekly' ? selectedDays : [],
                selectedTimeOfDay,
                startDate: formatLocalDate(startDate),
                selectedDate: getDateLabel(startDate),
                rewardPoints,
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
                console.error('Error saving habit:', error);
                Alert.alert('Error', 'Failed to save habit. Please try again.');
            } else {
                router.back();
            }
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error('Error saving habit:', error.message);
                Alert.alert('Error', 'Failed to save habit. Please try again.');
            } else {
                console.error('Error saving habit:', error);
                Alert.alert('Error', 'Failed to save habit. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLinearGradient variant="newHabit.background">
            <PageContainer>
                <PageHeader title="New Habit" showBackButton />

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <ScrollView
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 40 }}
                        >
                            {/* rewards preview at top */}
                            <Pressable
                                onPress={() => setShowRewardsPicker(!showRewardsPicker)}
                                style={{
                                    alignSelf: 'center',
                                    marginBottom: 15,
                                }}
                            >
                                <ShadowBox
                                    contentBackgroundColor={COLORS.RewardsAccent}
                                    contentBorderColor={COLORS.Rewards}
                                    shadowColor={COLORS.Rewards}
                                    shadowBorderColor={COLORS.Rewards}
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 6,
                                        paddingVertical: 6,
                                        paddingHorizontal: 12,
                                    }}>
                                        <Image
                                            source={SYSTEM_ICONS.reward}
                                            style={{ width: 14, height: 14, tintColor: COLORS.Rewards }}
                                        />
                                        <Text style={[globalStyles.label, { fontSize: 12 }]}>
                                            {rewardPoints} pts
                                        </Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            {/* rewards picker */}
                            {showRewardsPicker && (
                                <View style={{
                                    backgroundColor: COLORS.RewardsAccent,
                                    borderRadius: 15,
                                    padding: 12,
                                    marginBottom: 20,
                                    marginHorizontal: 3,
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        justifyContent: 'center',
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
                                                        minWidth: 50,
                                                        alignItems: 'center',
                                                    }}>
                                                        <Text style={[
                                                            globalStyles.label,
                                                            rewardPoints === points && { color: '#fff' }
                                                        ]}>
                                                            {points} pts
                                                        </Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* main card */}
                            <View style={{
                                backgroundColor: '#fff',
                                borderWidth: 1,
                                borderRadius: 20,
                                padding: 20,
                                marginHorizontal: 3,
                                shadowColor: '#000',
                                shadowOffset: { width: 3, height: 3 },
                                shadowOpacity: 1,
                                shadowRadius: 0,
                            }}>
                                {/* icon + name */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 20,
                                }}>
                                    <Pressable
                                        onPress={() => {
                                            // navigate to icon picker
                                            router.push('/habits/ChooseIcon' as any);
                                        }}
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
                                                width: 40,
                                                height: 40,
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
                                                borderBottomColor: COLORS.Primary,
                                                paddingVertical: 8,
                                                fontSize: 16,
                                            }
                                        ]}
                                        placeholder="Enter habit name..."
                                        placeholderTextColor="rgba(0,0,0,0.4)"
                                        value={habitName}
                                        onChangeText={setHabitName}
                                        autoFocus
                                        cursorColor={COLORS.Primary}
                                        selectionColor={COLORS.Primary}
                                    />
                                </View>

                                {/* start date */}
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                    START DATE
                                </Text>
                                <Pressable
                                    onPress={() => setShowCalendar(!showCalendar)}
                                    style={{ marginBottom: 15 }}
                                >
                                    <ShadowBox>
                                        <View style={{
                                            paddingVertical: 7,
                                            paddingHorizontal: 10,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <Text style={globalStyles.body}>
                                                {getDateLabel(startDate)}
                                            </Text>
                                            <Image
                                                source={SYSTEM_ICONS.calendar}
                                                style={{ width: 16, height: 16 }}
                                            />
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {showCalendar && (
                                    <View style={{ marginBottom: 20, marginHorizontal: 0 }}>
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

                                {/* frequency */}
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                    FREQUENCY
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    marginBottom: 15,
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
                                                        globalStyles.body
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
                                        <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                            SELECT DAYS
                                        </Text>
                                        <View style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            gap: 8,
                                            marginBottom: 15,
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
                                                                    globalStyles.body,
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

                                {/* time of day */}
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                    TIME OF DAY
                                </Text>
                                <View style={{
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    gap: 8,
                                    marginBottom: 15,
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
                                                        globalStyles.body
                                                    ]}>
                                                        {time}
                                                    </Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            {/* save button */}
                            <View style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginTop: 30,
                                justifyContent: 'center',
                            }}>
                                <Pressable
                                    onPress={() => router.back()}
                                    style={{ flex: 1, maxWidth: 150 }}
                                >
                                    <ShadowBox
                                        contentBackgroundColor="#f0f0f0"
                                        borderRadius={15}
                                    >
                                        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                            <Text style={globalStyles.body}>Cancel</Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                <Pressable
                                    onPress={handleSave}
                                    disabled={isSaving}
                                    style={{ flex: 1, maxWidth: 150 }}
                                >
                                    <ShadowBox
                                        contentBackgroundColor={
                                            isSaving ? '#ccc' : BUTTON_COLORS.Done
                                        }
                                        borderRadius={15}
                                    >
                                        <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                                            <Text style={globalStyles.body}>
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        </ScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </PageContainer>
        </AppLinearGradient>
    );
}