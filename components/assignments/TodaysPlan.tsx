// @/components/assignments/TodaysPlan.tsx
import { getTodayWeekday } from '@/components/utils/dateUtils';
import { PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface TodaysPlanProps {
    assignments: AssignmentWithCourse[];
    editMode: boolean;
    onDelete: (assignmentId: string) => void;
    onStatusPress: (assignment: AssignmentWithCourse) => void;
}

export function TodaysPlan({ assignments, editMode, onDelete, onStatusPress }: TodaysPlanProps) {
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

            {assignments.map(assignment => (
                <View key={assignment.id} style={{ backgroundColor: '#fff', position: 'relative' }}>
                    <View style={{ padding: 10, gap: 10, flexDirection: 'column', borderTopWidth: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={[globalStyles.body, { paddingVertical: 2 }]}>
                                {assignment.name}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                                <Pressable onPress={() => onStatusPress(assignment)}>
                                    <View style={[globalStyles.bubbleLabel, { backgroundColor: PROGRESS_COLORS[assignment.progress] }]}>
                                        <Text style={globalStyles.label}>{assignment.progress}</Text>
                                    </View>
                                </Pressable>

                                {editMode && (
                                    <Pressable
                                        onPress={() => onDelete(assignment.id!)}
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
                    </View>
                </View>
            ))}
        </View>
    );
}