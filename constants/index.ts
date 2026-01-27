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
    'Program',
    'Project',
    'Review',
    'Quiz',
    'Speech',
    'Study'
] as const;

export const ASSIGNMENT_PROGRESS = [
    'Not started',
    'Will do later',
    'In progress',
    'Finished (not submitted)',
    'Done'
] as const;

export const PROGRESS_COLORS: Record<string, string> = {
    'Not started': '#82a2f9',
    'Will do later': '#f98282',
    'In progress': '#F9E282',
    'Finished (not submitted)': '#f9bb82',
    'Done': '#54BF82'
};

export const ASSIGNMENT_TYPE_COLORS: Record<string, string> = {
    'Assignment': '#6ab489',
    'Discussion Post': '#40BAFF',
    'Essay': '#FF8B77',
    'Exam': '#F9E282',
    'Excel': '#FFB456',
    'Homework': '#FF90AB',
    'Lecture': '#db66ff',
    'Program': '#AEBEFF',
    'Project': '#9DB0A3',
    'Quiz': '#c86a6a',
    'Review': '#4aca75',
    'Speech': '#adc86a',
    'Study': '#febd7d'
}