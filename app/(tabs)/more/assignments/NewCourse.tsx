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
                <PageHeader title="Create a Course" showBackButton />

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
                                            contentBackgroundColor={color}
                                            contentBorderWidth={1}
                                            contentBorderColor={isSelected ? '#000' : color}
                                            shadowOffset={{ x: 2, y: 2 }}

                                        >
                                            <View style={{ width: 30, height: 30 }} />
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
                            <Text style={globalStyles.body}>Do you have a set schedule?</Text>

                            <Switch
                                trackColor={{ true: PAGE.assignments.primary[0] }}
                                value={hasSchedule}
                                onValueChange={setHasSchedule}
                            />
                        </View>

                        {hasSchedule && (
                            <View style={{ marginTop: 10 }}>
                                <Text style={[globalStyles.label, { marginBottom: 8 }]}>
                                    SELECT DAYS
                                </Text>

                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
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
                                                style={{ width: 50 }}
                                            >
                                                <ShadowBox
                                                    contentBackgroundColor={
                                                        selected ? PAGE.assignments.primary[0] : '#fff'
                                                    }
                                                >
                                                    <Text
                                                        style={[
                                                            globalStyles.body,
                                                            {
                                                                textAlign: 'center',
                                                                padding: 5,
                                                            },
                                                        ]}
                                                    >
                                                        {day}
                                                    </Text>
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
                                    style={{
                                        width: 100,
                                        marginVertical: 10,
                                    }}>
                                    <Pressable
                                        onPress={() => showHourTimeWheel(prev => !prev)}
                                        style={{
                                            padding: 5,
                                            alignItems: 'center',
                                        }}>
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
                                    style={{
                                        width: 100,
                                        marginVertical: 10,
                                    }}>
                                    <Pressable
                                        onPress={() => showMinTimeWheel(prev => !prev)}
                                        style={{
                                            padding: 5,
                                            alignItems: 'center',
                                        }}>
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
                    </ScrollView>

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
        </AppLinearGradient>
    );
}