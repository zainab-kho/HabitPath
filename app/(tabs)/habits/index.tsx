// @/app/(tabs)/habits/index.tsx
import HabitsList from '@/components/habits/HabitsList';
import ProgressBar from '@/components/habits/ProgressBar';
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useHabits } from '@/hooks/useHabits';
import { globalStyles } from '@/styles';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import {
    formatDateHeader,
    getCurrentHabitDay,
    isToday,
    navigateDate as navigateDateUtil
} from '@/utils/dateUtils';
import { getGradientForTime } from '@/utils/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

export default function HabitsPage() {
  const { user } = useAuth();
  const [viewingDate, setViewingDate] = useState<Date>(getCurrentHabitDay());

  // Use the habits hook to get all data
  const {
    habits,
    loading,
    resetTime,
    appStreak,
    totalPoints,
    earnedPoints,
    toggleHabit,
  } = useHabits(viewingDate);

  // Night mode detection (for text color)
  const currentHour = new Date().getHours();
  const isNightMode = currentHour >= 21 || currentHour < 5;
  const textColor = isNightMode ? 'white' : 'black';

  // Calculate totals for progress bar
  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.completed).length;
  
  // Calculate total possible points for today (all active habits)
  const totalPossiblePoints = habits.reduce((sum, h) => sum + (h.rewardPoints || 0), 0);

  // Navigate between dates
  const handleNavigateDate = (direction: 'prev' | 'next') => {
    const newDate = navigateDateUtil(viewingDate, direction);
    setViewingDate(newDate);
  };

  // Jump to today
  const handleGoToToday = () => {
    setViewingDate(getCurrentHabitDay(resetTime.hour, resetTime.minute));
  };

  // Check if viewing today
  const isViewingToday = isToday(viewingDate, resetTime.hour, resetTime.minute);

  if (loading) {
    return (
      <LinearGradient
        colors={getGradientForTime()}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
      >
        <PageContainer>
          <PageHeader title="Habits" textColor={textColor} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={[globalStyles.body, { color: textColor }]}>Loading habits...</Text>
          </View>
        </PageContainer>
      </LinearGradient>
    );
  }

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

        {/* Date Navigator */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          {/* Previous Day Button */}
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

          {/* Date Display / Jump to Today */}
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

          {/* Next Day Button */}
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

        {/* Progress Bar - Only show for today */}
        {isViewingToday && (
          <ProgressBar
            totalHabits={totalHabits}
            completedHabits={completedHabits}
            earnedPoints={earnedPoints}
            totalPossiblePoints={totalPossiblePoints}
            appStreak={appStreak}
          />
        )}

        {/* Habits List */}
        <HabitsList
          habits={habits}
          viewingDate={viewingDate}
          resetTime={resetTime}
          onToggleHabit={toggleHabit}
        />
      </PageContainer>
    </LinearGradient>
  );
}