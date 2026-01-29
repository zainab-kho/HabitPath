// @/hooks/useAssignmentActions.ts
import { AssignmentWithCourse, DayPlanAssignment, WeekPlan } from '@/hooks/useAssignmentData';
import { supabase } from '@/lib/supabase';
import { formatLocalDate } from '@/utils/dateUtils';
import { useState } from 'react';
import { Alert } from 'react-native';

interface UseAssignmentActionsProps {
    userId?: string;
    setDayPlanAssignments: React.Dispatch<React.SetStateAction<DayPlanAssignment[]>>;
    setWeekPlans: React.Dispatch<React.SetStateAction<WeekPlan[]>>;
    setAssignments: React.Dispatch<React.SetStateAction<AssignmentWithCourse[]>>;
    loadData: () => Promise<void>;
}

export function useAssignmentActions({
    userId,
    setDayPlanAssignments,
    setWeekPlans,
    setAssignments,
    loadData
}: UseAssignmentActionsProps) {
    // pending deletes for batch operations
    const [pendingDayPlanDeletes, setPendingDayPlanDeletes] = useState<Array<{ assignmentId: string; plannedDate: string }>>([]);
    const [pendingWeekPlanDeletes, setPendingWeekPlanDeletes] = useState<WeekPlan[]>([]);
    const [pendingAssignmentDeletes, setPendingAssignmentDeletes] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // week plan actions
    const handleAddWeek = async (weekRange: { start: Date; end: Date; label: string }, selectedDays: string[]) => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('week_plans')
                .insert([{
                    user_id: userId,
                    week_start: weekRange.start.toISOString().split('T')[0],
                    week_end: weekRange.end.toISOString().split('T')[0],
                    week_label: weekRange.label,
                    selected_days: selectedDays,
                    is_collapsed: false
                }])
                .select()
                .single();

            if (error) {
                console.error('Error saving week plan:', error);
                Alert.alert('Error', 'Failed to save week plan');
            } else {
                const newWeekPlan: WeekPlan = {
                    id: data.id,
                    weekRange,
                    selectedDays,
                    isCollapsed: false
                };
                setWeekPlans(prev => [...prev, newWeekPlan]);
            }
        } catch (error) {
            console.error('Error adding week:', error);
        }
    };

    const toggleWeekCollapse = async (weekPlanId: string, weekPlans: WeekPlan[]) => {
        const weekPlan = weekPlans.find(w => w.id === weekPlanId);
        if (!weekPlan) return;

        const newCollapsedState = !weekPlan.isCollapsed;

        try {
            const { error } = await supabase
                .from('week_plans')
                .update({ is_collapsed: newCollapsedState })
                .eq('id', weekPlanId);

            if (error) {
                console.error('Error updating week plan:', error);
            } else {
                setWeekPlans(weekPlans.map(w =>
                    w.id === weekPlanId ? { ...w, isCollapsed: newCollapsedState } : w
                ));
            }
        } catch (error) {
            console.error('Error toggling collapse:', error);
        }
    };

    const removeWeekPlan = (weekPlanId: string, weekPlans: WeekPlan[]) => {
        const weekPlanToDelete = weekPlans.find(w => w.id === weekPlanId);
        if (weekPlanToDelete) {
            setPendingWeekPlanDeletes(prev => [...prev, weekPlanToDelete]);
        }
        setWeekPlans(prev => prev.filter(w => w.id !== weekPlanId));
    };

    // assignment Actions
    const handleAddAssignmentToDay = async (assignmentId: string, plannedDate: string) => {
        if (!userId) return;

        try {
            // check if this assignment is already planned for this specific date
            const { data: existing } = await supabase
                .from('day_plan_assignments')
                .select('id')
                .eq('assignment_id', assignmentId)
                .eq('planned_date', plannedDate)
                .maybeSingle();

            if (existing) {
                Alert.alert('Already Planned', 'This assignment is already planned for this date.');
                return;
            }

            // insert the new day plan assignment
            const { error } = await supabase
                .from('day_plan_assignments')
                .insert([{
                    user_id: userId,
                    assignment_id: assignmentId,
                    planned_date: plannedDate
                }]);

            if (error) {
                console.error('Error adding assignment to day plan:', error);
                throw error;
            } else {
                await loadData();
            }
        } catch (error) {
            console.error('Error adding assignment to day:', error);
            throw error;
        }
    };

    const deleteFromTodayFocus = (assignmentId: string) => {
        const today = formatLocalDate(new Date());
        setPendingDayPlanDeletes(prev => [...prev, { assignmentId, plannedDate: today }]);
        setDayPlanAssignments(prev =>
            prev.filter(dpa => !(dpa.assignment_id === assignmentId && dpa.planned_date === today))
        );
    };

    const deleteFromWeekPlan = (assignmentId: string, plannedDate: string) => {
        setPendingDayPlanDeletes(prev => [...prev, { assignmentId, plannedDate }]);
        setDayPlanAssignments(prev =>
            prev.filter(dpa => !(dpa.assignment_id === assignmentId && dpa.planned_date === plannedDate))
        );
    };

    const deleteAssignment = (assignmentId: string) => {
        Alert.alert(
            'Delete Assignment',
            'This will delete the assignment everywhere. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setPendingAssignmentDeletes(prev => [...prev, assignmentId]);
                        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
                        setDayPlanAssignments(prev => prev.filter(dpa => dpa.assignment_id !== assignmentId));
                    }
                }
            ]
        );
    };

    const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('assignments')
                .update({ progress: newStatus })
                .eq('id', assignmentId);

            if (error) throw error;
            await loadData();
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('Error', 'Failed to update status');
            throw error;
        }
    };

    // batch save/cancel
    const handleSave = async () => {
        setIsSaving(true);

        try {
            // execute all pending day plan deletes
            for (const { assignmentId, plannedDate } of pendingDayPlanDeletes) {
                const { error } = await supabase
                    .from('day_plan_assignments')
                    .delete()
                    .eq('assignment_id', assignmentId)
                    .eq('planned_date', plannedDate);

                if (error) throw error;
            }

            // execute all pending week plan deletes
            for (const weekPlan of pendingWeekPlanDeletes) {
                // delete all day_plan_assignments for dates in this week
                for (let i = 0; i < weekPlan.selectedDays.length; i++) {
                    const dayDate = new Date(weekPlan.weekRange.start);
                    dayDate.setDate(weekPlan.weekRange.start.getDate() + i);
                    const dateString = formatLocalDate(dayDate);

                    await supabase
                        .from('day_plan_assignments')
                        .delete()
                        .eq('planned_date', dateString);
                }

                // delete the week plan itself
                const { error } = await supabase
                    .from('week_plans')
                    .delete()
                    .eq('id', weekPlan.id);

                if (error) throw error;
            }

            // execute all pending assignment deletes
            for (const assignmentId of pendingAssignmentDeletes) {
                await supabase
                    .from('day_plan_assignments')
                    .delete()
                    .eq('assignment_id', assignmentId);

                const { error } = await supabase
                    .from('assignments')
                    .delete()
                    .eq('id', assignmentId);

                if (error) throw error;
            }

            // clear all pending deletes
            setPendingDayPlanDeletes([]);
            setPendingWeekPlanDeletes([]);
            setPendingAssignmentDeletes([]);

            await loadData();
            Alert.alert('Success', 'Changes saved successfully');
        } catch (error) {
            console.error('Error saving changes:', error);
            Alert.alert('Error', 'Failed to save some changes. Please try again.');
            await loadData();
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = async () => {
        setPendingDayPlanDeletes([]);
        setPendingWeekPlanDeletes([]);
        setPendingAssignmentDeletes([]);
        await loadData();
    };

    return {
        // week actions
        handleAddWeek,
        toggleWeekCollapse,
        removeWeekPlan,
        
        // assignment actions
        handleAddAssignmentToDay,
        deleteFromTodayFocus,
        deleteFromWeekPlan,
        deleteAssignment,
        updateAssignmentStatus,
        
        // batch operations
        handleSave,
        handleCancelEdit,
        isSaving,
        
        // pending deletes (for UI state)
        pendingDayPlanDeletes,
        pendingWeekPlanDeletes,
        pendingAssignmentDeletes
    };
}