// @/modals/AddAssignmentToDaySheet.tsx
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ASSIGNMENT_TYPE_COLORS, PROGRESS_COLORS } from '@/constants';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

interface AddAssignmentToDaySheetProps {
    visible: boolean;
    onClose: () => void;
    dayLabel: string;
    targetDate: string;
    unassignedAssignments: AssignmentWithCourse[];
    assignedAssignments: AssignmentWithCourse[];
    remainingAssignments: AssignmentWithCourse[];
    onAddAssignment: (assignmentId: string, plannedDate: string) => void;
}

export default function AddAssignmentToDaySheet({
    visible,
    onClose,
    dayLabel,
    targetDate,
    unassignedAssignments,
    assignedAssignments,
    remainingAssignments,
    onAddAssignment
}: AddAssignmentToDaySheetProps) {
    const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<string[]>([]);
    const [isAdding, setIsAdding] = useState(false);

    const handleToggleSelection = (assignmentId: string) => {
        setSelectedAssignmentIds(prev =>
            prev.includes(assignmentId) ? prev.filter(id => id !== assignmentId) : [...prev, assignmentId]
        );
    };

    const handleAdd = async () => {
        if (!selectedAssignmentIds.length) return;
        setIsAdding(true);
        try {
            for (const assignmentId of selectedAssignmentIds) {
                await onAddAssignment(assignmentId, targetDate);
            }
            setSelectedAssignmentIds([]);
            onClose();
        } finally {
            setIsAdding(false);
        }
    };

    const handleCancel = () => {
        setSelectedAssignmentIds([]);
        onClose();
    };

    const renderAssignment = (assignment: AssignmentWithCourse) => {
        const isSelected = selectedAssignmentIds.includes(assignment.id!);
        return (
            <Pressable
                key={assignment.id}
                onPress={() => handleToggleSelection(assignment.id!)}
                style={{ marginBottom: 10 }}
            >
                <ShadowBox
                    contentBackgroundColor={
                        isSelected
                            ? PAGE.assignments.primary[1]
                            : PROGRESS_COLORS[assignment.progress]
                    }
                >
                    <View style={{ padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                            <Text style={[globalStyles.body, { flex: 1 }]}>
                                {assignment.name}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
                            {assignment.course && (
                                <ShadowBox contentBackgroundColor={assignment.course.color || '#fff'}>
                                    <View style={{ paddingHorizontal: 6, paddingVertical: 2 }}>
                                            <Text style={globalStyles.body2}>
                                                {assignment.course.course_number}
                                            </Text>
                                    </View>
                                </ShadowBox>
                            )}
                            {isSelected && (
                                    <View style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: BUTTON_COLORS.Done,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderWidth: 1,
                                    }}>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                                </View>
                            )}
                        </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
                            <View style={[globalStyles.bubbleLabel, { backgroundColor: ASSIGNMENT_TYPE_COLORS[assignment.type] }]}>
                                <Text style={globalStyles.label}>{assignment.type}</Text>
                            </View>
                        {assignment.due_date && (
                                <View style={[globalStyles.bubbleLabel, { backgroundColor: '#fff' }]}>
                                    <Text style={globalStyles.label}>
                                Due: {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </Text>
                                </View>
                        )}
                        </View>
                    </View>
                </ShadowBox>
            </Pressable>
        );
    };

    const hasAssignments = unassignedAssignments.length || assignedAssignments.length || remainingAssignments.length;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleCancel}>
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }} onPress={handleCancel}>
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 3,
                        borderColor: PAGE.assignments.primary[1],
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ marginTop: 20, marginBottom: 10 }}>
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 5 }]}>Add to {dayLabel}</Text>
                        <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                            {selectedAssignmentIds.length ? `${selectedAssignmentIds.length} selected` : 'Select assignments to work on'}
                        </Text>
                    </View>

                    <ScrollView style={{ paddingHorizontal: 3 }}>
                        <View style={{ padding: 20 }}>
                            {unassignedAssignments.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[globalStyles.body, { marginBottom: 10, opacity: 0.7, fontWeight: 'bold' }]}>
                                        Unassigned Tasks ({unassignedAssignments.length})
                                    </Text>
                                    {unassignedAssignments.map(renderAssignment)}
                                </View>
                            )}

                            {assignedAssignments.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[globalStyles.body, { fontWeight: 'bold', marginBottom: 10, opacity: 0.7 }]}>
                                        Assigned Tasks ({assignedAssignments.length})
                                    </Text>
                                    {assignedAssignments.map(renderAssignment)}
                                </View>
                            )}

                            {remainingAssignments.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[globalStyles.body, { fontWeight: 'bold', marginBottom: 10 }]}>All Remaining Tasks</Text>
                                    {remainingAssignments.map(renderAssignment)}
                                </View>
                            )}

                            {!hasAssignments && (
                                <Text style={[globalStyles.body, { textAlign: 'center', opacity: 0.5, marginTop: 20 }]}>
                                    No assignments available
                                </Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={handleCancel} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.background[1]}
                                borderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            onPress={handleAdd}
                            style={{ flex: 1 }}
                            disabled={selectedAssignmentIds.length === 0 || isAdding}
                        >
                            <ShadowBox
                                contentBackgroundColor={
                                    selectedAssignmentIds.length === 0 || isAdding
                                        ? '#ccc'
                                        : BUTTON_COLORS.Done
                                }
                                borderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isAdding
                                            ? 'Adding...'
                                            : selectedAssignmentIds.length > 0
                                                ? `Add (${selectedAssignmentIds.length})`
                                                : 'Add'}
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