// @/modals/habits/TimeLogModal.tsx
//
// Modal for logging time (hours + minutes) toward a weekly time-tracking habit.
// Shows current weekly progress with a progress bar.

import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { formatMinutesAsTime } from '@/utils/dateUtils';

interface TimeLogModalProps {
  visible: boolean;
  onClose: () => void;
  habitName: string;
  weeklyTotal: number;    // minutes already logged this week
  weeklyGoal: number;     // goal in minutes (e.g. 600 for 10h)
  habitColor?: string;
  onLogTime: (minutes: number) => void;
}

export default function TimeLogModal({
  visible,
  onClose,
  habitName,
  weeklyTotal,
  weeklyGoal,
  habitColor = COLORS.ProgressColor,
  onLogTime,
}: TimeLogModalProps) {
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');

  const remaining = Math.max(0, weeklyGoal - weeklyTotal);
  const progressPct = weeklyGoal > 0 ? Math.min((weeklyTotal / weeklyGoal) * 100, 100) : 0;
  const isGoalReached = weeklyTotal >= weeklyGoal && weeklyGoal > 0;

  const handleLog = () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMinutes = h * 60 + m;
    if (totalMinutes <= 0) return;

    onLogTime(totalMinutes);
    setHours('0');
    setMinutes('30');
    onClose();
  };

  const handleClose = () => {
    setHours('0');
    setMinutes('30');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
        <Pressable
          style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            borderWidth: 3,
            borderColor: PAGE.habits.primary[1],
            width: '90%',
            alignSelf: 'center',
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* header */}
          <View style={{ marginTop: 20, marginBottom: 15 }}>
            <Text style={[globalStyles.h2, { textAlign: 'center', marginBottom: 5 }]}>
              {habitName}
            </Text>
            <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.6 }]}>
              LOG TIME
            </Text>
          </View>

          {/* weekly progress bar */}
          <View style={{ paddingHorizontal: 20, marginBottom: 15 }}>
            <View style={{
              borderRadius: 20,
              backgroundColor: '#fff',
              borderWidth: 1,
              overflow: 'hidden',
            }}>
              <View style={{
                height: 26,
                borderRadius: 20,
                overflow: 'hidden',
                backgroundColor: '#fff',
                position: 'relative',
              }}>
                {progressPct > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: 0, left: 0, bottom: 0,
                    width: `${progressPct}%`,
                    backgroundColor: isGoalReached ? '#54d697' : habitColor,
                    zIndex: 2,
                  }} />
                )}
                <View style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 3,
                }}>
                  <Text style={{ fontSize: 11, fontFamily: 'label', fontWeight: '600' }}>
                    {formatMinutesAsTime(weeklyTotal)} / {formatMinutesAsTime(weeklyGoal)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[globalStyles.label, {
              textAlign: 'center',
              marginTop: 8,
              opacity: 0.5,
              fontSize: 11,
            }]}>
              {isGoalReached
                ? 'Weekly goal reached!'
                : `${formatMinutesAsTime(remaining)} left this week`}
            </Text>
          </View>

          {/* time input */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            marginBottom: 20,
          }}>
            {/* hours */}
            <View style={{ alignItems: 'center', gap: 6 }}>
              <Text style={[globalStyles.label, { fontSize: 10 }]}>HOURS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                  <Pressable
                    onPress={() => setHours(prev => String(Math.max(0, (parseInt(prev) || 0) - 1)))}
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
                      style={[globalStyles.body, { textAlign: 'center', paddingVertical: 4 }]}
                      keyboardType="numeric"
                      value={hours}
                      onChangeText={setHours}
                      selectTextOnFocus
                    />
                  </View>
                </ShadowBox>

                <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                  <Pressable
                    onPress={() => setHours(prev => String((parseInt(prev) || 0) + 1))}
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
                    onPress={() => setMinutes(prev => {
                      const val = (parseInt(prev) || 0) - 15;
                      return String(val < 0 ? 0 : val);
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
                      style={[globalStyles.body, { textAlign: 'center', paddingVertical: 4 }]}
                      keyboardType="numeric"
                      value={minutes}
                      onChangeText={setMinutes}
                      selectTextOnFocus
                    />
                  </View>
                </ShadowBox>

                <ShadowBox shadowColor={PAGE.habits.primary[1]}>
                  <Pressable
                    onPress={() => setMinutes(prev => String((parseInt(prev) || 0) + 15))}
                    style={{ paddingVertical: 4, paddingHorizontal: 10 }}
                  >
                    <Text style={globalStyles.body}>+</Text>
                  </Pressable>
                </ShadowBox>
              </View>
            </View>
          </View>

          {/* action buttons */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
            <Pressable onPress={handleClose} style={{ flex: 1 }}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Cancel}
                shadowBorderRadius={15}
              >
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                    Cancel
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable onPress={handleLog} style={{ flex: 1 }}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Save}
                shadowBorderRadius={15}
              >
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                    Log
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
