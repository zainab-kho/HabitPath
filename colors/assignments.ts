// @/colors/assignments.ts
// colors for the assignment type and progress labels. the keys have to match
// ASSIGNMENT_TYPES and ASSIGNMENT_PROGRESS in constants/assignments.ts
import { PRESET_COLORS } from './presets';

// the color of each progress label, so you can tell at a glance what's left to do
export const PROGRESS_COLORS: Record<string, string> = {
    'Not started': '#fff',
    'In progress': '#ffa5c8',
    'Will do later': '#fcbd6a',
    'Finished (not submitted)': '#99ccf6',
    'Done': '#ccd5ae',
};

// the color of each assignment type label, taken from the shared preset colors
// so assignments use the same palette as rewards, courses and countdowns
export const ASSIGNMENT_TYPE_COLORS: Record<string, string> = {
    'Assignment': PRESET_COLORS[0],       // golden butter
    'Discussion Post': PRESET_COLORS[1],  // coral peach
    'Essay': PRESET_COLORS[2],            // blush pink
    'Exam': PRESET_COLORS[3],             // sky blue
    'Homework': PRESET_COLORS[4],         // lavender
    'Lecture': PRESET_COLORS[5],          // mint
    'Notes': PRESET_COLORS[6],            // rewards accent green
    'Program': PRESET_COLORS[7],          // bright yellow
    'Project': PRESET_COLORS[8],          // rich pink
    'Quiz': PRESET_COLORS[9],             // periwinkle
    'Review': PRESET_COLORS[10],          // aqua
    'Study': PRESET_COLORS[11],           // pastel magenta
};
