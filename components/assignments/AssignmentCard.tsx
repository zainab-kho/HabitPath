// @/components/assignments/AssignmentCard.tsx
import { parseLocalDate } from '@/components/utils/dateUtils';
import { ASSIGNMENT_TYPE_COLORS, PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface AssignmentCardProps {
    assignment: AssignmentWithCourse;
    showDelete?: boolean;
    onDelete?: () => void;
    onStatusPress?: () => void;
}

const formatDueDateTime = (date?: string, time?: string) => {
    if (!date) return '';

    const d = parseLocalDate(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    let dateStr = '';
    if (dateOnly.getTime() === todayOnly.getTime()) {
        dateStr = 'Today';
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
        dateStr = 'Tomorrow';
    } else {
        dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    return time ? `${dateStr} ${time}` : dateStr;
};

export function AssignmentCard({ assignment, showDelete = false, onDelete, onStatusPress }: AssignmentCardProps) {
    return (
        <ShadowBox
            key={assignment.id}
            contentBackgroundColor={PROGRESS_COLORS[assignment.progress]}
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
                            <ShadowBox contentBackgroundColor={assignment.course.color || '#fff'}>
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
                            borderRadius={8}
                        >
                            <Text style={[globalStyles.label, { padding: 5 }]}>{assignment.progress}</Text>
                        </ShadowBox>

                        <View style={[globalStyles.bubbleLabel, { backgroundColor: ASSIGNMENT_TYPE_COLORS[assignment.type] || '#fff' }]}>
                            <Text style={globalStyles.label}>{assignment.type}</Text>
                        </View>
                    </Pressable>

                    <View style={{ justifyContent: 'flex-end' }}>
                        {assignment.due_date && (
                            <View style={[globalStyles.bubbleLabel, { paddingVertical: 5, backgroundColor: '#fff' }]}>
                                <Text style={globalStyles.label}>
                                    {formatDueDateTime(assignment.due_date, assignment.due_time || undefined)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </ShadowBox>
    );
}