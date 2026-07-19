// @/modals/ManageCoursesModal.tsx
// View + delete courses, opened from the assignments page's more menu.
// Styled to match the assignments modals (white card, assignments-primary border,
// centered h4 title with divider, ShadowBox rows).
import { PAGE, BUTTON_COLORS } from '@/constants/colors';
import { CourseWithColor } from '@/hooks/useAssignmentData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

interface ManageCoursesModalProps {
    visible: boolean;
    courses: CourseWithColor[];
    onClose: () => void;
    // called after a course is deleted so the page can refresh
    onChanged: () => void;
}

export function ManageCoursesModal({ visible, courses, onClose, onChanged }: ManageCoursesModalProps) {
    const { user } = useAuth();
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const confirmDelete = (course: CourseWithColor) => {
        Alert.alert(
            'Delete Course',
            `"${course.course_number}" and all of its assignments will be deleted. This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user || !course.id) return;
                        setDeletingId(course.id);
                        try {
                            // day-plan links → assignments → course, so nothing dangles
                            const { data: courseAssignments } = await supabase
                                .from('assignments')
                                .select('id')
                                .eq('course_id', course.id)
                                .eq('user_id', user.id);
                            const ids = (courseAssignments ?? []).map(a => a.id);
                            if (ids.length > 0) {
                                await supabase.from('day_plan_assignments').delete().in('assignment_id', ids);
                                await supabase.from('assignments').delete().in('id', ids).eq('user_id', user.id);
                            }
                            const { error } = await supabase
                                .from('courses')
                                .delete()
                                .eq('id', course.id)
                                .eq('user_id', user.id);
                            if (error) throw error;
                            onChanged();
                        } catch (err) {
                            console.error('Error deleting course:', err);
                            Alert.alert('Error', 'Failed to delete course. Please try again.');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable
                style={{
                    flex: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    paddingHorizontal: 20,
                }}
                onPress={onClose}
            >
                <Pressable
                    style={{
                        borderWidth: 1.5,
                        borderRadius: 20,
                        backgroundColor: '#fff',
                        borderColor: PAGE.assignments.primary[0],
                        padding: 20,
                        maxHeight: '70%',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <Text style={[globalStyles.h4, { marginBottom: 10, textAlign: 'center' }]}>
                        Courses
                    </Text>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {courses.length === 0 ? (
                            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.5, paddingVertical: 10 }]}>
                                No courses yet.
                            </Text>
                        ) : (
                            courses.map(course => (
                                <ShadowBox
                                    key={course.id}
                                    contentBackgroundColor={course.color ?? '#fff'}
                                    shadowBorderRadius={15}
                                    shadowOffset={{ x: 0, y: 0 }}
                                    style={{ marginBottom: 12 }}
                                >
                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        gap: 10,
                                    }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={globalStyles.body1} numberOfLines={1}>
                                                {course.course_number}
                                            </Text>
                                            {!!course.course_name && (
                                                <Text style={[globalStyles.body2, { fontSize: 12, opacity: 0.7 }]} numberOfLines={1}>
                                                    {course.course_name}
                                                </Text>
                                            )}
                                        </View>
                                        <Pressable
                                            onPress={() => confirmDelete(course)}
                                            disabled={deletingId === course.id}
                                            hitSlop={8}
                                        >
                                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={12} shadowOffset={{ x: 0, y: 1 }}>
                                                <View style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
                                                    <Text style={[globalStyles.body1, { fontSize: 12 }]}>
                                                        {deletingId === course.id ? '…' : 'Delete'}
                                                    </Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    </View>
                                </ShadowBox>
                            ))
                        )}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
