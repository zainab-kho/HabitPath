// @/app/(tabs)/habits/index.tsx
import HabitsList from '@/components/habits/HabitsList';
import ProgressBar from '@/components/habits/ProgressBar';
import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function HabitsPage() {
    const { user } = useAuth();
    const [viewingDate, setViewingDate] = useState<Date>(getCurrentHabitDay());

    // use the habits hook to get all data
    const {
        habits,
        loading,
        resetTime,
        appStreak,
        totalPoints,
        earnedPoints,
        toggleHabit,
    } = useHabits(viewingDate);

    // night mode detection (for text color)
    const currentHour = new Date().getHours();
    const isNightMode = currentHour >= 21 || currentHour < 5;
    const textColor = isNightMode ? 'white' : 'black';

    // calculate totals for progress bar
    // when loading outside cache window, show 0s until data arrives
    const totalHabits = loading ? 0 : habits.length;
    const completedHabits = loading ? 0 : habits.filter(h => h.completed).length;

    // calculate total possible points for today (all active habits)
    const totalPossiblePoints = loading ? 0 : habits.reduce((sum, h) => sum + (h.rewardPoints || 0), 0);

    // navigate between dates
    const handleNavigateDate = (direction: 'prev' | 'next') => {
        const newDate = navigateDateUtil(viewingDate, direction);
        setViewingDate(newDate);
    };

    // jump to today
    const handleGoToToday = () => {
        setViewingDate(getCurrentHabitDay(resetTime.hour, resetTime.minute));
    };

    // check if viewing today
    const isViewingToday = isToday(viewingDate, resetTime.hour, resetTime.minute);

    return (
        <LinearGradient
            colors={getGradientForTime()}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <PageContainer>
                <PageHeader
                    title="Habits"
                    showPlusButton
                    plusNavigateTo="/(tabs)/more/new-habit"
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
                                tintColor: isViewingToday ? textColor : `${COLORS.Primary}ff`,
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
                                    color: isViewingToday ? textColor : `${COLORS.Primary}ff`,
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
                                tintColor: isViewingToday ? textColor : `${COLORS.Primary}ff`,
                            }}
                        />
                    </Pressable>
                </View>

                {/* progress bar */}
                <ProgressBar
                    totalHabits={totalHabits}
                    completedHabits={completedHabits}
                    earnedPoints={earnedPoints}
                    totalPossiblePoints={totalPossiblePoints}
                    appStreak={appStreak}
                />

                {/* habits list */}
                <HabitsList
                    habits={habits}
                    viewingDate={viewingDate}
                    resetTime={resetTime}
                    onToggleHabit={toggleHabit}
                    loading={loading}
                />

                {/* floating buttons */}
                <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={() => router.push('/journal/NewEntry')}>
                            <ShadowBox contentBackgroundColor={PAGE.journal.border[0]} borderRadius={30}>
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.write} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable>
                            <ShadowBox contentBackgroundColor={PAGE.habits.button[0]} borderRadius={30}>
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 25, textAlign: 'center' }}>+</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                </View>

            </PageContainer>
        </LinearGradient>
    );
}