// @/utils/assignmentFilters.ts
import { formatLocalDate } from '@/components/utils/dateUtils';
import { AssignmentWithCourse, DayPlanAssignment, WeekPlan } from '@/hooks/useAssignmentData';

/**
 * get assignments planned for today
 */
export function getTodayAssignments(
    assignments: AssignmentWithCourse[],
    dayPlanAssignments: DayPlanAssignment[]
) {
    const today = formatLocalDate(new Date());

    const assignmentIdsForToday = dayPlanAssignments
        .filter(dpa => dpa.planned_date === today)
        .map(dpa => dpa.assignment_id);

    return assignments.filter(a => assignmentIdsForToday.includes(a.id!));
}

/**
 * get assignments due (today + tomorrow + overdue) - stays until marked as Done
 */
export function getDueAssignments(assignments: AssignmentWithCourse[]) {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
        if (!a.due_date || a.progress === 'Done' ) return false;
        const dueDate = new Date(a.due_date);
        return dueDate <= twoDaysFromNow;
    });
}

/**
 * get assignments this week (next 7 days, excluding those already in "Due")
 */
export function getThisWeekAssignments(assignments: AssignmentWithCourse[]) {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
        if (!a.due_date || a.progress === 'Done') return false;
        const dueDate = new Date(a.due_date);
        return dueDate > twoDaysFromNow && dueDate <= next7Days;
    });
}

/**
 * get upcoming assignments (after next 7 days)
 */
export function getUpcomingAssignments(assignments: AssignmentWithCourse[]) {
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
        if (!a.due_date || a.progress === 'Done') return false;
        const dueDate = new Date(a.due_date);
        return dueDate > next7Days;
    });
}

/**
 * get assignments that are NOT already in any day plan
 */
export function getUnplannedAssignments(
    assignments: AssignmentWithCourse[],
    dayPlanAssignments: DayPlanAssignment[]
) {
    const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
    return assignments.filter(a => !plannedAssignmentIds.has(a.id!));
}

/**
 * check if week should be archived
 */
export function shouldArchiveWeek(
    weekPlan: WeekPlan,
    assignments: AssignmentWithCourse[]
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (weekPlan.weekRange.end < today) {
        const weekStart = weekPlan.weekRange.start.toISOString().split('T')[0];
        const weekEnd = weekPlan.weekRange.end.toISOString().split('T')[0];

        const weekAssignments = assignments.filter(a => {
            if (!a.due_date) return false;
            return a.due_date >= weekStart && a.due_date <= weekEnd;
        });

        const allDone = weekAssignments.every(a => a.progress === 'Done');
        return allDone || weekAssignments.length === 0;
    }

    return false;
}