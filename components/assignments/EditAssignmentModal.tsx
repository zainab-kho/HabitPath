// @/components/assignments/EditAssignmentModal.tsx
// Edit an assignment from the All Assignments page. Mirrors the New Assignment
// page's design: uppercase section labels, selectable color chips for type /
// progress / course, and the standard modal footer.
import { ASSIGNMENT_PROGRESS, ASSIGNMENT_TYPE_COLORS, ASSIGNMENT_TYPES, PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { AssignmentWithCourse, CourseWithColor } from '@/hooks/useAssignmentData';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel } from '@/ui/TimeWheel';
import { dateToISODateString, formatDateForForm, parseLocalDate } from '@/utils/dateUtils';

interface EditAssignmentModalProps {
    visible: boolean;
    assignment: AssignmentWithCourse | null;
    courses: CourseWithColor[];
    onClose: () => void;
    // called after save/delete so the page can refresh in place
    onChanged?: () => void;
}

export default function EditAssignmentModal({ visible, assignment, courses, onClose, onChanged }: EditAssignmentModalProps) {
    const { user } = useAuth();

    // form state
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [progress, setProgress] = useState('');
    const [courseId, setCourseId] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [dueTime, setDueTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // initialize form with assignment data
    useEffect(() => {
        if (assignment) {
            setName(assignment.name || '');
            setType(assignment.type || '');
            setProgress(assignment.progress || '');
            setCourseId(assignment.course_id || '');
            setDueDate(assignment.due_date ? parseLocalDate(assignment.due_date) : null);
            setDueTime(assignment.due_time || '');
            setShowDatePicker(false);
        }
    }, [assignment]);

    const handleSave = async () => {
        if (!assignment?.id || !user) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('assignments')
                .update({
                    name: name.trim(),
                    type,
                    progress,
                    course_id: courseId || null,
                    due_date: dueDate ? dateToISODateString(dueDate) : null,
                    due_time: dueTime || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', assignment.id)
                .eq('user_id', user.id);

            if (error) {
                Alert.alert('Error updating assignment:', error.message);
                return;
            }

            onClose();
            onChanged?.();
        } catch (error) {
            console.error('Error updating assignment:', error);
            Alert.alert('Error', 'Failed to update assignment');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Assignment',
            'Are you sure you want to delete this assignment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!assignment?.id || !user) return;

                        try {
                            // delete from day plans first
                            await supabase
                                .from('day_plan_assignments')
                                .delete()
                                .eq('assignment_id', assignment.id);

                            const { error } = await supabase
                                .from('assignments')
                                .delete()
                                .eq('id', assignment.id)
                                .eq('user_id', user.id);

                            if (error) throw error;

                            onClose();
                            onChanged?.();
                        } catch (error) {
                            console.error('Error deleting assignment:', error);
                            Alert.alert('Error', 'Failed to delete assignment');
                        }
                    }
                }
            ]
        );
    };

    // selectable chip matching the New Assignment page's type/progress pickers
    const chip = (label: string, selected: boolean, color: string, onPress: () => void) => (
        <Pressable key={label} onPress={onPress}>
            <ShadowBox
                contentBackgroundColor={selected ? color : '#fff'}
                contentBorderColor={selected ? '#000' : color}
                shadowColor={selected ? '#000' : color}
                shadowBorderColor={selected ? '#000' : color}
            >
                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                    <Text style={globalStyles.body1}>{label}</Text>
                </View>
            </ShadowBox>
        </Pressable>
    );

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
                }}
                onPress={onClose}
            >
                <Pressable
                    style={{
                        backgroundColor: '#fff',
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: PAGE.assignments.primary[0],
                        maxHeight: '80%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ marginTop: 20, marginHorizontal: 20 }}>
                        <Text style={[globalStyles.h4, { textAlign: 'center', marginBottom: 10 }]}>
                            Edit Assignment
                        </Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
                        {/* name */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>ASSIGNMENT NAME</Text>
                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.assignments.primary[1],
                                marginBottom: 20,
                            }]}
                            value={name}
                            onChangeText={setName}
                            placeholder="Assignment name"
                            cursorColor={PAGE.assignments.primary[1]}
                            selectionColor={PAGE.assignments.primary[1]}
                        />

                        {/* course */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>COURSE</Text>
                        <View style={{ marginBottom: 20, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {courses.map(c =>
                                chip(c.course_number, courseId === c.id, c.color ?? '#fff', () => setCourseId(c.id!))
                            )}
                        </View>

                        {/* type */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>TYPE</Text>
                        <View style={{ marginBottom: 20, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {ASSIGNMENT_TYPES.map(t =>
                                chip(t, type === t, ASSIGNMENT_TYPE_COLORS[t], () => setType(t))
                            )}
                        </View>

                        {/* progress */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>PROGRESS</Text>
                        <View style={{ marginBottom: 20, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {ASSIGNMENT_PROGRESS.map(p =>
                                chip(p, progress === p, PROGRESS_COLORS[p], () => setProgress(p))
                            )}
                        </View>

                        {/* due date */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>DUE DATE</Text>
                        <ShadowBox
                            contentBackgroundColor={PAGE.assignments.primary[1]}
                            style={{ marginBottom: showDatePicker ? 10 : 20 }}
                        >
                            <Pressable
                                onPress={() => setShowDatePicker(v => !v)}
                                style={{ paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' }}
                            >
                                <Text style={globalStyles.body}>
                                    {dueDate ? formatDateForForm(dueDate) : 'Select date'}
                                </Text>
                            </Pressable>
                        </ShadowBox>

                        {showDatePicker && (
                            <ShadowBox style={{ marginBottom: 20 }}>
                                <SimpleCalendar
                                    selectedDate={dueDate ?? new Date()}
                                    onSelectDate={(date) => {
                                        setDueDate(date);
                                        setShowDatePicker(false);
                                    }}
                                    selectedDateColor={PAGE.assignments.primary[0]}
                                />
                            </ShadowBox>
                        )}

                        {/* due time */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>DUE TIME (OPTIONAL)</Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
                            <TimeWheel
                                data={Array.from({ length: 12 }, (_, i) => `${i === 0 ? 12 : i}`)}
                                selected={dueTime.split(':')[0] || '12'}
                                onSelect={(hour) => {
                                    const [, minutes = '00'] = dueTime.split(':');
                                    setDueTime(`${hour}:${minutes}`);
                                }}
                            />
                            <Text style={{ alignSelf: 'center', fontSize: 16 }}>:</Text>
                            <TimeWheel
                                data={['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']}
                                selected={dueTime.split(':')[1] || '00'}
                                onSelect={(minute) => {
                                    const [hour = '12'] = dueTime.split(':');
                                    setDueTime(`${hour}:${minute}`);
                                }}
                            />
                            <TimeWheel
                                data={['AM', 'PM']}
                                selected={dueTime.includes('PM') ? 'PM' : 'AM'}
                                onSelect={(ampm) => {
                                    const [hourMinute] = dueTime.split(' ');
                                    setDueTime(`${hourMinute || '12:00'} ${ampm}`);
                                }}
                            />
                        </View>

                        {/* delete */}
                        <Pressable onPress={handleDelete} style={{ alignSelf: 'center', width: 140, marginBottom: 10 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={20}>
                                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Delete</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </ScrollView>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Quiet} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={handleSave} style={{ flex: 1 }} disabled={isSaving}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Save}
                                shadowBorderRadius={15}
                                style={{ opacity: isSaving ? 0.5 : 1 }}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving ? 'Saving...' : 'Save'}
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
