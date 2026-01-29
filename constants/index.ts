// @/components/constants/index.ts

// habit page constants
export const TIME_OPTIONS = ['Wake Up', 'Morning', 'Anytime', 'Afternoon', 'Evening', 'Bed Time'] as const;
export const DATE_OPTIONS = ['Today', 'Tomorrow', 'Custom'] as const;
export const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Custom', 'None'] as const;
export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

// course + assignment constants
export const COURSE_COLORS = [
    '#ffc1c1',
    '#fff7c1',
    '#d1ffc1',
    '#c1fff0',
    '#c1cdff',
    '#ebc1ff',
    '#ffc1ea',
] as const;

export const ASSIGNMENT_TYPES = [
    'Assignment',
    'Discussion Post',
    'Essay',
    'Exam',
    'Excel',
    'Homework',
    'Lecture',
    'Notes',
    'Program',
    'Project',
    'Review',
    'Quiz',
    'Speech',
    'Study'
] as const;

export const ASSIGNMENT_PROGRESS = [
    'Not started',
    'In progress',
    'Will do later',
    'Finished (not submitted)',
    'Done'
] as const;

export const PROGRESS_COLORS: Record<string, string> = {
    'Not started': '#fff',
    'In progress': '#ffa5c8',
    'Will do later': '#fcbd6a',
    'Finished (not submitted)': '#99ccf6',
    'Done': '#ccd5ae'
};

export const ASSIGNMENT_TYPE_COLORS: Record<string, string> = {
    'Assignment': '#efe9ae',
    'Discussion Post': '#fec3a6',
    'Essay': '#ffac81',
    'Exam': '#ffe692',
    'Excel': '#99c1de',
    'Homework': '#ff928b',
    'Lecture': '#d2b7e5',
    'Notes': '#efaedf',
    'Program': '#AEBEFF',
    'Project': '#9DB0A3',
    'Quiz': '#db9191',
    'Review': '#cdeac0',
    'Speech': '#f0efeb',
    'Study': '#BFE4D2'
}