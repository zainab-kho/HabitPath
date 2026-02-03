// @/app/(tabs)/habits/index.tsx
import HabitsList from '@/components/habits/HabitsList';
import { isHabitActiveToday } from '@/components/habits/habitUtils';
import ProgressBar from '@/components/habits/ProgressBar';
import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { STORAGE_KEYS } from '@/storage/keys';
import { globalStyles } from '@/styles';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import {
    formatDateHeader,
    getCurrentHabitDay,
    isToday,
    navigateDate as navigateDateUtil
} from '@/utils/dateUtils';
import { getGradientForTime } from '@/utils/gradients';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function HabitsPage() {
    const { user } = useAuth();

    const atNoon = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);

    const [viewingDate, setViewingDate] = useState<Date>(atNoon(getCurrentHabitDay()));


    // use the habits hook to get all data
    const {
        habits,
        loading,
        resetTime,
        appStreak,
        totalPoints,
        earnedPoints,
        toggleHabit,
        updateIncrement,  // ✅ Added for increment habits
        loadHabits,
    } = useHabits(viewingDate);

    // night mode detection (for text color)
    const currentHour = new Date().getHours();
    const isNightMode = currentHour >= 21 || currentHour < 5;
    const textColor = isNightMode ? 'white' : 'black';

    // filter only active habits for the current viewing date
    const activeHabits = habits.filter(habit =>
        isHabitActiveToday(habit, viewingDate, resetTime.hour, resetTime.minute)
    );

    // calculate totals for progress bar
    // when loading outside cache window, show 0s until data arrives
    const totalHabits = activeHabits.length;
    const completedHabits = activeHabits.filter(h => h.completed).length;
    const totalActivePoints = activeHabits.reduce(
        (sum, h) => sum + (h.rewardPoints || 0),
        0
    );


    // navigate between dates
    const handleNavigateDate = (direction: 'prev' | 'next') => {
        const newDate = navigateDateUtil(viewingDate, direction);
        setViewingDate(atNoon(newDate));
    };

    // jump to today (using resetTime)
    const handleGoToToday = () => {
        const todayHabitDay = getCurrentHabitDay(resetTime.hour, resetTime.minute);
        setViewingDate(atNoon(todayHabitDay));
    };

    // check if viewing today
    const isViewingToday = isToday(viewingDate, resetTime.hour, resetTime.minute);

    // handle pressing a habit to view details
    const handlePressHabit = (habit: any) => {
        // **TODO: Navigate to habit details page
        // router.push(`/habits/${habit.id}`);
    };

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            (async () => {
                const dirty = await AsyncStorage.getItem(STORAGE_KEYS.HABITS_DIRTY);
                if (!cancelled && dirty === '1' && !loading) {
                    await AsyncStorage.removeItem(STORAGE_KEYS.HABITS_DIRTY);
                    loadHabits();

                    console.log('Reloading habits')
                }
            })();

            return () => { cancelled = true; };
        }, [loadHabits])
    );

    return (
        <LinearGradient
            colors={getGradientForTime()}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <PageContainer showBottomNav>
                <PageHeader
                    title="Habits"
                    showPlusButton
                    textColor={textColor}
                />

                {/* date navigator */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                    }}
                >
                    {/* previous day button */}
                    <Pressable
                        onPress={() => handleNavigateDate('prev')}
                        style={{ padding: 5 }}
                    >
                        <Image
                            source={SYSTEM_ICONS.sortLeft}
                            style={{
                                width: 20,
                                height: 20,
                                tintColor: textColor,
                            }}
                        />
                    </Pressable>

                    {/* date display / jump to Today */}
                    <Pressable
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#000',
                            backgroundColor: COLORS.PrimaryLight,
                        }}
                        onPress={handleGoToToday}
                    >
                        <Text
                            style={[
                                globalStyles.body2,
                                {
                                    color: isViewingToday ? textColor : `${COLORS.Secondary}`,
                                    fontSize: 13,
                                },
                            ]}
                        >
                            {formatDateHeader(viewingDate)}
                        </Text>
                    </Pressable>

                    {/* next day button */}
                    <Pressable
                        onPress={() => handleNavigateDate('next')}
                        style={{ padding: 5 }}
                    >
                        <Image
                            source={SYSTEM_ICONS.sortRight}
                            style={{
                                width: 20,
                                height: 20,
                                tintColor: textColor,
                            }}
                        />
                    </Pressable>
                </View>

                {/* progress bar */}
                <ProgressBar
                    totalHabits={totalHabits}
                    completedHabits={completedHabits}
                    earnedPoints={earnedPoints} // keep this if it tracks overall points earned
                    totalPossiblePoints={totalActivePoints}
                    appStreak={appStreak}
                />

                {/* habits list */}
                <HabitsList
                    habits={habits}
                    viewingDate={viewingDate}
                    resetTime={resetTime}
                    onToggleHabit={toggleHabit}
                    onPressHabit={handlePressHabit}  // ✅ Navigate to habit details
                    onIncrementUpdate={updateIncrement}  // ✅ Handle increment updates
                />

                {/* floating buttons */}
                <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={() => router.push('/more/journal/NewEntry')}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.journal.border[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}>
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.write} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={() => router.push('/habits/NewHabitPage')}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.habits.button[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                            >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 20, textAlign: 'center' }}>+</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                </View>


            </PageContainer>
        </LinearGradient>
    );
}