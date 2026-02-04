// @/components/assignments/AssignmentCard.tsx
import { ASSIGNMENT_TYPE_COLORS, PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { formatDueDateTimeDisplay, isPast } from '@/utils/dateUtils';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface AssignmentCardProps {
    assignment: AssignmentWithCourse;
    showDelete?: boolean;
    onDelete?: () => void;
    onStatusPress?: () => void;
}

export function AssignmentCard({ assignment, showDelete = false, onDelete, onStatusPress }: AssignmentCardProps) {
    return (
        <ShadowBox
            key={assignment.id}
            contentBackgroundColor={PROGRESS_COLORS[assignment.progress]}
            // style={styles.container}
            // contentBackgroundColor={isCompleted ? habitColor : '#fff'}
            contentBorderColor='#000'
            contentBorderWidth={1}
            shadowBorderRadius={15}
            shadowOffset={{ x: 0, y: 0 }}
            shadowColor={'#000'}
        >
            <View
                style={{
                    padding: 10,
                    gap: 10,
                    flexDirection: 'column',
                }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[globalStyles.body, { paddingVertical: 2, flex: 1 }]}>
                        {assignment.name}
                    </Text>

                    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                        {assignment.course && (
                            <ShadowBox
                                contentBackgroundColor={assignment.course.color || '#fff'}
                                shadowOffset={{ x: 0, y: 1 }}

                            >
                                <View style={{ paddingHorizontal: 10, paddingVertical: 2 }}>
                                    <Text style={globalStyles.body2}>
                                        {assignment.course.course_number}
                                    </Text>
                                </View>
                            </ShadowBox>
                        )}
                        {showDelete && onDelete && (
                            <Pressable
                                onPress={onDelete}
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

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable
                        onPress={onStatusPress}
                        style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-start' }}
                    >
                        <ShadowBox
                            contentBackgroundColor={PROGRESS_COLORS[assignment.progress]}
                            contentBorderRadius={12}
                            shadowBorderRadius={25}
                            shadowOffset={{ x: 0, y: 2 }}
                        >
                            <Text style={[globalStyles.label, { paddingVertical: 5, paddingHorizontal: 15 }]}>{assignment.progress}</Text>
                        </ShadowBox>

                        <View style={{
                            paddingVertical: 5,
                            paddingHorizontal: 10,
                            borderRadius: 20,
                            maxWidth: 80,
                            borderWidth: 1,
                            borderColor: '#000',
                            backgroundColor: ASSIGNMENT_TYPE_COLORS[assignment.type] || PAGE.assignments.backgroundAssignment[0]
                        }}>
                            <Text
                                style={globalStyles.label}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {assignment.type}
                            </Text>
                        </View>
                    </Pressable>

                    <View style={{ justifyContent: 'flex-end' }}>
                        {assignment.due_date && (
                            <View style={{
                                paddingVertical: 5,
                                paddingHorizontal: 10,
                                borderRadius: 20,
                                borderWidth: 1.5,
                                borderColor: '#ffe8e8',
                                backgroundColor: isPast(assignment.due_date) ?
                                    BUTTON_COLORS.Delete :
                                    PAGE.assignments.background[1]
                            }}>
                                <Text style={globalStyles.label}>
                                    {formatDueDateTimeDisplay(assignment.due_date, assignment.due_time || undefined)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </ShadowBox>
    );
}