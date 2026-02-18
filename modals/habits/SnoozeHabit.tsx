// @/modals/habits/SnoozeHabit.tsx
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { HabitWithStatus } from '@/hooks/useHabits';
import SimpleCalendar from '@/ui/SimpleCalendar';
import ShadowBox from '@/ui/ShadowBox';
import { formatLocalDate } from '@/utils/dateUtils';
import React, { useEffect, useState } from 'react';
import { Image, Modal, Pressable, Text, View } from 'react-native';

interface SnoozeHabitProps {
  visible: boolean;
  onClose: () => void;
  habit: HabitWithStatus | null;
  snoozeDateStr: string; // the currently set snooze date (YYYY-MM-DD)
  onUpdateSnoozeDate: (habitId: string, newDateStr: string) => void;
  onUndoSnooze: (habitId: string) => void;
}

/**
 * Formats a YYYY-MM-DD date string into a friendly label.
 * Returns "Tomorrow" if it's tomorrow, otherwise "Mon, Feb 17" etc.
 */
function formatSnoozeLabel(dateStr: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);

  if (dateStr === tomorrowStr) return 'Tomorrow';

  // parse the YYYY-MM-DD without timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function SnoozeHabitModal({
  visible,
  onClose,
  habit,
  snoozeDateStr,
  onUpdateSnoozeDate,
  onUndoSnooze,
}: SnoozeHabitProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [pendingDate, setPendingDate] = useState(snoozeDateStr);

  // sync pendingDate when prop changes (e.g. modal opens with new habit)
  useEffect(() => {
    setPendingDate(snoozeDateStr);
    setShowCalendar(false);
  }, [snoozeDateStr, visible]);

  if (!habit) return null;

  const dateLabel = formatSnoozeLabel(pendingDate);

  // convert pendingDate string to a Date for SimpleCalendar (timezone-safe)
  const [y, m, d] = pendingDate.split('-').map(Number);
  const calendarDate = new Date(y, m - 1, d);

  const handleCalendarSelect = (date: Date) => {
    const newDateStr = formatLocalDate(date);
    console.log(`(**TESTING) SnoozeHabitModal: calendar selected ${newDateStr}`);
    setPendingDate(newDateStr);
    setShowCalendar(false);
  };

  const handleDone = () => {
    // if user changed the date from the original, persist it
    if (pendingDate !== snoozeDateStr) {
      console.log(`(**TESTING) SnoozeHabitModal: updating snooze date from ${snoozeDateStr} to ${pendingDate}`);
      onUpdateSnoozeDate(habit.id, pendingDate);
    }
    onClose();
  };

  const handleUndo = () => {
    console.log(`(**TESTING) SnoozeHabitModal: undoing snooze for ${habit.id}`);
    onUndoSnooze(habit.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            borderWidth: 3,
            borderColor: PAGE.habits.primary[1],
            maxHeight: '75%',
            width: '90%',
            alignSelf: 'center',
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* header */}
          <View style={{ marginTop: 20, marginBottom: 15 }}>
            <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>
              {habit.name}
            </Text>
            <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.6 }]}>
              SNOOZED
            </Text>
          </View>

          {/* snooze date button */}
          <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
            <Pressable onPress={() => setShowCalendar(!showCalendar)}>
              <ShadowBox
                contentBackgroundColor="#fff"
                shadowBorderRadius={15}
                contentBorderRadius={15}
                contentBorderColor="#000"
                contentBorderWidth={1}
              >
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  gap: 8,
                }}>
                  <Image
                    source={SYSTEM_ICONS.snooze}
                    style={{ width: 17, height: 17, tintColor: '#000' }}
                  />
                  <Text style={[globalStyles.body]}>
                    {dateLabel}
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>

          {/* calendar (expandable) */}
          {showCalendar && (
            <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
              <ShadowBox
                contentBackgroundColor="#fff"
                shadowBorderRadius={15}
                contentBorderRadius={15}
                contentBorderColor="#000"
                contentBorderWidth={1}
              >
                <SimpleCalendar
                  selectedDate={calendarDate}
                  onSelectDate={handleCalendarSelect}
                />
              </ShadowBox>
            </View>
          )}

          {/* action buttons */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
            <Pressable onPress={handleUndo} style={{ flex: 1 }}>
              <ShadowBox
                contentBackgroundColor={'#f5f5f5'}
                shadowBorderRadius={15}
              >
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                    Undo
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable onPress={handleDone} style={{ flex: 1 }}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Done}
                shadowBorderRadius={15}
              >
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                    Done
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
