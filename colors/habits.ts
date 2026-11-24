// @/colors/habits.ts
// colors that only show up on the habit pages
import { COLORS } from './core';

export const HABIT_COLORS = {
  // a habit's progress fill when it has no path color. same as the app's main green
  Progress: COLORS.Primary,
  // the shadow on the streak badge next to the progress bar
  Streak: '#F55858',
  // the frequency buttons (daily, weekly...) on the new habit page and in goals
  Frequency: '#92C5FF',
  // the time-of-day buttons (morning, evening...) on the new habit page, inbox and goals
  TimeOfDay: '#AB98F8',
} as const;
