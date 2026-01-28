// @/utils/assignmentFilters.ts
import {
  addDaysLocal,
  compareDateStrings,
  formatLocalDate,
  getTodayLocal
} from '@/components/utils/dateUtils';
import { AssignmentWithCourse, DayPlanAssignment, WeekPlan } from '@/hooks/useAssignmentData';

/**
 * sorts assignments by due date (oldest first), with no due date at the end
 */
export const sortByDueDate = <T extends { due_date?: string | null }>(
  assignments: T[]
): T[] => {
  return [...assignments].sort((a, b) => {
    // Assignments without due dates go to the end
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    
    // Sort by due date (oldest first)
    return compareDateStrings(a.due_date, b.due_date);
  });
};

/**
 * get assignments planned for today
 * sorted by the order they were added to the day plan (created_at if available)
 */
export function getTodayAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[]
) {
  const today = getTodayLocal();

  const todayPlans = dayPlanAssignments.filter(dpa => dpa.planned_date === today);
  
  // Sort by created_at if available, otherwise maintain original order
  const sortedPlans = [...todayPlans].sort((a, b) => {
    const aCreatedAt = (a as any).created_at;
    const bCreatedAt = (b as any).created_at;
    
    if (!aCreatedAt && !bCreatedAt) return 0;
    if (!aCreatedAt) return 1;
    if (!bCreatedAt) return -1;
    return aCreatedAt < bCreatedAt ? -1 : 1;
  });

  const assignmentIdsForToday = sortedPlans.map(dpa => dpa.assignment_id);

  // maintain the order from dayPlanAssignments
  return assignmentIdsForToday
    .map(id => assignments.find(a => a.id === id))
    .filter((a): a is AssignmentWithCourse => a !== undefined && a.progress !== 'Done');
}

/**
 * get assignments due (today + tomorrow + overdue) - stays until marked as Done
 */
export function getDueAssignments(assignments: AssignmentWithCourse[]) {
  const dueCutoff = addDaysLocal(2);

  const dueAssignments = assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date <= dueCutoff
  );

  return sortByDueDate(dueAssignments);
}

/**
 * get assignments this week (next 7 days, excluding due)
 */
export function getThisWeekAssignments(assignments: AssignmentWithCourse[]) {
  const dueCutoff = addDaysLocal(2);
  const weekCutoff = addDaysLocal(7);

  const thisWeekAssignments = assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date > dueCutoff && a.due_date <= weekCutoff
  );

  return sortByDueDate(thisWeekAssignments);
}

/**
 * get upcoming assignments (after next 7 days)
 */
export function getUpcomingAssignments(assignments: AssignmentWithCourse[]) {
  const weekCutoff = addDaysLocal(7);

  const upcomingAssignments = assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date > weekCutoff
  );

  return sortByDueDate(upcomingAssignments);
}

/**
 * get assignments not in any day plan
 */
export function getUnplannedAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[]
) {
  const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
  const unplannedAssignments = assignments.filter(a => !plannedAssignmentIds.has(a.id!));
  
  return sortByDueDate(unplannedAssignments);
}

/**
 * get "unassigned" assignments (not planned, due within 7 days)
 */
export function getUnassignedAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[]
) {
  const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
  const weekCutoff = addDaysLocal(7);

  const unassignedAssignments = assignments
    .filter(a => a.id && a.due_date && a.progress !== 'Done' && !plannedAssignmentIds.has(a.id!) && a.due_date <= weekCutoff);
    
  return sortByDueDate(unassignedAssignments);
}

/**
 * get assigned assignments
 */
export function getAssignedAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[],
  itemsToShow: number = 10
) {
  const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));

  const allAssigned = assignments
    .filter(a => a.id && a.progress !== 'Done' && plannedAssignmentIds.has(a.id!));

  const sorted = sortByDueDate(allAssigned);

  return {
    items: sorted.slice(0, itemsToShow),
    totalCount: sorted.length,
    hasMore: sorted.length > itemsToShow
  };
}

/**
 * get assignments available to add to a specific day's plan
 */
export function getAvailableAssignmentsForDayPlan(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[],
  targetDate: string,
  showAll: boolean = false
) {
  const twoDays = addDaysLocal(2);
  const weekCutoff = addDaysLocal(7);

  const availableAssignments = assignments.filter(a => {
    if (!a.id) return false;
    if (a.progress === 'Done') return false;

    // "Will do later" only if due within 2 days
    if (a.progress === 'Will do later' && (!a.due_date || a.due_date > twoDays)) return false;

    // upcoming assignments (>7 days) only if showAll
    if (!showAll && a.due_date && a.due_date > weekCutoff) return false;

    // Not started / In progress always show
    return true;
  });

  return sortByDueDate(availableAssignments);
}

/**
 * check if week should be archived
 */
export function shouldArchiveWeek(
  weekPlan: WeekPlan,
  assignments: AssignmentWithCourse[]
) {
  const today = getTodayLocal();
  const weekStart = formatLocalDate(weekPlan.weekRange.start);
  const weekEnd = formatLocalDate(weekPlan.weekRange.end);

  if (weekEnd < today) {
    const weekAssignments = assignments.filter(a => a.due_date && a.due_date >= weekStart && a.due_date <= weekEnd);
    return weekAssignments.length === 0 || weekAssignments.every(a => a.progress === 'Done');
  }

  return false;
}