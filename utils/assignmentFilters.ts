// @/utils/assignmentFilters.ts
import { AssignmentWithCourse, DayPlanAssignment, WeekPlan } from '@/hooks/useAssignmentData';
import { addDaysLocal, formatLocalDate, getTodayLocal, sortByDueDate } from '@/utils/dateUtils';

/**
 * get assignments planned for today
 */
export function getTodayAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[]
) {
  const today = getTodayLocal();

  const assignmentIdsForToday = dayPlanAssignments
    .filter(dpa => dpa.planned_date === today)
    .map(dpa => dpa.assignment_id);

  return assignments.filter(
    a => assignmentIdsForToday.includes(a.id!) && a.progress !== 'Done'
  );
}

/**
 * get assignments due (today + tomorrow + overdue) - stays until marked as Done
 */
export function getDueAssignments(assignments: AssignmentWithCourse[]) {
  console.log('getDueAssignments called with:', assignments.length, 'assignments');

  const d = new Date();
  d.setDate(d.getDate() + 2);
  d.setHours(0, 0, 0, 0);

  const date = formatLocalDate(d);
  console.log('Due cutoff date:', date);

  const dueCutoff = addDaysLocal(1);

  const filtered = assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date <= dueCutoff
  );

  console.log('Filtered to:', filtered.length, 'due assignments');
  console.log('Sample assignment:', filtered[0]);

  return sortByDueDate(filtered);
}

/**
 * get assignments this week (next 7 days, excluding due)
 */
export function getThisWeekAssignments(assignments: AssignmentWithCourse[]) {
  const dueCutoff = addDaysLocal(1);
  const weekCutoff = addDaysLocal(7);

  return assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date > dueCutoff && a.due_date <= weekCutoff
  );
}

/**
 * get upcoming assignments (after next 7 days)
 */
export function getUpcomingAssignments(assignments: AssignmentWithCourse[]) {
  const weekCutoff = addDaysLocal(7);

  return assignments.filter(
    a => a.due_date && a.progress !== 'Done' && a.due_date > weekCutoff
  );
}

/**
 * get assignments not in any day plan
 */
export function getUnplannedAssignments(
  assignments: AssignmentWithCourse[],
  dayPlanAssignments: DayPlanAssignment[]
) {
  const plannedAssignmentIds = new Set(dayPlanAssignments.map(dpa => dpa.assignment_id));
  return assignments.filter(a => !plannedAssignmentIds.has(a.id!));
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

  return assignments
    .filter(a => a.id && a.due_date && a.progress !== 'Done' && !plannedAssignmentIds.has(a.id!) && a.due_date <= weekCutoff)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
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
    .filter(a => a.id && a.progress !== 'Done' && plannedAssignmentIds.has(a.id!))
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  return {
    items: allAssigned.slice(0, itemsToShow),
    totalCount: allAssigned.length,
    hasMore: allAssigned.length > itemsToShow
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

  return assignments.filter(a => {
    if (!a.id) return false;
    if (a.progress === 'Done') return false;

    // "Will do later" only if due within 2 days
    if (a.progress === 'Will do later' && (!a.due_date || a.due_date > twoDays)) return false;

    // upcoming assignments (>7 days) only if showAll
    if (!showAll && a.due_date && a.due_date > weekCutoff) return false;

    // Not started / In progress always show
    return true;
  });
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