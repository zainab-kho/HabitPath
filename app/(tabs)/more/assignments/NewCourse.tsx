import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';

import { COURSE_COLORS } from '@/constants';
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { TimeWheel } from '@/ui/TimeWheel';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

export default function NewCourse() {
    const { user } = useAuth();
    const router = useRouter();

    const [courseName, setCourseName] = useState('');
    const [courseNumber, setCourseNumber] = useState('');
    const [instructor, setInstructor] = useState('');
    const [hasSchedule, setHasSchedule] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string>(COURSE_COLORS[0]);

    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const [selectedDays, setSelectedDays] = useState<string[]>([])

    // time picker state
    const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const MERIDIEM = ['AM', 'PM'];

    const [startHour, setStartHour] = useState('9');
    const [startMinute, setStartMinute] = useState('00');
    const [startMeridem, setStartMeridem] = useState('AM');

    const [endHour, setEndHour] = useState('10');
    const [endMinute, setEndMinute] = useState('15');
    const [endMeridem, setEndMeridem] = useState('AM');

    const [hourTimeWheel, showHourTimeWheel] = useState(false)
    const [minTimeWheel, showMinTimeWheel] = useState(false)

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!courseName && !courseNumber) {
            Alert.alert('Missing Info', 'Please enter both course name and number');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to save courses');
            return;
        }

        setIsSaving(true);

        try {
            const startTime = hasSchedule
                ? `${startHour}:${startMinute} ${startMeridem}`
                : null;
            const endTime = hasSchedule
                ? `${endHour}:${endMinute} ${endMeridem}`
                : null;

            const { data, error } = await supabase
                .from('courses')
                .insert([
                    {
                        user_id: user.id,
                        course_number: courseNumber,
                        course_name: courseName,
                        instructor: instructor || null,
                        has_schedule: hasSchedule,
                        schedule_days: hasSchedule ? selectedDays : null,
                        schedule_start_time: startTime,
                        schedule_end_time: endTime,
                        color: selectedColor,
                    }
                ])
                .select()
                .single();

            if (error) {
                console.error('Supabase error:', error);
                Alert.alert('Error', 'Failed to save course. Please try again.');
            } else {
                console.log('Course saved successfully:', data);
                router.back();
            }

        } catch (error) {
            console.error('Error saving course:', error);
            Alert.alert('Error', 'Failed to save course. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLinearGradient variant={"assignments.background"}>
            <PageContainer>
                <PageHeader title="New Course" showBackButton />

                <View style={{
                    flex: 1,
                    borderRadius: 20,
                    marginHorizontal: 30,
                    marginBottom: 50,
                }}>
                    <ScrollView style={{
                        paddingHorizontal: 2,
                    }}>
                        <Text style={[globalStyles.label, {
                            marginBottom: 10,
                        }]}>COURSE NAME</Text>

                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.assignments.primary[0],
                                marginBottom: 15,
                            }]}
                            placeholder='Software Engineering'
                            returnKeyType="next"
                            value={courseName}
                            onChangeText={setCourseName}
                            cursorColor={PAGE.assignments.primary[1]}
                            selectionColor={PAGE.assignments.primary[1]}
                        />

                        <Text style={[globalStyles.label, {
                            marginBottom: 10,
                        }]}>COURSE NUMBER</Text>

                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.assignments.primary[0],
                                marginBottom: 15,
                            }]}
                            placeholder='CSCI4000'
                            returnKeyType="next"
                            value={courseNumber}
                            onChangeText={setCourseNumber}
                            cursorColor={PAGE.assignments.primary[1]}
                            selectionColor={PAGE.assignments.primary[1]}
                        />

                        <Text style={[globalStyles.label, {
                            marginBottom: 10,
                        }]}>INSTRUCTOR</Text>

                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.assignments.primary[0],
                                marginBottom: 15,
                            }]}
                            placeholder='Dr. Reynolds'
                            returnKeyType="next"
                            value={instructor}
                            onChangeText={setInstructor}
                            cursorColor={PAGE.assignments.primary[1]}
                            selectionColor={PAGE.assignments.primary[1]}
                        />

                        <Text style={[globalStyles.label, {
                            marginBottom: 10,
                            marginTop: 10,
                        }]}>COLOR</Text>

                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginBottom: 15
                        }}>
                            {COURSE_COLORS.map(color => {
                                const isSelected = selectedColor === color;

                                return (
                                    <Pressable
                                        key={color}
                                        onPress={() => setSelectedColor(color)}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={isSelected ? color : '#fff'}
                                            contentBorderColor={isSelected ? '#000' : color}
                                            contentBorderWidth={1}
                                            contentBorderRadius={18}
                                            shadowBorderColor={isSelected ? '#000' : color}
                                            shadowColor={isSelected ? '#000' : color}
                                            shadowBorderRadius={18}
                                        >
                                            <View style={{ width: 25, height: 25 }} />
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={[globalStyles.label, {
                            marginBottom: 10,
                        }]}>SCHEDULE</Text>

                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: 10,
                            }}
                        >
                            <Text style={globalStyles.body1}>Do you have a set schedule?</Text>

                            <Switch
                                value={hasSchedule}
                                onValueChange={setHasSchedule}
                                trackColor={{ false: '#ddd', true: PAGE.assignments.primary[0] }}
                                thumbColor="#fff"
                            />
                        </View>

                        {hasSchedule && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                    SELECT DAYS
                                </Text>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {DAYS.map(day => {
                                        const selected = selectedDays.includes(day);

                                        return (
                                            <Pressable
                                                key={day}
                                                onPress={() => {
                                                    setSelectedDays(prev =>
                                                        selected
                                                            ? prev.filter(d => d !== day)
                                                            : [...prev, day]
                                                    );
                                                }}
                                            >
                                                <ShadowBox
                                                    contentBackgroundColor={selected ? PAGE.assignments.primary[0] : '#fff'}
                                                    contentBorderColor={selected ? '#000' : PAGE.assignments.primary[0]}
                                                    shadowBorderColor={selected ? '#000' : PAGE.assignments.primary[0]}
                                                    shadowColor={selected ? '#000' : PAGE.assignments.primary[0]}
                                                >
                                                    <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                        <Text style={globalStyles.body1}>{day}</Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        );
                                    })}
                                </View>

                                <Text style={[globalStyles.label, { marginTop: 15 }]}>
                                    START TIME
                                </Text>

                                <ShadowBox
                                    contentBackgroundColor={PAGE.assignments.primary[1]}
                                    style={{ width: 120, marginVertical: 10 }}>
                                    <Pressable
                                        onPress={() => showHourTimeWheel(prev => !prev)}
                                        style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>{startHour}:{startMinute} {startMeridem}</Text>
                                    </Pressable>
                                </ShadowBox>

                                {hourTimeWheel && (
                                    <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                                        <TimeWheel data={HOURS} selected={startHour} onSelect={setStartHour} />
                                        <Text>:</Text>
                                        <TimeWheel data={MINUTES} selected={startMinute} onSelect={setStartMinute} />
                                        <TimeWheel data={MERIDIEM} selected={startMeridem} onSelect={setStartMeridem} />
                                    </View>
                                )}


                                <Text style={[globalStyles.label, { marginTop: 15 }]}>
                                    END TIME
                                </Text>

                                <ShadowBox
                                    contentBackgroundColor={PAGE.assignments.primary[1]}
                                    style={{ width: 120, marginVertical: 10 }}>
                                    <Pressable
                                        onPress={() => showMinTimeWheel(prev => !prev)}
                                        style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>{endHour}:{endMinute} {endMeridem}</Text>
                                    </Pressable>
                                </ShadowBox>

                                {minTimeWheel && (
                                    <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                                        <TimeWheel data={HOURS} selected={endHour} onSelect={setEndHour} />
                                        <Text>:</Text>
                                        <TimeWheel data={MINUTES} selected={endMinute} onSelect={setEndMinute} />
                                        <TimeWheel data={MERIDIEM} selected={endMeridem} onSelect={setEndMeridem} />
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
                    </ScrollView>
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}