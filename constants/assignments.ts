// @/constants/assignments.ts
// the choices on the new assignment page. the colors that go with them live in colors/assignments.ts

// what kind of work an assignment is. shown as buttons, in this order.
// each one needs a color in ASSIGNMENT_TYPE_COLORS (colors/assignments.ts)
export const ASSIGNMENT_TYPES = [
    'Assignment',
    'Discussion Post',
    'Essay',
    'Exam',
    'Homework',
    'Lecture',
    'Notes',
    'Program',
    'Project',
    'Review',
    'Quiz',
    'Study',
] as const;

// how far along an assignment is, from just added to handed in
export const ASSIGNMENT_PROGRESS = [
    'Not started',
    'In progress',
    'Will do later',
    'Finished (not submitted)',
    'Done',
] as const;
