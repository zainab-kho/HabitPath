// @/hooks/useAssignmentData.ts
import { COURSE_COLORS } from '@/constants/';
import { supabase } from '@/lib/supabase';
import { Assignment } from '@/types/Assignment';
import { Course } from '@/types/Course';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

export type CourseWithColor = Course & { color?: string };
export type AssignmentWithCourse = Assignment & { course?: CourseWithColor };

export type WeekPlan = {
    id: string;
    weekRange: { start: Date; end: Date; label: string };
    selectedDays: string[];
    isCollapsed: boolean;
};

export type DayPlanAssignment = {
    id: string;
    assignment_id: string;
    planned_date: string;
};

export function useAssignmentData(userId?: string) {
    const [courses, setCourses] = useState<CourseWithColor[]>([]);
    const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([]);
    const [dayPlanAssignments, setDayPlanAssignments] = useState<DayPlanAssignment[]>([]);
    const [weekPlans, setWeekPlans] = useState<WeekPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            // Parallel loading for better performance
            const [coursesRes, assignmentsRes, weekPlansRes, dayPlansRes] = await Promise.all([
                supabase.from('courses').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
                // Order assignments by creation time (oldest first, newest at bottom)
                supabase.from('assignments').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
                supabase.from('week_plans').select('*').eq('user_id', userId).order('week_start', { ascending: true }),
                // Order day plan assignments by creation time (order they were added)
                supabase.from('day_plan_assignments').select('*').eq('user_id', userId).order('created_at', { ascending: true })
            ]);

            if (coursesRes.error) {
                console.error('Error loading courses:', coursesRes.error);
            } else {
                // Assign colors to courses that don't have one
                const coursesWithColors: CourseWithColor[] = (coursesRes.data || []).map((course) => {
                    if (!course.color) {
                        const uncoloredIndex = (coursesRes.data || [])
                            .filter((c: any) => !c.color)
                            .findIndex((c: any) => c.id === course.id);
                        return {
                            ...course,
                            color: COURSE_COLORS[uncoloredIndex % COURSE_COLORS.length]
                        };
                    }
                    return course;
                });
                setCourses(coursesWithColors);

                if (assignmentsRes.error) {
                    console.error('Error loading assignments:', assignmentsRes.error);
                } else {
                    const assignmentsWithCourses: AssignmentWithCourse[] = (assignmentsRes.data || []).map((assignment: any) => ({
                        ...assignment,
                        course: coursesWithColors.find(c => c.id === assignment.course_id)
                    }));
                    setAssignments(assignmentsWithCourses);
                }
            }

            if (weekPlansRes.error) {
                console.error('Error loading week plans:', weekPlansRes.error);
            } else {
                const loadedWeekPlans: WeekPlan[] = (weekPlansRes.data || []).map((plan: any) => ({
                    id: plan.id,
                    weekRange: {
                        start: new Date(plan.week_start),
                        end: new Date(plan.week_end),
                        label: plan.week_label
                    },
                    selectedDays: plan.selected_days,
                    isCollapsed: plan.is_collapsed ?? true
                }));
                setWeekPlans(loadedWeekPlans);
            }

            if (dayPlansRes.error) {
                console.error('Error loading day plan assignments:', dayPlansRes.error);
            } else {
                setDayPlanAssignments(dayPlansRes.data || []);
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    return {
        courses,
        setCourses,
        assignments,
        setAssignments,
        dayPlanAssignments,
        setDayPlanAssignments,
        weekPlans,
        setWeekPlans,
        loading,
        loadData
    };
}