// @/components/assignments/WeekPlanView.tsx
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Assignment } from '@/types/Assignment';
import { Course } from '@/types/Course';
import ShadowBox from '@/ui/ShadowBox';
import { formatLocalDate } from '@/utils/dateUtils';

type CourseWithColor = Course & { color?: string };
type AssignmentWithCourse = Assignment & { course?: CourseWithColor };

type WeekPlan = {
  id: string;
  weekRange: { start: Date; end: Date; label: string };
  selectedDays: string[];
  isCollapsed: boolean;
};

type DayPlanAssignment = {
  id: string;
  assignment_id: string;
  planned_date: string;
};

interface WeekPlanViewProps {
  weekPlans: WeekPlan[];
  assignments: AssignmentWithCourse[];
  dayPlanAssignments: DayPlanAssignment[];
  editMode: boolean;
  onToggleCollapse: (weekPlanId: string) => void;
  onRemoveWeekPlan: (weekPlanId: string) => void;
  onDeleteFromWeekPlan: (assignmentId: string, plannedDate: string) => void;
  onOpenAssignmentSheet: (date: string, label: string) => void;
  onOpenStatusModal: (assignment: AssignmentWithCourse) => void;
  shouldArchiveWeek: (weekPlan: WeekPlan) => boolean;
}

const WeekPlanView: React.FC<WeekPlanViewProps> = ({
  weekPlans,
  assignments,
  dayPlanAssignments,
  editMode,
  onToggleCollapse,
  onRemoveWeekPlan,
  onDeleteFromWeekPlan,
  onOpenAssignmentSheet,
  onOpenStatusModal,
  shouldArchiveWeek,
}) => {
  // get assignments for a specific day, sorted by when they were added to the plan
  const getAssignmentsForDay = (date: Date) => {
    const dateString = formatLocalDate(date);
    
    // get all day plan assignments for this date
    const dayPlanForDate = dayPlanAssignments
      .filter(dpa => dpa.planned_date === dateString);

    // sort by created_at if available (cast to any to handle optional field)
    const sortedPlans = [...dayPlanForDate].sort((a, b) => {
      const aCreatedAt = (a as any).created_at;
      const bCreatedAt = (b as any).created_at;
      
      if (!aCreatedAt && !bCreatedAt) return 0;
      if (!aCreatedAt) return 1;
      if (!bCreatedAt) return -1;
      return aCreatedAt < bCreatedAt ? -1 : 1;
    });

    // map to assignments while maintaining order
    return sortedPlans
      .map(dpa => assignments.find(a => a.id === dpa.assignment_id))
      .filter((a): a is AssignmentWithCourse => a !== undefined);
  };

  // map day names to their indices
  const dayNameToIndex: { [key: string]: number } = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  return (
    <>
      {weekPlans
        .filter(weekPlan => !shouldArchiveWeek(weekPlan))
        .map((weekPlan) => (
          <View
            key={weekPlan.id}
            style={{
              borderWidth: 1,
              borderRadius: 20,
              padding: 10,
              marginBottom: 20,
              justifyContent: 'flex-end',
              backgroundColor: '#fff',
            }}
          >
            {/* week header */}
            <Pressable
              onPress={() => onToggleCollapse(weekPlan.id)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: weekPlan.isCollapsed ? 0 : 15,
              }}
            >
              <Text style={globalStyles.h4}>
                {weekPlan.weekRange.label}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Image
                  source={SYSTEM_ICONS.sort}
                  style={{
                    width: 20,
                    height: 20,
                    transform: [{ rotate: weekPlan.isCollapsed ? '0deg' : '180deg' }],
                  }}
                />

                {editMode && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onRemoveWeekPlan(weekPlan.id);
                    }}
                    onPressIn={(e) => e.stopPropagation?.()}
                    style={{
                      backgroundColor: BUTTON_COLORS.Delete,
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
            </Pressable>

            {/* week days */}
            {!weekPlan.isCollapsed && weekPlan.selectedDays.map((day, index) => {
              // get the day of week for the week start date
              const startDayOfWeek = weekPlan.weekRange.start.getDay();
              const currentDayOfWeek = dayNameToIndex[day];

              // calculate how many days from start to this day
              let daysFromStart = currentDayOfWeek - startDayOfWeek;
              if (daysFromStart < 0) daysFromStart += 7; // Handle week wraparound

              // create date for this day
              const dayDate = new Date(weekPlan.weekRange.start);
              dayDate.setDate(weekPlan.weekRange.start.getDate() + daysFromStart);

              const dayAssignments = getAssignmentsForDay(dayDate);
              const dateString = formatLocalDate(dayDate);

              return (
                <View key={day} style={{ marginBottom: 15, backgroundColor: PAGE.assignments.backgroundAssignment[1], padding: 10, borderRadius: 12 }}>
                  {/* day label */}
                  <View style={{ marginVertical: 10 }}>
                    <Text style={globalStyles.body}>{day}</Text>
                  </View>

                  {/* assignments for this day */}
                  {dayAssignments.map(assignment => (
                    <ShadowBox
                      key={assignment.id}
                      contentBackgroundColor={PROGRESS_COLORS[assignment.progress]}
                      style={{ marginBottom: 8, position: 'relative' }}
                    >
                      <Pressable
                        style={{
                          padding: 10,
                          gap: 10,
                          flexDirection: 'column',
                        }}
                        onPress={() => onOpenStatusModal(assignment)}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[globalStyles.body, { paddingVertical: 2, maxWidth: 170, overflow: 'hidden' }]}>
                            {assignment.name}
                          </Text>

                          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                            {assignment.course && (
                              <ShadowBox contentBackgroundColor={assignment.course.color || '#fff'}>
                                <View style={{ paddingHorizontal: 10, paddingVertical: 2 }}>
                                  <Text style={globalStyles.body2}>
                                    {assignment.course.course_number}
                                  </Text>
                                </View>
                              </ShadowBox>
                            )}
                            {editMode && (
                              <Pressable
                                onPress={() => onDeleteFromWeekPlan(assignment.id!, dateString)}
                                style={{
                                  backgroundColor: BUTTON_COLORS.Delete,
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
                      </Pressable>
                    </ShadowBox>
                  ))}

                  {/* add assignment button */}
                  <Pressable
                    onPress={() => {
                      const label = `${day}, ${dayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`;
                      onOpenAssignmentSheet(dateString, label);
                    }}
                  >
                    <ShadowBox
                      contentBackgroundColor={PAGE.assignments.background[1]}
                      shadowBorderRadius={20}
                      style={{ alignSelf: 'center', width: '100%' }}
                    >
                      <View style={{
                        justifyContent: 'center',
                        alignContent: 'center',
                        paddingVertical: 5,
                        alignItems: 'center'
                      }}>
                        <Text style={globalStyles.body}>+</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
    </>
  );
};

export default WeekPlanView;