import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { PROGRESS_COLORS } from '@/constants';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import { formatLocalDate, getTodayWeekday } from '@/utils/dateUtils';

interface TodaysPlanProps {
  assignments: AssignmentWithCourse[];
  editMode: boolean;
  onDelete: (assignmentId: string) => void;
  onStatusPress: (assignment: AssignmentWithCourse) => void;
}

export function TodaysPlan({ assignments, editMode, onDelete, onStatusPress }: TodaysPlanProps) {
  const today = formatLocalDate(new Date());

  const [completedAssignments, setCompletedAssignments] = useState<Record<string, boolean>>({});

  // load from AsyncStorage on mount
  useEffect(() => {
    const loadCompleted = async () => {
      try {
        const json = await AsyncStorage.getItem(`completedAssignments-${today}`);
        if (json) {
          setCompletedAssignments(JSON.parse(json));
        }
      } catch (err) {
        console.warn('Failed to load completed assignments', err);
      }
    };
    loadCompleted();
  }, [today]);

  // toggle and save
  const toggleCompleted = async (assignmentId: string) => {
    const updated = { ...completedAssignments, [assignmentId]: !completedAssignments[assignmentId] };
    setCompletedAssignments(updated);
    try {
      await AsyncStorage.setItem(`completedAssignments-${today}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save completed assignment', err);
    }
  };

  if (assignments.length === 0) return null;

  return (
    <View style={{
      borderWidth: 1,
      borderRadius: 20,
      backgroundColor: PAGE.assignments.backgroundAssignment[1],
      marginBottom: 20,
      overflow: 'hidden',
    }}>
      <View style={{ margin: 7, alignItems: 'center' }}>
        <Text style={globalStyles.h4}>{getTodayWeekday()}</Text>
      </View>

      {assignments.map(a => {
        const isCompleted = completedAssignments[a.id!];

        // get the course color or fallback
        const courseColor = a.course?.color || PAGE.assignments.backgroundAssignment[1];

        return (
          <View key={a.id} style={{ backgroundColor: courseColor }}>
            <View
              style={{
                padding: 10,
                gap: 10,
                flexDirection: 'column',
                borderTopWidth: 1,
                borderTopColor: 'rgba(0,0,0,0.1)'
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable onPress={() => toggleCompleted(a.id!)}>
                  <Text
                    style={[
                      globalStyles.body,
                      {
                        paddingVertical: 2,
                        textDecorationLine: isCompleted ? 'line-through' : 'none',
                        opacity: isCompleted ? 0.4 : 1
                      }
                    ]}
                  >
                    {a.name}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                  <Pressable onPress={() => onStatusPress(a)}>
                    <View style={[globalStyles.bubbleLabel, { backgroundColor: PROGRESS_COLORS[a.progress] }]}>
                      <Text style={globalStyles.label}>{a.progress}</Text>
                    </View>
                  </Pressable>

                  {editMode && (
                    <Pressable
                      onPress={() => onDelete(a.id!)}
                      style={{
                        backgroundColor: BUTTON_COLORS.Done,
                        borderWidth: 1,
                        borderRadius: 12,
                        width: 25,
                        height: 25,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Image
                        source={SYSTEM_ICONS.delete}
                        style={{ width: 12, height: 12 }}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}