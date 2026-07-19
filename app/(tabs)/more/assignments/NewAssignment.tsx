import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
// gesture-handler scroll + root view so scrolling works inside the course modal
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { ASSIGNMENT_PROGRESS, ASSIGNMENT_TYPE_COLORS, ASSIGNMENT_TYPES, PROGRESS_COLORS } from '@/constants';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import { Course } from '@/types/Course';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel } from '@/ui/TimeWheel';
import { formatLocalDate, parseLocalDate } from '@/utils/dateUtils';

export default function NewAssignment() {
    const { user } = useAuth();
    const router = useRouter();

    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const [name, setName] = useState('');
    const [type, setType] = useState('Assignment');
    const [subject, setSubject] = useState('');
    const [progress, setProgress] = useState('Not started');
    const [dueDate, setDueDate] = useState(formatLocalDate(new Date())); // Initialize to today
    const [hasDueTime, setHasDueTime] = useState(false);

    const [courseDropdown, showCourseDropdown] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);

    // time picker state
    const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const MINUTES = ['00', '15', '30', '45'];
    const MERIDIEM = ['AM', 'PM'];

    const [hour, setHour] = useState('11');
    const [minute, setMinute] = useState('59');
    const [meridiem, setMeridiem] = useState('PM');

    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // load courses from Supabase
    const loadCourses = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('courses')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading courses:', error);
            } else {
                setCourses(data || []);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCourses();
        }, [user])
    );

    const handleSave = async () => {
        if (!name) {
            Alert.alert('Missing Info', 'Please enter an assignment name');
            return;
        }

        if (!selectedCourse) {
            Alert.alert('Missing Info', 'Please select a course');
            return;
        }

        if (!type) {
            Alert.alert('Missing Info', 'Please select an assignment type');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to save assignments');
            return;
        }

        setIsSaving(true);

        try {
            const dueTimeString = hasDueTime ? `${hour}:${minute} ${meridiem}` : null;

            const { data, error } = await supabase
                .from('assignments')
                .insert([
                    {
                        user_id: user.id,
                        course_id: selectedCourse.id,
                        name: name,
                        type: type,
                        subject: subject || null,
                        progress: progress,
                        due_date: dueDate || null,
                        due_time: dueTimeString,
                    }
                ])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                Alert.alert('Error', 'Failed to save assignment. Please try again.');
            } else {
                console.log('Assignment saved successfully:', data);
                router.back();
            }

        } catch (error) {
            console.error('Error saving assignment:', error);
            Alert.alert('Error', 'Failed to save assignment. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLinearGradient variant={"assignments.backgroundAssignment"}>
            <PageContainer>
                <PageHeader title="New Assignment" showBackButton />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                >
                    {/* main card — same outline as the new habit page */}
                    <View style={{
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderRadius: 20,
                        padding: 30,
                    }}>
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            ASSIGNMENT NAME
                        </Text>

                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.assignments.primary[1],
                                marginBottom: 15,
                            }]}
                            placeholder='Chapter 5 Homework'
                            returnKeyType="next"
                            value={name}
                            onChangeText={setName}
                            cursorColor={PAGE.assignments.primary[1]}
                            selectionColor={PAGE.assignments.primary[1]}
                            autoFocus
                        />

                        {/* COURSE DROPDOWN */}
                        {/* <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            COURSE
                        </Text> */}


                        <ShadowBox
                            contentBackgroundColor={selectedCourse ? PAGE.assignments.primary[1] : '#fff'}
                            style={{ marginBottom: 20 }}
                        >
                            <Pressable
                                onPress={() => showCourseDropdown(true)}
                                style={{ paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center' }}
                            >
                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                    style={globalStyles.body}
                                >
                                    {selectedCourse
                                        ? `${selectedCourse.course_number}`
                                        : 'Select course'}
                                </Text>
                            </Pressable>
                        </ShadowBox>

                        {/* TYPE DROPDOWN */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            TYPE
                        </Text>

                        <View style={{ marginBottom: 20, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {ASSIGNMENT_TYPES.map((assignmentType) => (
                                <Pressable
                                    key={assignmentType}
                                    onPress={() => {
                                        setType(assignmentType);
                                    }}
                                >
                                    <ShadowBox
                                        contentBackgroundColor={
                                            type === assignmentType
                                                ? ASSIGNMENT_TYPE_COLORS[assignmentType]
                                                : '#fff'
                                        }
                                        contentBorderColor={
                                            type === assignmentType
                                                ? '#000'
                                                : ASSIGNMENT_TYPE_COLORS[assignmentType]
                                        }
                                        shadowColor={
                                            type === assignmentType
                                                ? '#000'
                                                : ASSIGNMENT_TYPE_COLORS[assignmentType]
                                        }
                                        shadowBorderColor={
                                            type === assignmentType
                                                ? '#000'
                                                : ASSIGNMENT_TYPE_COLORS[assignmentType]
                                        }
                                    >
                                        <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                            <Text style={globalStyles.body1}>{assignmentType}</Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            ))}
                        </View>


                        {/* PROGRESS DROPDOWN */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            PROGRESS
                        </Text>

                        <View style={{ marginBottom: 20, gap: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
                            {ASSIGNMENT_PROGRESS.map((progressOption) => (
                                <Pressable
                                    key={progressOption}
                                    onPress={() => {
                                        setProgress(progressOption);
                                    }}
                                >
                                    <ShadowBox
                                        contentBackgroundColor={
                                            progress === progressOption
                                                ? PROGRESS_COLORS[progressOption]
                                                : '#fff'
                                        }
                                        contentBorderColor={
                                            progress === progressOption
                                                ? '#000'
                                                : PROGRESS_COLORS[progressOption]
                                        }
                                        shadowColor={
                                            progress === progressOption
                                                ? '#000'
                                                : PROGRESS_COLORS[progressOption]
                                        }
                                        shadowBorderColor={
                                            progress === progressOption
                                                ? '#000'
                                                : PROGRESS_COLORS[progressOption]
                                        }
                                    >
                                        <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                            <Text style={globalStyles.body1}>{progressOption}</Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            ))}
                        </View>


                        {/* DUE DATE */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                            DUE DATE
                        </Text>

                        <View style={{}}>

                            {/* Simple Calendar Dropdown */}
                            <View style={{
                                margin: 2, marginBottom: 15
                            }}>
                                <ShadowBox>
                                    <SimpleCalendar
                                        selectedDate={dueDate ? parseLocalDate(dueDate) : new Date()}
                                        onSelectDate={(date) => {
                                            const dateString = formatLocalDate(date);
                                            setDueDate(dateString);
                                            setShowCalendar(false);
                                        }}
                                        selectedDateColor={PAGE.assignments.primary[0]}
                                    />
                                </ShadowBox>
                            </View>

                        </View>

                        {/* DUE TIME TOGGLE */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={globalStyles.body1}>Add due time?</Text>
                            <Switch
                                value={hasDueTime}
                                onValueChange={setHasDueTime}
                                trackColor={{ false: '#ddd', true: PAGE.assignments.primary[1] }}
                                thumbColor="#fff"
                            />
                        </View>

                        {/* TIME PICKER */}
                        {hasDueTime && (
                            <View style={{ marginBottom: 15 }}>
                                <ShadowBox
                                    contentBackgroundColor={PAGE.assignments.primary[2]}
                                    style={{ width: 120, alignSelf: 'center', marginBottom: 10 }}>
                                    <Pressable
                                        onPress={() => setShowTimePicker(prev => !prev)}
                                        style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>
                                            {hour}:{minute} {meridiem}
                                        </Text>
                                    </Pressable>
                                </ShadowBox>

                                {showTimePicker && (
                                    <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 5 }}>
                                        <TimeWheel data={HOURS} selected={hour} onSelect={setHour} />
                                        <Text style={{ fontSize: 24, alignSelf: 'center' }}>:</Text>
                                        <TimeWheel data={MINUTES} selected={minute} onSelect={setMinute} />
                                        <TimeWheel data={MERIDIEM} selected={meridiem} onSelect={setMeridiem} />
                                    </View>
                                )}
                            </View>
                        )}
                        {/* cancel / save — standard page button dimensions */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, marginBottom: 20, justifyContent: 'center' }}>
                            <Pressable onPress={() => router.back()} style={{ flex: 1, maxWidth: 100 }}>
                                <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                                    <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>Cancel</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            <Pressable
                                onPress={handleSave}
                                disabled={isSaving}
                                style={{ flex: 1, maxWidth: 100, opacity: isSaving ? 0.6 : 1 }}
                            >
                                <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={20}>
                                    <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>

                {/* course picker modal — tap a course to select, tap outside to dismiss */}
                <Modal
                    visible={courseDropdown}
                    transparent
                    animationType="none"
                    onRequestClose={() => showCourseDropdown(false)}
                >
                    <GestureHandlerRootView style={{ flex: 1 }}>
                        <Pressable style={pickerModal.overlay} onPress={() => showCourseDropdown(false)}>
                            <Pressable style={pickerModal.card} onPress={(e) => e.stopPropagation()}>

                                <View style={{ marginTop: 20 }}>
                                    <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 16 }]}>
                                        Select Course
                                    </Text>
                                </View>

                                <GHScrollView
                                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {courses.map((course) => {
                                        const isSelected = selectedCourse?.id === course.id;
                                        return (
                                            <Pressable
                                                key={course.id}
                                                onPress={() => {
                                                    setSelectedCourse(course);
                                                    showCourseDropdown(false);
                                                }}
                                                style={{ marginBottom: 10 }}
                                            >
                                                <ShadowBox
                                                    contentBackgroundColor={isSelected ? PAGE.assignments.primary[1] : '#fff'}
                                                    contentBorderColor={isSelected ? '#000' : PAGE.assignments.primary[1]}
                                                    shadowBorderColor={isSelected ? '#000' : PAGE.assignments.primary[1]}
                                                    shadowColor={isSelected ? '#000' : PAGE.assignments.primary[1]}
                                                >
                                                    <View style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
                                                        <Text numberOfLines={1} ellipsizeMode="tail" style={globalStyles.body1}>
                                                            {course.course_number} - {course.course_name}
                                                        </Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        );
                                    })}
                                </GHScrollView>

                            </Pressable>
                        </Pressable>
                    </GestureHandlerRootView>
                </Modal>
            </PageContainer>
        </AppLinearGradient>
    );
}

const pickerModal = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: PAGE.assignments.primary[1],
        maxHeight: '60%',
        width: '90%',
        alignSelf: 'center',
    },
});