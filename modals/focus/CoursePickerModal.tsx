import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { PAGE, BUTTON_COLORS } from '@/constants/colors';
import ShadowBox from '@/ui/ShadowBox';
import { globalStyles } from '@/styles';
import { formatDisplayDate, formatDisplayDateString } from '@/utils/dateUtils';

type CourseUI = {
  id: string;
  name: string;
  number?: string;
  color: string;
};

type UpcomingAssignment = {
  id: string;
  name: string;
  due_date: string | null;
  due_time: string | null;
  type: string | null;
  progress: string | null;
};

function rowToCourseUI(row: any): CourseUI {
  return {
    id: row.id,
    name: row.course_name ?? row.name ?? 'Untitled Course',
    number: row.course_number ?? undefined,
    color: row.color ?? '#9576FF',
  };
}

// Assumes due_date stored as 'YYYY-MM-DD' (which your app already does)
function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function fetchCourses(): Promise<CourseUI[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, course_name, course_number, color, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(rowToCourseUI);
}

async function fetchUpcomingAssignments(courseId: string): Promise<UpcomingAssignment[]> {
  const today = todayYYYYMMDD();

  const { data, error } = await supabase
    .from('assignments')
    .select('id, name, due_date, due_time, type, progress')
    .eq('course_id', courseId)
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .order('due_time', { ascending: true })
    .limit(6);

  if (error) throw error;
  return (data ?? []) as UpcomingAssignment[];
}

export default function CoursePickerModal({
  visible,
  selectedCourse,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedCourse: CourseUI | null;
  onClose: () => void;
  onSelect: (course: CourseUI | null) => void;
}) {
  const [courses, setCourses] = useState<CourseUI[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const [detailsCourse, setDetailsCourse] = useState<CourseUI | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingAssignment[]>([]);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);

  useEffect(() => {
    if (!visible) return;

    (async () => {
      setLoadingCourses(true);
      setCoursesError(null);
      try {
        const items = await fetchCourses();
        setCourses(items);
      } catch (e: any) {
        console.error('Error loading courses:', e);
        setCoursesError(e?.message ?? 'Failed to load courses');
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    })();
  }, [visible]);

  const openCourseDetails = async (course: CourseUI) => {
    setDetailsCourse(course);
    setShowDetails(true);
    setLoadingUpcoming(true);
    setUpcoming([]);

    try {
      const items = await fetchUpcomingAssignments(course.id);
      setUpcoming(items);
    } catch (e) {
      console.error('Error loading upcoming assignments:', e);
      setUpcoming([]);
    } finally {
      setLoadingUpcoming(false);
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setDetailsCourse(null);
    setUpcoming([]);
  };

  const titleFor = useMemo(() => {
    if (!detailsCourse) return '';
    return detailsCourse.number ? `${detailsCourse.number} • ${detailsCourse.name}` : detailsCourse.name;
  }, [detailsCourse]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <TouchableWithoutFeedback>
            <View
              style={{
                width: '85%',
                maxHeight: '70%',
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 20,
                borderWidth: 1.5,
                borderColor: PAGE.focus.primary[0],
              }}
            >
              <Text style={[globalStyles.h3, { marginBottom: 16, textAlign: 'center' }]}>
                Select Course
              </Text>

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <Pressable onPress={() => onSelect(null)} style={{ marginBottom: 10 }}>
                  <ShadowBox contentBackgroundColor={!selectedCourse ? PAGE.focus.primary[0] : '#fff'}>
                    <Text style={[globalStyles.body, { padding: 12, textAlign: 'center' }]}>
                      None
                    </Text>
                  </ShadowBox>
                </Pressable>

                {loadingCourses ? (
                  <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                    <ActivityIndicator />
                  </View>
                ) : coursesError ? (
                  <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.7, paddingVertical: 10 }]}>
                    {coursesError}
                  </Text>
                ) : courses.length === 0 ? (
                  <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, paddingVertical: 20 }]}>
                    No courses found. Create some in Assignments first!
                  </Text>
                ) : (
                  courses.map((course) => {
                    const isSelected = selectedCourse?.id === course.id;
                    return (
                      <View key={course.id} style={{ marginBottom: 10 }}>
                        <Pressable onPress={() => onSelect(course)}>
                          <ShadowBox contentBackgroundColor={isSelected ? course.color : '#fff'}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
                              <View
                                style={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: 8,
                                  backgroundColor: course.color,
                                  borderWidth: 1,
                                  borderColor: '#000',
                                }}
                              />
                              <Text style={globalStyles.body} numberOfLines={1}>
                                {course.number ? `${course.number} - ` : ''}{course.name}
                              </Text>
                            </View>
                          </ShadowBox>
                        </Pressable>

                        {/* Tap text to see upcoming assignments */}
                        <Pressable onPress={() => openCourseDetails(course)} style={{ marginTop: 6 }}>
                          <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.6 }]}>
                            View upcoming assignments
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={{ marginTop: 14 }}>
                <Pressable onPress={onClose}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                    <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                      Close
                    </Text>
                  </ShadowBox>
                </Pressable>
              </View>

              {/* DETAILS MODAL (nested) */}
              <Modal visible={showDetails} transparent animationType="fade" onRequestClose={closeDetails}>
                <TouchableWithoutFeedback onPress={closeDetails}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <TouchableWithoutFeedback>
                      <View
                        style={{
                          width: '85%',
                          maxHeight: '70%',
                          backgroundColor: '#fff',
                          borderRadius: 20,
                          padding: 16,
                          borderWidth: 1.5,
                          borderColor: PAGE.focus.primary[0],
                        }}
                      >
                        <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 8 }]}>
                          {titleFor}
                        </Text>

                        <Text style={[globalStyles.label, { textAlign: 'center', opacity: 0.7, marginBottom: 10 }]}>
                          Upcoming Assignments
                        </Text>

                        {loadingUpcoming ? (
                          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                            <ActivityIndicator />
                          </View>
                        ) : upcoming.length === 0 ? (
                          <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, paddingVertical: 12 }]}>
                            No upcoming assignments 🎉
                          </Text>
                        ) : (
                          <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                            {upcoming.map((a) => (
                              <View key={a.id} style={{ marginBottom: 10 }}>
                                <ShadowBox contentBorderRadius={14} shadowBorderRadius={14}>
                                  <View style={{ padding: 12 }}>
                                    <Text style={globalStyles.body} numberOfLines={2}>
                                      {a.name}
                                    </Text>
                                    <Text style={[globalStyles.label, { opacity: 0.7, marginTop: 4 }]}>
                                      {formatDisplayDateString(a.due_date)}{a.due_time ? ` • ${a.due_time}` : ''}{a.type ? ` • ${a.type}` : ''}
                                    </Text>
                                  </View>
                                </ShadowBox>
                              </View>
                            ))}
                          </ScrollView>
                        )}

                        <Pressable onPress={closeDetails} style={{ marginTop: 12 }}>
                          <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                            <Text style={[globalStyles.body, { textAlign: 'center', padding: 8 }]}>
                              Close
                            </Text>
                          </ShadowBox>
                        </Pressable>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}