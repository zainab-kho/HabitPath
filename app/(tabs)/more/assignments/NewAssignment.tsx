import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

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

                <View style={{
                    flex: 1,
                    borderRadius: 20,
                    marginHorizontal: 30,
                    marginBottom: 50,
                }}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{ paddingHorizontal: 2 }}>
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

                        {courses.length === 0 ? (
                            <>
                                <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, marginBottom: 10 }]}>
                                    No courses yet. Create one first!
                                </Text>

                                <Pressable
                                    onPress={() => {
                                        router.push('/(tabs)/more/assignments/NewCourse')
                                    }}
                                >
                                <ShadowBox contentBackgroundColor={PAGE.assignments.primary[0]}>
                                    <View style={{ padding: 15 }}>
                                        <Text style={globalStyles.body}>Add New Course</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                    </>
                    ) : (
                    <View style={{ position: 'relative', zIndex: 10 }}>
                        <ShadowBox
                            contentBackgroundColor={selectedCourse ? PAGE.assignments.primary[1] : '#fff'}
                            style={{ marginBottom: 10, width: '100%', alignSelf: 'center' }}
                        >
                            <Pressable
                                onPress={() => showCourseDropdown(prev => !prev)}
                                style={{ padding: 8, alignItems: 'center' }}
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

                        {courseDropdown && (
                            <View style={{
                                position: 'absolute',
                                top: 50,
                                left: '15%',
                                right: '15%',
                                zIndex: 1000,
                            }}>
                                <ShadowBox>
                                    <View style={{ gap: 10, padding: 10, maxHeight: 200 }}>
                                        <ScrollView showsVerticalScrollIndicator={false}>
                                            {courses.map((course) => (
                                                <Pressable
                                                    key={course.id}
                                                    onPress={() => {
                                                        setSelectedCourse(course);
                                                        showCourseDropdown(false);
                                                    }}
                                                    style={{ marginBottom: 10 }}
                                                >
                                                    <Text
                                                        numberOfLines={1}
                                                        ellipsizeMode="tail"
                                                        style={globalStyles.body2}
                                                    >
                                                        {course.course_number} - {course.course_name}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </ShadowBox>
                            </View>
                        )}
                    </View>
                        )}

                    {/* TYPE DROPDOWN */}
                    <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                        TYPE
                    </Text>

                    <View style={{ marginBottom: 15, gap: 5, flexDirection: 'row', flexWrap: 'wrap' }}>
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
                                    <Text style={[globalStyles.body2, { padding: 8 }]}>
                                        {assignmentType}
                                    </Text>
                                </ShadowBox>
                            </Pressable>
                        ))}
                    </View>


                    {/* PROGRESS DROPDOWN */}
                    <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                        PROGRESS
                    </Text>

                    <View style={{ marginBottom: 15, gap: 5, flexDirection: 'row', flexWrap: 'wrap' }}>
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
                                    <Text style={[globalStyles.body2, { padding: 8 }]}>
                                        {progressOption}
                                    </Text>
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
                        <Text style={globalStyles.body}>Add due time?</Text>
                        <Switch
                            trackColor={{ true: PAGE.assignments.primary[1] }}
                            value={hasDueTime}
                            onValueChange={setHasDueTime}
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
                                    style={{ padding: 8, alignItems: 'center' }}>
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
                </ScrollView>

                {/* SAVE BUTTON */}
                <ShadowBox
                    shadowBorderRadius={20}
                    contentBackgroundColor={BUTTON_COLORS.Done}
                    style={{
                        width: 100,
                        alignSelf: 'center',
                        marginTop: 20,
                    }}>
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={{
                            alignItems: 'center',
                            margin: 6,
                        }}
                    >
                        <Text style={globalStyles.body}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Text>
                    </Pressable>
                </ShadowBox>
            </View>
        </PageContainer>
        </AppLinearGradient >
    );
}