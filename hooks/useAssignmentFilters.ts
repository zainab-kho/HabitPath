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
        if (!a.due_date || a.progress === 'Done') return false;
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
 * get assignments that are not already in any day plan
 * NOTE: This is kept for backward compatibility, but consider using 
 * getAvailableAssignmentsForDayPlan() for more nuanced filtering
 */
export function getUnplannedAssignments(
    assignments: AssignmentWithCourse[],
    dayPlanAssignments: DayPlanAssignment[]
) {
    const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
    return assignments.filter(a => !plannedAssignmentIds.has(a.id!));
}

/**
 * get assignments available to add to a specific day's plan
 * 
 * filtering Rules:
 * 1. never show "Done" assignments
 * 2. "Not started" assignments can be added to multiple days (shows even if already planned)
 * 3. "In progress" assignments can be added to multiple days (shows even if already planned)
 * 4. "Will do later" only shows if it's in the "Due" section (due within 2 days)
 * 5. Upcoming assignments (due 7+ days out) don't appear unless showAll is true
 * 
 * @param assignments - All assignments
 * @param dayPlanAssignments - All day plan assignments
 * @param targetDate - The date we're adding assignments to (format: YYYY-MM-DD)
 * @param showAll - When true (from "Show More"), shows upcoming assignments too
 */
export function getAvailableAssignmentsForDayPlan(
    assignments: AssignmentWithCourse[],
    dayPlanAssignments: DayPlanAssignment[],
    targetDate: string,
    showAll: boolean = false
) {
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    next7Days.setHours(23, 59, 59, 999);

    return assignments.filter(a => {
        if (!a.id) return false;

        // rule 1: never show Done
        if (a.progress === 'Done') return false;

        // rule 4: "Will do later" only shows if due within 2 days
        if (a.progress === 'Will do later') {
            if (!a.due_date) return false;
            const dueDate = new Date(a.due_date);
            return dueDate <= twoDaysFromNow;
        }

        // rule 5: Upcoming assignments (7+ days out) only show with "Show More"
        if (!showAll && a.due_date) {
            const dueDate = new Date(a.due_date);
            // If due more than 7 days away, don't show unless showAll is true
            if (dueDate > next7Days) return false;
        }

        // rules 2 & 3: "Not started" and "In progress" can be added to multiple days
        // they always show, regardless of whether they're already planned
        return true;
    });
}

/**
 * get "unassigned" assignments (assignments not in any day plan yet)
 * used for a separate "Unassigned Tasks" section in the modal
 * this helps users see what tasks still need to be scheduled
 */
export function getUnassignedAssignments(
    assignments: AssignmentWithCourse[],
    dayPlanAssignments: DayPlanAssignment[]
) {
    const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
    
    return assignments.filter(a => {
        if (!a.id) return false;
        // Never show Done
        if (a.progress === 'Done') return false;
        // Only show if not in any day plan
        return !plannedAssignmentIds.has(a.id);
    });
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