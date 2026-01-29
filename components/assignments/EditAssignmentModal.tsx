// @/components/assignments/EditAssignmentModal.tsx
import { ASSIGNMENT_PROGRESS, ASSIGNMENT_TYPE_COLORS, ASSIGNMENT_TYPES, PROGRESS_COLORS } from '@/constants/';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { AssignmentWithCourse, CourseWithColor } from '@/hooks/useAssignmentData';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel } from '@/ui/TimeWheel';
import { dateToISODateString, formatDateForForm, parseLocalDate } from '@/utils/dateUtils';

interface EditAssignmentModalProps {
    visible: boolean;
    assignment: AssignmentWithCourse | null;
    courses: CourseWithColor[];
    onClose: () => void;
}

// **TODO: cleanup file

export default function EditAssignmentModal({ visible, assignment, courses, onClose }: EditAssignmentModalProps) {
    const { user } = useAuth();

    // form state
    const [name, setName] = useState('');
    const [type, setType] = useState('');
    const [progress, setProgress] = useState('');
    const [courseId, setCourseId] = useState('');
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [dueTime, setDueTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Dropdown states
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showProgressDropdown, setShowProgressDropdown] = useState(false);
    const [showCourseDropdown, setShowCourseDropdown] = useState(false);

    // initialize form with assignment data
    useEffect(() => {
        if (assignment) {
            setName(assignment.name || '');
            setType(assignment.type || '');
            setProgress(assignment.progress || '');
            setCourseId(assignment.course_id || '');
            // Use centralized date parsing
            setDueDate(assignment.due_date ? parseLocalDate(assignment.due_date) : null);
            setDueTime(assignment.due_time || '');
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
                    // Use centralized date formatting
                    due_date: dueDate ? dateToISODateString(dueDate) : null,
                    due_time: dueTime || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', assignment.id)
                .eq('user_id', user.id);

            if (error) throw error;

            Alert.alert('Success', 'Assignment updated successfully');
            onClose();
            // Trigger refresh by reloading the page
            setTimeout(() => {
                window.location.reload();
            }, 500);
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
                            // Delete from day plans first
                            await supabase
                                .from('day_plan_assignments')
                                .delete()
                                .eq('assignment_id', assignment.id);

                            // Delete the assignment
                            const { error } = await supabase
                                .from('assignments')
                                .delete()
                                .eq('id', assignment.id)
                                .eq('user_id', user.id);

                            if (error) throw error;

                            Alert.alert('Success', 'Assignment deleted');
                            onClose();
                            setTimeout(() => {
                                window.location.reload();
                            }, 500);
                        } catch (error) {
                            console.error('Error deleting assignment:', error);
                            Alert.alert('Error', 'Failed to delete assignment');
                        }
                    }
                }
            ]
        );
    };

    const getCourseById = (id: string) => courses.find(c => c.id === id);

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
                        borderWidth: 3,
                        borderColor: PAGE.assignments.primary[1],
                        maxHeight: '75%',
                        width: '90%',
                        alignSelf: 'center',
                    }}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={{ marginTop: 20, marginBottom: 10 }}>
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 5 }]}>Edit Assignment</Text>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ padding: 20 }}>
                        {/* assignment name */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>TITLE</Text>
                            {/* <View style={{globalStyles.inputBox, borderColor: '#000', borderWidth: 1, borderRadius: 10 }}> */}
                            <View style={uiStyles.inputField}>
                                <TextInput
                                    style={[globalStyles.body]}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Assignment name"
                                />
                                {/* </View> */}
                            </View>
                        </View>

                        {/* Type Dropdown */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[globalStyles.body, { marginBottom: 8 }]}>Type</Text>
                            <Pressable onPress={() => setShowTypeDropdown(!showTypeDropdown)}>
                                <ShadowBox contentBackgroundColor={ASSIGNMENT_TYPE_COLORS[type] || '#fff'}>
                                    <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>{type || 'Select type'}</Text>
                                        <Image source={SYSTEM_ICONS.sort} style={{ width: 15, height: 15 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>
                            {showTypeDropdown && (
                                <View style={{ marginTop: 5, gap: 5 }}>
                                    {ASSIGNMENT_TYPES.map((t) => (
                                        <Pressable
                                            key={t}
                                            onPress={() => {
                                                setType(t);
                                                setShowTypeDropdown(false);
                                            }}
                                        >
                                            <ShadowBox contentBackgroundColor={ASSIGNMENT_TYPE_COLORS[t]}>
                                                <View style={{ padding: 10 }}>
                                                    <Text style={globalStyles.body}>{t}</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Progress Dropdown */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[globalStyles.body, { marginBottom: 8 }]}>Progress</Text>
                            <Pressable onPress={() => setShowProgressDropdown(!showProgressDropdown)}>
                                <ShadowBox contentBackgroundColor={PROGRESS_COLORS[progress]}>
                                    <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>{progress || 'Select progress'}</Text>
                                        <Image source={SYSTEM_ICONS.sort} style={{ width: 15, height: 15 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>
                            {showProgressDropdown && (
                                <View style={{ marginTop: 5, gap: 5 }}>
                                    {ASSIGNMENT_PROGRESS.map((p) => (
                                        <Pressable
                                            key={p}
                                            onPress={() => {
                                                setProgress(p);
                                                setShowProgressDropdown(false);
                                            }}
                                        >
                                            <ShadowBox contentBackgroundColor={PROGRESS_COLORS[p]}>
                                                <View style={{ padding: 10 }}>
                                                    <Text style={globalStyles.body}>{p}</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Course Dropdown */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[globalStyles.body, { marginBottom: 8 }]}>Course</Text>
                            <Pressable onPress={() => setShowCourseDropdown(!showCourseDropdown)}>
                                <ShadowBox contentBackgroundColor={getCourseById(courseId)?.color || '#fff'}>
                                    <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>
                                            {getCourseById(courseId)?.course_number || 'Select course'}
                                        </Text>
                                        <Image source={SYSTEM_ICONS.sort} style={{ width: 15, height: 15 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>
                            {showCourseDropdown && (
                                <View style={{ marginTop: 5, gap: 5 }}>
                                    {courses.map((c) => (
                                        <Pressable
                                            key={c.id}
                                            onPress={() => {
                                                setCourseId(c.id!);
                                                setShowCourseDropdown(false);
                                            }}
                                        >
                                            <ShadowBox contentBackgroundColor={c.color}>
                                                <View style={{ padding: 10 }}>
                                                    <Text style={globalStyles.body}>{c.course_number}</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Due Date */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[globalStyles.body, { marginBottom: 8 }]}>Due Date</Text>
                            <ShadowBox contentBackgroundColor="#fff">
                                <Pressable onPress={() => setShowDatePicker(!showDatePicker)}>
                                    <View style={{ padding: 12 }}>
                                        <Text style={globalStyles.body}>
                                            {dueDate
                                                ? formatDateForForm(dueDate)
                                                : 'Select date'}
                                        </Text>
                                    </View>
                                </Pressable>
                            </ShadowBox>

                            {showDatePicker && dueDate && (
                                <SimpleCalendar
                                    selectedDate={dueDate}
                                    onSelectDate={(date) => {
                                        setDueDate(date);
                                        setShowDatePicker(false);
                                    }}
                                />
                            )}
                        </View>

                        {/* Due Time */}
                        <View style={{ marginBottom: 30 }}>
                            <Text style={[globalStyles.body, { marginBottom: 8 }]}>Due Time (Optional)</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
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
                        </View>

                        <Pressable
                            onPress={handleDelete}
                            style={{ flex: 1, margin: 10 }}
                        >
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete}>
                                <View style={{ paddingVertical: 6, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Delete</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </ScrollView>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable onPress={onClose} style={{ flex: 1 }}>
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
                            onPress={handleSave}
                            style={{ flex: 1 }}
                            disabled={isSaving}
                        >
                            <ShadowBox
                                contentBackgroundColor={isSaving ? '#ccc' : BUTTON_COLORS.Done
                                }
                                borderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving
                                            ? 'Saving...'
                                            : 'Save'}
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