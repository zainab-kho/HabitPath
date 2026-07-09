import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { TIME_OPTIONS } from '@/constants/habits';
import { useAuth } from '@/contexts/AuthContext';
import HabitItem from '@/components/habits/HabitItem';
import { HabitWithStatus, useHabits } from '@/hooks/useHabits';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import { Habit } from '@/types/Habit';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { formatDisplayDateString, formatLocalDate, getHabitDate, parseLocalDate } from '@/utils/dateUtils';
import { getGradientForTime } from '@/utils/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function InboxPage() {
  const { user } = useAuth();
  // stable date object — a fresh `new Date()` each render makes useHabits loop
  const [today] = useState(() => new Date());
  const { allHabits, loading, resetTime, unsnoozeToToday, loadHabits } = useHabits(today);

  const todayStr = getHabitDate(today, resetTime.hour, resetTime.minute);

  // schedule modal state
  const [schedulingHabit, setSchedulingHabit] = useState<Habit | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date>(parseLocalDate(todayStr));
  const [scheduleTime, setScheduleTime] = useState<string>('Anytime');
  const [saving, setSaving] = useState(false);

  // inbox: created without a start date, waiting to be scheduled
  const inboxHabits = allHabits.filter(h => !h.startDate && !h.archivedAt);

  // snoozed away from today
  const snoozedHabits = allHabits.filter(h => {
    const from = h.snoozedFrom?.slice(0, 10);
    const until = h.snoozedUntil?.slice(0, 10);
    return from && until && todayStr >= from && todayStr < until;
  });

  const withStatus = (h: Habit): HabitWithStatus => ({ ...h, status: 'active' });

  const openSchedule = (habit: Habit) => {
    setScheduleDate(parseLocalDate(todayStr));
    setScheduleTime(habit.selectedTimeOfDay ?? 'Anytime');
    setSchedulingHabit(habit);
  };

  const handleSaveSchedule = async () => {
    if (!schedulingHabit || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('habits')
        .update({
          start_date: formatLocalDate(scheduleDate),
          selected_time_of_day: scheduleTime,
        })
        .eq('id', schedulingHabit.id)
        .eq('user_id', user.id);
      if (error) throw error;

      setSchedulingHabit(null);
      await loadHabits();
    } catch (err) {
      console.error('Error scheduling habit:', err);
      Alert.alert('Error', 'Failed to schedule habit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDoToday = async (habitId: string) => {
    await unsnoozeToToday(habitId);
  };

  // real habit item — the action button replaces the checkbox
  const renderHabit = (
    habit: Habit,
    actionLabel: string,
    actionColor: string,
    onAction: () => void,
    statusBadge?: string,
  ) => (
    <View key={habit.id} style={{ marginBottom: 12 }}>
      <HabitItem
        habit={withStatus(habit)}
        dateStr={todayStr}
        currentDate={today}
        resetTime={resetTime}
        onToggle={() => {}}
        onPress={onAction}
        statusBadge={statusBadge}
        rightAction={
          <Pressable onPress={onAction}>
            <ShadowBox contentBackgroundColor={actionColor} shadowBorderRadius={20}>
              <View style={{ paddingVertical: 5, paddingHorizontal: 14, alignItems: 'center' }}>
                <Text style={globalStyles.body}>{actionLabel}</Text>
              </View>
            </ShadowBox>
          </Pressable>
        }
      />
    </View>
  );

  return (
    <LinearGradient
      colors={getGradientForTime()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <PageContainer>
        <PageHeader title="Inbox & Snoozed" showBackButton />

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={COLORS.Primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* inbox — habits without a start date */}
            <Text style={styles.sectionLabel}>INBOX</Text>
            {inboxHabits.length === 0 ? (
              <Text style={styles.emptyText}>
                Nothing here! Habits saved with "No date" land in the inbox until you schedule them.
              </Text>
            ) : (
              inboxHabits.map(habit =>
                renderHabit(habit, 'Schedule', PAGE.habits.primary[0], () => openSchedule(habit))
              )
            )}

            {/* snoozed — hidden from today until their snooze day */}
            <Text style={[styles.sectionLabel, { marginTop: 25 }]}>SNOOZED</Text>
            {snoozedHabits.length === 0 ? (
              <Text style={styles.emptyText}>No snoozed habits right now.</Text>
            ) : (
              snoozedHabits.map(habit =>
                renderHabit(
                  habit,
                  'Do today',
                  PAGE.habits.button[0],
                  () => handleDoToday(habit.id),
                  `until ${formatDisplayDateString(habit.snoozedUntil?.slice(0, 10))}`
                )
              )
            )}

          </ScrollView>
        )}

        {/* schedule modal — pick a date + time of day for an inbox habit */}
        <Modal
          visible={!!schedulingHabit}
          transparent
          animationType="none"
          onRequestClose={() => setSchedulingHabit(null)}
        >
          <Pressable style={styles.overlay} onPress={() => setSchedulingHabit(null)}>
            <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

              <View style={{ marginTop: 20 }}>
                <Text style={[globalStyles.h3, { textAlign: 'center' }]}>Schedule Habit</Text>
                <Text style={[globalStyles.label, { textAlign: 'center', marginTop: 4, marginBottom: 16 }]}>
                  {schedulingHabit?.name}
                </Text>
              </View>

              <View style={{ paddingHorizontal: 20, gap: 16 }}>
                <ShadowBox>
                  <SimpleCalendar
                    selectedDate={scheduleDate}
                    onSelectDate={setScheduleDate}
                    selectedDateColor={PAGE.habits.primary[0]}
                  />
                </ShadowBox>

                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>TIME OF DAY</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {TIME_OPTIONS.map((time) => {
                      const isSelected = scheduleTime === time;
                      return (
                        <Pressable key={time} onPress={() => setScheduleTime(time)}>
                          <ShadowBox
                            contentBackgroundColor={isSelected ? COLORS.TimeOfDay : '#fff'}
                            contentBorderColor={isSelected ? '#000' : COLORS.TimeOfDay}
                            shadowBorderColor={isSelected ? '#000' : COLORS.TimeOfDay}
                            shadowColor={isSelected ? '#000' : COLORS.TimeOfDay}
                          >
                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                              <Text style={globalStyles.body1}>{time}</Text>
                            </View>
                          </ShadowBox>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, marginTop: 16 }}>
                <Pressable onPress={() => setSchedulingHabit(null)} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                    </View>
                  </ShadowBox>
                </Pressable>

                <Pressable onPress={saving ? undefined : handleSaveSchedule} style={{ flex: 1, opacity: saving ? 0.5 : 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                        {saving ? 'Saving...' : 'Save'}
                      </Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>

            </Pressable>
          </Pressable>
        </Modal>
      </PageContainer>
      </GestureHandlerRootView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontFamily: 'label',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
    marginBottom: 10,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'label',
    opacity: 0.5,
    marginBottom: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.habits.primary[0],
    maxHeight: '85%',
    width: '90%',
    alignSelf: 'center',
  },
});
