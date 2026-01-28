// @/components/assignments/StatusModal.tsx
import { ASSIGNMENT_PROGRESS, PROGRESS_COLORS } from '@/constants/';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';

interface StatusModalProps {
    visible: boolean;
    selectedAssignment: AssignmentWithCourse | null;
    onClose: () => void;
    onUpdateStatus: (assignmentId: string, newStatus: string) => void;
}

export function StatusModal({ visible, selectedAssignment, onClose, onUpdateStatus }: StatusModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    paddingHorizontal: 80,
                }}
                onPress={onClose}
            >
                <View style={{
                    borderWidth: 1.5,
                    borderRadius: 20,
                    backgroundColor: '#fff',
                    borderColor: PAGE.assignments.primary[0],
                    padding: 20,
                }}>
                    <Text style={[globalStyles.h4, { marginBottom: 10, textAlign: 'center' }]}>
                        Update Status
                    </Text>

                    <View style={{ height: 1, backgroundColor: PAGE.assignments.primary[0], marginBottom: 30 }} />

                    <View style={{ alignItems: 'center' }}>
                        {ASSIGNMENT_PROGRESS.map((status) => (
                            <Pressable
                                key={status}
                                onPress={() => {
                                    if (selectedAssignment?.id) {
                                        onUpdateStatus(selectedAssignment.id, status);
                                    }
                                }}
                                style={{ marginBottom: 10 }}
                            >
                                <ShadowBox
                                    contentBackgroundColor={PROGRESS_COLORS[status]}
                                    shadowOffset={{ x: 3, y: 3 }}
                                    style={{ width: 125 }}
                                >
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body1, { textAlign: 'center' }]}>{status}</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </Pressable>
        </Modal>
    );
}